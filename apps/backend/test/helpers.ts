import type { FastifyInstance } from "fastify";
import { ModelRouter, type LLMProvider } from "@jarvis/ai";
import type { LLMChatRequest, LLMChatResult, LLMStreamEvents, ServerEvent } from "@jarvis/shared";
import { PermissionLevel } from "@jarvis/shared";
import { ToolRegistry, getCurrentDateTimeTool } from "@jarvis/tools";
import type { AuditEntry, AuditSink } from "@jarvis/security";
import { SessionMemory } from "@jarvis/memory";
import { AgentOrchestrator } from "@jarvis/agent";
import { buildApp } from "../src/app.js";

/** Provedor de LLM falso para testes — nunca chama a API real da Anthropic. */
export class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";

  constructor(private readonly reply: string = "Olá! Sou uma resposta de teste do JARVIS.") {}

  async chat(_request: LLMChatRequest, events?: LLMStreamEvents): Promise<LLMChatResult> {
    events?.onTextDelta?.(this.reply);
    return { text: this.reply, toolCalls: [], stopReason: "end_turn", model: "fake-model" };
  }
}

export async function buildTestApp(overrides: { llm?: LLMProvider } = {}) {
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(getCurrentDateTimeTool);

  const auditEntries: AuditEntry[] = [];
  const auditLogger: AuditSink = {
    async log(entry) {
      auditEntries.push({ timestamp: new Date().toISOString(), ...entry });
    },
  };

  const orchestrator = new AgentOrchestrator(
    overrides.llm ?? new FakeLLMProvider(),
    new ModelRouter({ fast: "fast", default: "default", advanced: "advanced" }),
    toolRegistry,
    PermissionLevel.L3_COMMAND_EXECUTION,
    auditLogger,
    new SessionMemory(),
    {
      agentName: "JARVIS",
      userName: "Usuário de Teste",
      maxToolIterations: 5,
      requestTimeoutMs: 5000,
      toolConfirmationTimeoutMs: 500,
    },
  );

  const app = await buildApp({
    orchestrator,
    corsOrigin: "http://localhost:5173",
    toolCount: toolRegistry.list().length,
  });

  return { app, auditEntries, toolCount: toolRegistry.list().length };
}

/**
 * Conecta em uma rota WebSocket via `injectWS` e coleta TODOS os eventos
 * recebidos desde a abertura da conexão (via `onInit`), evitando a corrida
 * entre o primeiro `send()` do servidor (disparado assim que a conexão
 * abre, ex.: `session_ready`) e o momento em que o teste anexaria um
 * listener `message` só depois de `await`ar a Promise de `injectWS`.
 */
export async function connectCollecting(app: FastifyInstance, path = "/ws") {
  const events: ServerEvent[] = [];
  const waiters: Array<{ predicate: (event: ServerEvent) => boolean; resolve: (event: ServerEvent) => void }> = [];

  const socket = await app.injectWS(path, undefined, {
    onInit: (ws) => {
      ws.on("message", (raw: Buffer) => {
        const event = JSON.parse(raw.toString()) as ServerEvent;
        events.push(event);
        for (let i = waiters.length - 1; i >= 0; i--) {
          const waiter = waiters[i];
          if (waiter && waiter.predicate(event)) {
            waiter.resolve(event);
            waiters.splice(i, 1);
          }
        }
      });
    },
  });

  function waitFor(predicate: (event: ServerEvent) => boolean, timeoutMs = 4000): Promise<ServerEvent> {
    const already = events.find(predicate);
    if (already) return Promise.resolve(already);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout aguardando evento via WebSocket")), timeoutMs);
      waiters.push({
        predicate,
        resolve: (event) => {
          clearTimeout(timer);
          resolve(event);
        },
      });
    });
  }

  return { socket, events, waitFor };
}
