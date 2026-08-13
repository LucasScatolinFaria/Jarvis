import { create } from "zustand";
import { AgentState, type ServerEvent } from "@jarvis/shared";
import type { ConnectionStatus, PendingConfirmation, TimelineEntry } from "./types.js";

interface JarvisStoreState {
  connectionStatus: ConnectionStatus;
  agentState: AgentState;
  sessionId: string | null;
  timeline: TimelineEntry[];
  pendingConfirmation: PendingConfirmation | null;

  setConnectionStatus: (status: ConnectionStatus) => void;
  handleServerEvent: (event: ServerEvent) => void;
  reset: () => void;
}

function uid(): string {
  return crypto.randomUUID();
}

export const useJarvisStore = create<JarvisStoreState>((set) => ({
  connectionStatus: "connecting",
  agentState: AgentState.OFFLINE,
  sessionId: null,
  timeline: [],
  pendingConfirmation: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  reset: () =>
    set({
      connectionStatus: "connecting",
      agentState: AgentState.OFFLINE,
      sessionId: null,
      timeline: [],
      pendingConfirmation: null,
    }),

  handleServerEvent: (event) => {
    switch (event.type) {
      case "session_ready": {
        set({ sessionId: event.sessionId, connectionStatus: "online", agentState: AgentState.IDLE });
        return;
      }

      case "user_message": {
        set((state) => ({
          timeline: [
            ...state.timeline,
            {
              kind: "message",
              id: event.message.id,
              role: "user",
              text: event.message.text,
              createdAt: event.message.createdAt,
            },
          ],
        }));
        return;
      }

      case "assistant_message_start": {
        set((state) => ({
          timeline: [
            ...state.timeline,
            {
              kind: "message",
              id: event.id,
              role: "assistant",
              text: "",
              createdAt: new Date().toISOString(),
              streaming: true,
            },
          ],
        }));
        return;
      }

      case "assistant_message_delta": {
        set((state) => ({
          timeline: state.timeline.map((entry) =>
            entry.kind === "message" && entry.id === event.id
              ? { ...entry, text: entry.text + event.delta }
              : entry,
          ),
        }));
        return;
      }

      case "assistant_message_end": {
        set((state) => ({
          timeline: state.timeline
            .map((entry) =>
              entry.kind === "message" && entry.id === event.message.id
                ? { ...entry, text: event.message.text, streaming: false, createdAt: event.message.createdAt }
                : entry,
            )
            // Turnos em que o modelo só chamou uma ferramenta (sem comentário)
            // não deixam uma bolha de chat vazia na tela.
            .filter((entry) => !(entry.kind === "message" && entry.id === event.message.id && entry.text === "")),
        }));
        return;
      }

      case "agent_state": {
        set({ agentState: event.state });
        return;
      }

      case "tool_started": {
        set((state) => ({
          timeline: [
            ...state.timeline,
            {
              kind: "tool",
              id: event.requestId,
              name: event.tool,
              input: event.input,
              permissionLevel: event.permissionLevel,
              status: "running",
            },
          ],
        }));
        return;
      }

      case "tool_finished": {
        set((state) => ({
          timeline: state.timeline.map((entry) =>
            entry.kind === "tool" && entry.id === event.requestId
              ? {
                  ...entry,
                  status: event.success ? "success" : entry.status === "denied" ? "denied" : "error",
                  result: event.result,
                  error: event.error,
                  durationMs: event.durationMs,
                }
              : entry,
          ),
        }));
        return;
      }

      case "tool_confirmation_required": {
        set((state) => ({
          pendingConfirmation: {
            requestId: event.requestId,
            tool: event.tool,
            input: event.input,
            permissionLevel: event.permissionLevel,
            expiresAt: event.expiresAt,
          },
          timeline: state.timeline.map((entry) =>
            entry.kind === "tool" && entry.id === event.requestId
              ? { ...entry, status: "awaiting_confirmation", expiresAt: event.expiresAt }
              : entry,
          ),
        }));
        return;
      }

      case "tool_confirmation_resolved": {
        set((state) => ({
          pendingConfirmation:
            state.pendingConfirmation?.requestId === event.requestId ? null : state.pendingConfirmation,
          timeline: state.timeline.map((entry) =>
            entry.kind === "tool" && entry.id === event.requestId && entry.status === "awaiting_confirmation"
              ? { ...entry, status: event.approved ? "running" : "denied" }
              : entry,
          ),
        }));
        return;
      }

      case "error": {
        set((state) => ({
          timeline: [
            ...state.timeline,
            { kind: "system", id: uid(), level: "error", text: event.message, createdAt: new Date().toISOString() },
          ],
        }));
        return;
      }

      // Eventos de memória de longo prazo (Fase 2) e voz (Fase 3) ainda não
      // são emitidos pelo backend — nada a fazer aqui por enquanto.
      case "memory_retrieved":
      case "transcription":
      case "voice_started":
      case "voice_finished":
        return;

      default: {
        const _exhaustive: never = event;
        void _exhaustive;
      }
    }
  },
}));

// Reexportado para os componentes que só precisam do estado, sem disparar
// import direto de zustand em toda parte.
export const selectTimeline = (state: JarvisStoreState) => state.timeline;
