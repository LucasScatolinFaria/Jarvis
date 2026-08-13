import type { FastifyInstance } from "fastify";

export interface HealthRouteOptions {
  toolCount: number;
}

export function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions): void {
  app.get("/api/health", async () => ({
    status: "online",
    agent: "JARVIS",
    phase: "Fase 1 — Core + Chat",
    uptimeSeconds: Math.round(process.uptime()),
    toolsAvailable: options.toolCount,
    timestamp: new Date().toISOString(),
  }));
}
