import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("GET /api/health", () => {
  it("retorna status online e o número de ferramentas registradas", async () => {
    const built = await buildTestApp();
    app = built.app;

    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe("online");
    expect(body.toolsAvailable).toBe(built.toolCount);
    expect(typeof body.uptimeSeconds).toBe("number");
  });
});
