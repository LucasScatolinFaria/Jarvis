import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AgentState, PermissionLevel, type LLMChatRequest, type LLMChatResult, type LLMStreamEvents, type ServerEvent } from "@jarvis/shared";
import { ModelRouter, type LLMProvider } from "@jarvis/ai";
import { SessionMemory } from "@jarvis/memory";
import { ToolRegistry, type Tool } from "@jarvis/tools";
import type { AuditEntry, AuditSink } from "@jarvis/security";
import { AgentOrchestrator } from "./agent-orchestrator.js";

class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  calls = 0;

  constructor(private readonly script: (call: number, request: LLMChatRequest) => LLMChatResult) {}

  async chat(request: LLMChatRequest, events?: LLMStreamEvents): Promise<LLMChatResult> {
    this.calls += 1;
    const result = this.script(this.calls, request);
    if (result.text) events?.onTextDelta?.(result.text);
    return result;
  }
}

const echoTool: Tool<{ value: string }, { echoed: string }> = {
  name: "echo",
  description: "Ecoa a entrada recebida.",
  permissionLevel: PermissionLevel.L0_READ_ONLY,
  inputSchema: z.object({ value: z.string() }),
  async execute(input) {
    return { success: true, data: { echoed: input.value } };
  },
};

const adminTool: Tool<Record<string, never>, Record<string, never>> = {
  name: "admin_tool",
  description: "Ferramenta administrativa fictícia (L3) para testar negação.",
  permissionLevel: PermissionLevel.L3_COMMAND_EXECUTION,
  inputSchema: z.object({}),
  async execute() {
    return { success: true, data: {} };
  },
};

const criticalTool: Tool<Record<string, never>, { done: true }> = {
  name: "critical_tool",
  description: "Ferramenta crítica fictícia (L4) para testar confirmação.",
  permissionLevel: PermissionLevel.L4_ADMIN_ACTION,
  inputSchema: z.object({}),
  async execute() {
    return { success: true, data: { done: true } };
  },
};

function makeOrchestrator(opts: {
  llm: LLMProvider;
  tools: Tool<unknown, unknown>[];
  maxPermissionLevel: PermissionLevel;
  maxToolIterations?: number;
}) {
  const registry = new ToolRegistry();
  for (const tool of opts.tools) registry.register(tool);

  const auditEntries: AuditEntry[] = [];
  const auditLogger: AuditSink = {
    async log(entry) {
      auditEntries.push({ timestamp: new Date().toISOString(), ...entry });
    },
  };

  const sessionMemory = new SessionMemory();
  const modelRouter = new ModelRouter({ fast: "fast", default: "default", advanced: "advanced" });

  const orchestrator = new AgentOrchestrator(
    opts.llm,
    modelRouter,
    registry,
    opts.maxPermissionLevel,
    auditLogger,
    sessionMemory,
    {
      agentName: "JARVIS",
      userName: "Usuário de Teste",
      maxToolIterations: opts.maxToolIterations ?? 5,
      requestTimeoutMs: 5000,
      toolConfirmationTimeoutMs: 500,
    },
  );

  return { orchestrator, auditEntries, sessionMemory };
}

