import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, FakeLLMProvider } from "./helpers.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("POST /api/chat", () => {
  it("responde com o texto gerado pelo agente e cria uma sessão quando nenhuma é enviada", async () => {
    const built = await buildTestApp({ llm: new FakeLLMProvider("Olá! Como posso ajudar?") });
    app = built.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { text: "Olá" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reply).toContain("Olá! Como posso ajudar?");
    expect(typeof body.sessionId).toBe("string");
    expect(body.events.some((e: { type: string }) => e.type === "assistant_message_end")).toBe(true);
  });

  it("reutiliza o sessionId enviado pelo cliente", async () => {
    const built = await buildTestApp();
    app = built.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { sessionId: "sessao-fixa", text: "Olá de novo" },
    });

    expect(response.json().sessionId).toBe("sessao-fixa");
  });

  it("rejeita corpo sem o campo obrigatório 'text'", async () => {
    const built = await buildTestApp();
    app = built.app;

    const response = await app.inject({ method: "POST", url: "/api/chat", payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it("rejeita mensagens vazias", async () => {
    const built = await buildTestApp();
    app = built.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { text: "" },
    });
    expect(response.statusCode).toBe(400);
  });
});
