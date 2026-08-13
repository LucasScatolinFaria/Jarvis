import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, connectCollecting, FakeLLMProvider } from "./helpers.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/**
 * Usa `injectWS` do @fastify/websocket em vez de abrir uma porta TCP real —
 * é a forma suportada pelo próprio plugin para testar rotas de WebSocket
 * sem depender de rede (ver README do @fastify/websocket, seção "Testing").
 */
describe("WS /ws", () => {
  it("envia session_ready assim que o cliente conecta", async () => {
    const built = await buildTestApp();
    app = built.app;
    await app.ready();

    const { socket, waitFor } = await connectCollecting(app);
    const first = await waitFor((event) => event.type === "session_ready");

    expect(first.type).toBe("session_ready");
    socket.terminate();
  });

  it("processa user_message e transmite os eventos até assistant_message_end / IDLE", async () => {
    const built = await buildTestApp({ llm: new FakeLLMProvider("Resposta via WebSocket.") });
    app = built.app;
    await app.ready();

    const { socket, events, waitFor } = await connectCollecting(app);
    await waitFor((event) => event.type === "session_ready");

    socket.send(JSON.stringify({ type: "user_message", text: "Olá, JARVIS" }));
    await waitFor((event) => event.type === "assistant_message_end");
    await waitFor((event) => event.type === "agent_state" && event.state === "IDLE");
    socket.terminate();

    expect(events.some((e) => e.type === "user_message")).toBe(true);
    expect(
      events.some((e) => e.type === "assistant_message_end" && e.message.text.includes("Resposta via WebSocket")),
    ).toBe(true);
  });

  it("responde com erro estruturado para JSON inválido", async () => {
    const built = await buildTestApp();
    app = built.app;
    await app.ready();

    const { socket, waitFor } = await connectCollecting(app);
    await waitFor((event) => event.type === "session_ready");

    socket.send("isso não é JSON");
    const event = await waitFor((event_) => event_.type === "error");

    expect(event.type).toBe("error");
    socket.terminate();
  });
});
