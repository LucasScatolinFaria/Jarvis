import type { AgentState } from "./agent-state.js";
import type { PermissionLevel } from "./permission.js";

/**
 * Contrato de eventos do WebSocket (docs/ARCHITECTURE.md seção E.1).
 *
 * `ServerEvent` é tudo que o backend pode emitir para a UI.
 * `ClientEvent` é tudo que a UI pode enviar para o backend.
 *
 * Os tipos marcados "reservado" ainda não são emitidos pelo código da Fase 1
 * — existem aqui para que o contrato não precise de uma mudança que quebra
 * compatibilidade quando Voz (Fase 3) e Memória de longo prazo (Fase 2)
 * forem implementadas.
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  text: string;
  createdAt: string;
}

export type ServerEvent =
  | { type: "session_ready"; sessionId: string }
  | { type: "user_message"; message: ChatMessage }
  | { type: "assistant_message_start"; id: string; sessionId: string }
  | { type: "assistant_message_delta"; id: string; delta: string }
  | { type: "assistant_message_end"; message: ChatMessage }
  | { type: "agent_state"; state: AgentState }
  | {
      type: "tool_started";
      requestId: string;
      tool: string;
      input: unknown;
      permissionLevel: PermissionLevel;
    }
  | {
      type: "tool_finished";
      requestId: string;
      tool: string;
      success: boolean;
      result?: unknown;
      error?: string;
      durationMs: number;
    }
  | {
      type: "tool_confirmation_required";
      requestId: string;
      tool: string;
      input: unknown;
      permissionLevel: PermissionLevel;
      expiresAt: string;
    }
  | { type: "tool_confirmation_resolved"; requestId: string; approved: boolean }
  | { type: "error"; message: string; code?: string }
  // --- reservado para a Fase 2 (memória de longo prazo) ---
  | { type: "memory_retrieved"; count: number; summary: string }
  // --- reservado para a Fase 3 (voz) ---
  | { type: "transcription"; text: string; final: boolean }
  | { type: "voice_started" }
  | { type: "voice_finished" };

export type ClientEvent =
  | { type: "user_message"; text: string }
  | { type: "confirm_tool"; requestId: string; approved: boolean }
  | { type: "stop_generation" };
