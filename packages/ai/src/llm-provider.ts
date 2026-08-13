import type { LLMChatRequest, LLMChatResult, LLMStreamEvents } from "@jarvis/shared";

/**
 * Contrato que qualquer fornecedor de LLM precisa implementar.
 *
 * O `AgentOrchestrator` (packages/agent) só conhece esta interface — trocar
 * de Anthropic para OpenAI, Google ou um modelo local é criar uma nova
 * classe que a implementa e registrá-la, sem tocar no núcleo do agente
 * (docs/ARCHITECTURE.md, seção B.6).
 */
export interface LLMProvider {
  readonly name: string;
  chat(request: LLMChatRequest, events?: LLMStreamEvents): Promise<LLMChatResult>;
}
