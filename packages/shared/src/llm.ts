/**
 * Representação de conversa agnóstica de provedor de IA.
 *
 * `packages/ai` converte esses tipos de/para o formato específico de cada
 * fornecedor (Anthropic, e futuramente outros). Nenhum outro pacote deve
 * depender de tipos de um SDK de LLM específico — apenas destes.
 */

export type LLMRole = "user" | "assistant";

export interface LLMTextBlock {
  type: "text";
  text: string;
}

export interface LLMToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface LLMToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type LLMContentBlock = LLMTextBlock | LLMToolUseBlock | LLMToolResultBlock;

export interface LLMMessage {
  role: LLMRole;
  content: string | LLMContentBlock[];
}

/** Descrição de uma ferramenta no formato que os LLMs de function-calling esperam. */
export interface LLMToolDefinition {
  name: string;
  description: string;
  /** JSON Schema do objeto de entrada. */
  inputSchema: Record<string, unknown>;
}

export interface LLMChatRequest {
  model: string;
  system?: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  maxTokens?: number;
  temperature?: number;
}

export type LLMStopReason =
  | "end_turn"
  | "tool_use"
  | "max_tokens"
  | "stop_sequence"
  | "error";

export interface LLMChatResult {
  text: string;
  toolCalls: LLMToolUseBlock[];
  stopReason: LLMStopReason;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMStreamEvents {
  onTextDelta?: (delta: string) => void;
}

/** Categorias de tarefa usadas pelo ModelRouter para escolher o modelo. */
export type ModelTaskHint = "fast" | "default" | "advanced" | "coding" | "vision";
