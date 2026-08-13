import { randomUUID } from "node:crypto";
import {
  AgentState,
  PermissionLevel,
  type ChatMessage,
  type LLMContentBlock,
  type LLMToolResultBlock,
  type ServerEvent,
} from "@jarvis/shared";
import { buildSystemPrompt, type LLMProvider, type ModelRouter } from "@jarvis/ai";
import type { AuditSink } from "@jarvis/security";
import { PermissionEngine } from "@jarvis/security";
import type { SessionMemory } from "@jarvis/memory";
import type { ToolRegistry } from "@jarvis/tools";
import type { Logger } from "@jarvis/observability";

export type EmitFn = (event: ServerEvent) => void;

export interface AgentOrchestratorConfig {
  agentName: string;
  userName: string;
  language?: string;
  /** Protege contra loops de ferramentas infinitos (seção 41 do briefing). */
  maxToolIterations: number;
  /** Timeout de toda a requisição, incluindo espera por confirmação. */
  requestTimeoutMs: number;
  /** Quanto tempo o agente aguarda o usuário confirmar uma ação de risco. */
  toolConfirmationTimeoutMs: number;
}

interface PendingConfirmation {
  resolve: (approved: boolean) => void;
}

/**
 * Núcleo do agente (docs/ARCHITECTURE.md seção E.2 — "Fluxo de uma
 * mensagem").
 *
 * Implementa o ciclo objetivo → planejamento (implícito, feito pelo LLM) →
 * execução de ferramentas → verificação → resultado, com permissões e
 * auditoria em cada chamada de ferramenta. Este é o único ponto do sistema
 * que conhece TODOS os outros pacotes de domínio — por design: é aqui, e só
 * aqui, que eles se encontram.
 */
export class AgentOrchestrator {
  private readonly pendingConfirmations = new Map<string, PendingConfirmation>();
  private readonly permissionEngine: PermissionEngine;

  constructor(
    private readonly llm: LLMProvider,
    private readonly modelRouter: ModelRouter,
    private readonly toolRegistry: ToolRegistry,
    maxPermissionLevel: PermissionLevel,
    private readonly auditLogger: AuditSink,
    private readonly sessionMemory: SessionMemory,
    private readonly config: AgentOrchestratorConfig,
    private readonly logger?: Logger,
  ) {
    this.permissionEngine = new PermissionEngine(maxPermissionLevel);
  }

  /** Resolve uma confirmação pendente de ferramenta (chamado a partir do WS). */
  resolveConfirmation(requestId: string, approved: boolean): boolean {
    const pending = this.pendingConfirmations.get(requestId);
    if (!pending) return false;
    pending.resolve(approved);
    this.pendingConfirmations.delete(requestId);
    return true;
  }

  async handleUserMessage(sessionId: string, text: string, emit: EmitFn): Promise<void> {
    const userMessage: ChatMessage = {
      id: randomUUID(),
      sessionId,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    emit({ type: "user_message", message: userMessage });
    this.sessionMemory.append(sessionId, { role: "user", content: text });
    emit({ type: "agent_state", state: AgentState.THINKING });

    const model = this.modelRouter.select({ text });

    try {
      await this.withTimeout(
        this.runAgentLoop(sessionId, model, emit),
        this.config.requestTimeoutMs,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido no agente.";
      this.logger?.error({ err: error, sessionId }, "Falha no loop do agente");
      emit({ type: "error", message });
      emit({ type: "agent_state", state: AgentState.ERROR });
      return;
    }

    emit({ type: "agent_state", state: AgentState.IDLE });
  }

  private async runAgentLoop(sessionId: string, model: string, emit: EmitFn): Promise<void> {
    const system = buildSystemPrompt({
      agentName: this.config.agentName,
      userName: this.config.userName,
      language: this.config.language,
    });

    for (let iteration = 1; iteration <= this.config.maxToolIterations; iteration++) {
      const turnId = randomUUID();
      emit({ type: "assistant_message_start", id: turnId, sessionId });

      const result = await this.llm.chat(
        {
          model,
          system,
          messages: this.sessionMemory.getHistory(sessionId),
          tools: this.toolRegistry.toLLMDefinitions(),
        },
        {
          onTextDelta: (delta) => emit({ type: "assistant_message_delta", id: turnId, delta }),
        },
      );

      emit({
        type: "assistant_message_end",
        message: {
          id: turnId,
          sessionId,
          role: "assistant",
          text: result.text,
          createdAt: new Date().toISOString(),
        },
      });

      const isToolTurn = result.stopReason === "tool_use" && result.toolCalls.length > 0;

      if (!isToolTurn) {
        if (result.text) {
          this.sessionMemory.append(sessionId, { role: "assistant", content: result.text });
        }
        return;
      }

      const assistantBlocks: LLMContentBlock[] = [];
      if (result.text) assistantBlocks.push({ type: "text", text: result.text });
      for (const call of result.toolCalls) {
        assistantBlocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.input });
      }
      this.sessionMemory.append(sessionId, { role: "assistant", content: assistantBlocks });

      emit({ type: "agent_state", state: AgentState.EXECUTING });
      const toolResultBlocks: LLMToolResultBlock[] = [];
      for (const call of result.toolCalls) {
        toolResultBlocks.push(await this.executeToolCall(sessionId, call, emit));
      }
      this.sessionMemory.append(sessionId, { role: "user", content: toolResultBlocks });
      emit({ type: "agent_state", state: AgentState.THINKING });
    }

    emit({
      type: "error",
      message:
        `Limite de ${this.config.maxToolIterations} iterações de ferramentas atingido antes ` +
        "de concluir a tarefa. Tente dividir o pedido em partes menores.",
    });
  }