describe("AgentOrchestrator", () => {
  it("responde diretamente quando o modelo não precisa de ferramentas", async () => {
    const llm = new FakeLLMProvider(() => ({
      text: "Olá! Como posso ajudar?",
      toolCalls: [],
      stopReason: "end_turn",
      model: "fake-model",
    }));
    const { orchestrator, sessionMemory } = makeOrchestrator({
      llm,
      tools: [],
      maxPermissionLevel: PermissionLevel.L3_COMMAND_EXECUTION,
    });

    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage("s1", "Olá", (e) => events.push(e));

    expect(events.some((e) => e.type === "assistant_message_end" && e.message.text.includes("Olá"))).toBe(true);
    expect(events.at(-1)).toEqual({ type: "agent_state", state: AgentState.IDLE });
    expect(sessionMemory.getHistory("s1")).toHaveLength(2);
  });

  it("executa uma ferramenta permitida e usa o resultado para responder", async () => {
    const llm = new FakeLLMProvider((call) =>
      call === 1
        ? {
            text: "Vou verificar.",
            toolCalls: [{ type: "tool_use", id: "call-1", name: "echo", input: { value: "oi" } }],
            stopReason: "tool_use",
            model: "fake-model",
          }
        : { text: 'Pronto! Ecoei "oi".', toolCalls: [], stopReason: "end_turn", model: "fake-model" },
    );
    const { orchestrator } = makeOrchestrator({
      llm,
      tools: [echoTool],
      maxPermissionLevel: PermissionLevel.L3_COMMAND_EXECUTION,
    });

    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage("s1", "Ecoe 'oi'", (e) => events.push(e));

    const started = events.find((e) => e.type === "tool_started");
    const finished = events.find((e) => e.type === "tool_finished");
    expect(started).toMatchObject({ tool: "echo" });
    expect(finished).toMatchObject({ tool: "echo", success: true });
    expect(events.some((e) => e.type === "assistant_message_end" && e.message.text.includes("Pronto"))).toBe(true);
  });

  it("nega ferramentas acima do nível máximo de permissão e devolve o motivo ao modelo", async () => {
    const llm = new FakeLLMProvider((call) =>
      call === 1
        ? {
            text: "",
            toolCalls: [{ type: "tool_use", id: "call-1", name: "admin_tool", input: {} }],
            stopReason: "tool_use",
            model: "fake-model",
          }
        : { text: "Entendido, não vou fazer isso.", toolCalls: [], stopReason: "end_turn", model: "fake-model" },
    );
    const { orchestrator, auditEntries } = makeOrchestrator({
      llm,
      tools: [adminTool],
      maxPermissionLevel: PermissionLevel.L0_READ_ONLY,
    });

    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage("s1", "Faça algo administrativo", (e) => events.push(e));

    const finished = events.find((e) => e.type === "tool_finished");
    expect(finished).toMatchObject({ tool: "admin_tool", success: false });
    expect(auditEntries.some((e) => e.decision === "deny" && e.result === "denied")).toBe(true);
  });

  it("aguarda confirmação do usuário para ferramentas críticas e executa após aprovação", async () => {
    const llm = new FakeLLMProvider((call) =>
      call === 1
        ? {
            text: "",
            toolCalls: [{ type: "tool_use", id: "call-1", name: "critical_tool", input: {} }],
            stopReason: "tool_use",
            model: "fake-model",
          }
        : { text: "Feito.", toolCalls: [], stopReason: "end_turn", model: "fake-model" },
    );
    const { orchestrator } = makeOrchestrator({
      llm,
      tools: [criticalTool],
      maxPermissionLevel: PermissionLevel.L5_CRITICAL_ACTION,
    });

    const events: ServerEvent[] = [];
    const emit = (e: ServerEvent) => {
      events.push(e);
      if (e.type === "tool_confirmation_required") {
        setTimeout(() => orchestrator.resolveConfirmation(e.requestId, true), 0);
      }
    };

    await orchestrator.handleUserMessage("s1", "Faça a ação crítica", emit);

    expect(events.some((e) => e.type === "tool_confirmation_required")).toBe(true);
    expect(events.some((e) => e.type === "tool_confirmation_resolved" && e.approved)).toBe(true);
    const finished = events.find((e) => e.type === "tool_finished");
    expect(finished).toMatchObject({ tool: "critical_tool", success: true });
  });

  it("nega a execução quando o usuário não confirma dentro do prazo", async () => {
    const llm = new FakeLLMProvider((call) =>
      call === 1
        ? {
            text: "",
            toolCalls: [{ type: "tool_use", id: "call-1", name: "critical_tool", input: {} }],
            stopReason: "tool_use",
            model: "fake-model",
          }
        : { text: "Ok, não farei.", toolCalls: [], stopReason: "end_turn", model: "fake-model" },
    );
    const { orchestrator } = makeOrchestrator({
      llm,
      tools: [criticalTool],
      maxPermissionLevel: PermissionLevel.L5_CRITICAL_ACTION,
    });

    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage("s1", "Faça a ação crítica", (e) => events.push(e));

    expect(events.some((e) => e.type === "tool_confirmation_resolved" && e.approved === false)).toBe(true);
    const finished = events.find((e) => e.type === "tool_finished");
    expect(finished).toMatchObject({ tool: "critical_tool", success: false });
  }, 2000);

  it("interrompe o loop com uma mensagem de erro ao atingir o limite de iterações", async () => {
    const llm = new FakeLLMProvider(() => ({
      text: "",
      toolCalls: [{ type: "tool_use", id: "call-x", name: "echo", input: { value: "loop" } }],
      stopReason: "tool_use",
      model: "fake-model",
    }));
    const { orchestrator } = makeOrchestrator({
      llm,
      tools: [echoTool],
      maxPermissionLevel: PermissionLevel.L3_COMMAND_EXECUTION,
      maxToolIterations: 2,
    });

    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage("s1", "Fique chamando a ferramenta para sempre", (e) =>
      events.push(e),
    );

    expect(events.some((e) => e.type === "error" && e.message.includes("Limite de"))).toBe(true);
    expect(events.at(-1)).toEqual({ type: "agent_state", state: AgentState.IDLE });
  });
});
