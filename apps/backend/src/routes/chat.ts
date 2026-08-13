import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AgentOrchestrator } from "@jarvis/agent";
import type { ClientEvent, ServerEvent } from "@jarvis/shared";

const ChatRequestSchema = z.object({
  sessionId: z.string().optional(),
  text: z.string().min(1, "A mensagem não pode ser vazia."),
});

export function registerChatRoutes(app: FastifyInstance, orchestrator: AgentOrchestrator): void {
  // Endpoint REST simples (sem streaming) — útil para testes automatizados,
  // integrações via curl/HTTP e como fallback quando WebSocket não está
  // disponível. A experiência completa (streaming, confirmações) é via /ws.
  app.post("/api/chat", async (request, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Corpo da requisição inválido.",
        details: parsed.error.issues,
      });
    }

    const sessionId = parsed.data.sessionId ?? randomUUID();
    const events: ServerEvent[] = [];
    await orchestrator.handleUserMessage(sessionId, parsed.data.text, (event) => {
      events.push(event);
    });

    const lastAssistantEvent = [...events].reverse().find((e) => e.type === "assistant_message_end");
    const reply_ =
      lastAssistantEvent && lastAssistantEvent.type === "assistant_message_end"
        ? lastAssistantEvent.message.text
        : "";

    return { sessionId, reply: reply_, events };
  });

  app.get("/ws", { websocket: true }, (socket, request) => {
    const url = new URL(request.url, "http://localhost");
    const sessionId = url.searchParams.get("sessionId") ?? randomUUID();

    const emit = (event: ServerEvent) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    };

    emit({ type: "session_ready", sessionId });

    socket.on("message", (raw: Buffer) => {
      void (async () => {
        let clientEvent: ClientEvent;
        try {
          clientEvent = JSON.parse(raw.toString());
        } catch {
          emit({ type: "error", message: "JSON inválido recebido pelo servidor.", code: "BAD_JSON" });
          return;
        }

        switch (clientEvent.type) {
          case "user_message": {
            if (!clientEvent.text?.trim()) {
              emit({ type: "error", message: "Mensagem vazia.", code: "EMPTY_MESSAGE" });
              return;
            }
            await orchestrator.handleUserMessage(sessionId, clientEvent.text, emit);
            break;
          }
          case "confirm_tool": {
            const resolved = orchestrator.resolveConfirmation(clientEvent.requestId, clientEvent.approved);
            if (!resolved) {
              emit({
                type: "error",
                message: `Nenhuma confirmação pendente com requestId "${clientEvent.requestId}".`,
                code: "NO_PENDING_CONFIRMATION",
              });
            }
            break;
          }
          case "stop_generation": {
            // Interrupção de streaming em andamento é escopo da Fase 3 (voz +
            // interrupção, seção 7 do briefing), quando o AnthropicProvider
            // passa a expor cancelamento via AbortController. Documentado
            // como limitação conhecida em vez de fingir suportar.
            emit({
              type: "error",
              message: "Interrupção de geração em andamento ainda não é suportada nesta fase.",
              code: "NOT_IMPLEMENTED",
            });
            break;
          }
          default: {
            emit({ type: "error", message: "Tipo de evento desconhecido.", code: "UNKNOWN_EVENT" });
          }
        }
      })();
    });
  });
}