  private async executeToolCall(
    sessionId: string,
    call: { id: string; name: string; input: unknown },
    emit: EmitFn,
  ): Promise<LLMToolResultBlock> {
    const requestId = randomUUID();
    const tool = this.toolRegistry.get(call.name);
    // Ferramenta que o modelo tentou chamar mas não existe no registro é
    // tratada como nível crítico por padrão — nunca confiamos "por omissão".
    const permissionLevel = tool?.permissionLevel ?? PermissionLevel.L5_CRITICAL_ACTION;
    const startedAt = Date.now();

    emit({ type: "tool_started", requestId, tool: call.name, input: call.input, permissionLevel });

    if (!tool) {
      const error = `Ferramenta desconhecida: "${call.name}".`;
      await this.auditLogger.log({
        sessionId,
        requestId,
        actor: "agent",
        tool: call.name,
        permissionLevel,
        decision: "deny",
        input: call.input,
        result: "denied",
        error,
      });
      emit({ type: "tool_finished", requestId, tool: call.name, success: false, error, durationMs: Date.now() - startedAt });
      return { type: "tool_result", toolUseId: call.id, content: error, isError: true };
    }

    const evaluation = this.permissionEngine.evaluate(permissionLevel);

    if (evaluation.decision === "deny") {
      await this.auditLogger.log({
        sessionId,
        requestId,
        actor: "agent",
        tool: call.name,
        permissionLevel,
        decision: "deny",
        input: call.input,
        result: "denied",
        error: evaluation.reason,
      });
      emit({
        type: "tool_finished",
        requestId,
        tool: call.name,
        success: false,
        error: evaluation.reason,
        durationMs: Date.now() - startedAt,
      });
      return {
        type: "tool_result",
        toolUseId: call.id,
        content: `Permissão negada: ${evaluation.reason}`,
        isError: true,
      };
    }

    if (evaluation.decision === "confirm") {
      const approved = await this.requestConfirmation(sessionId, requestId, call, permissionLevel, emit);
      if (!approved) {
        const error = "Ação cancelada: o usuário não confirmou a execução a tempo ou recusou.";
        emit({
          type: "tool_finished",
          requestId,
          tool: call.name,
          success: false,
          error,
          durationMs: Date.now() - startedAt,
        });
        return { type: "tool_result", toolUseId: call.id, content: error, isError: true };
      }
    }

    const toolResult = await this.toolRegistry.run(call.name, call.input, { sessionId, requestId });
    const durationMs = Date.now() - startedAt;

    await this.auditLogger.log({
      sessionId,
      requestId,
      actor: "agent",
      tool: call.name,
      permissionLevel,
      decision: evaluation.decision,
      input: call.input,
      result: toolResult.success ? "success" : "error",
      error: toolResult.error,
      durationMs,
    });

    emit({
      type: "tool_finished",
      requestId,
      tool: call.name,
      success: toolResult.success,
      result: toolResult.data,
      error: toolResult.error,
      durationMs,
    });

    return {
      type: "tool_result",
      toolUseId: call.id,
      content: toolResult.success
        ? JSON.stringify(toolResult.data ?? {})
        : (toolResult.error ?? "Erro desconhecido ao executar a ferramenta."),
      isError: !toolResult.success,
    };
  }

  private async requestConfirmation(
    sessionId: string,
    requestId: string,
    call: { name: string; input: unknown },
    permissionLevel: PermissionLevel,
    emit: EmitFn,
  ): Promise<boolean> {
    emit({ type: "agent_state", state: AgentState.WAITING_CONFIRMATION });
    const expiresAt = new Date(Date.now() + this.config.toolConfirmationTimeoutMs).toISOString();
    emit({
      type: "tool_confirmation_required",
      requestId,
      tool: call.name,
      input: call.input,
      permissionLevel,
      expiresAt,
    });
    await this.auditLogger.log({
      sessionId,
      requestId,
      actor: "agent",
      tool: call.name,
      permissionLevel,
      decision: "confirm",
      input: call.input,
      result: "pending_confirmation",
    });

    const approved = await this.awaitConfirmation(requestId, this.config.toolConfirmationTimeoutMs);

    emit({ type: "tool_confirmation_resolved", requestId, approved });
    emit({ type: "agent_state", state: AgentState.EXECUTING });
    await this.auditLogger.log({
      sessionId,
      requestId,
      actor: "user",
      tool: call.name,
      permissionLevel,
      decision: "confirm",
      input: call.input,
      result: approved ? "confirmed" : "rejected",
    });

    return approved;
  }

  private awaitConfirmation(requestId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingConfirmations.delete(requestId);
        resolve(false);
      }, timeoutMs);

      this.pendingConfirmations.set(requestId, {
        resolve: (approved: boolean) => {
          clearTimeout(timer);
          resolve(approved);
        },
      });
    });
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Tempo limite de ${ms}ms excedido pelo agente.`)),
        ms,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
