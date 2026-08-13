import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import type { AgentOrchestrator } from "@jarvis/agent";
import type { Logger } from "@jarvis/observability";
import { registerHealthRoutes } from "./routes/health.js";
import { registerChatRoutes } from "./routes/chat.js";

export interface AppDependencies {
  orchestrator: AgentOrchestrator;
  corsOrigin: string;
  logger?: Logger;
  toolCount: number;
}

/**
 * Monta a aplicação Fastify a partir de dependências já construídas
 * (injeção de dependência simples). Isso permite testar rotas com um
 * `AgentOrchestrator` falso, sem chave de API real nem chamadas de rede —
 * ver apps/backend/test/health.test.ts.
 */
export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  // Usamos o logger estruturado de @jarvis/observability diretamente (via
  // deps.logger) nos pontos que importam — não plugamos no logger interno
  // do Fastify para evitar conflitos de tipos entre a instância do pino
  // criada por @jarvis/observability e o `FastifyBaseLogger` esperado aqui.
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: deps.corsOrigin });
  await app.register(websocket);

  registerHealthRoutes(app, { toolCount: deps.toolCount });
  registerChatRoutes(app, deps.orchestrator);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    deps.logger?.error({ err: error }, "Erro não tratado na API");
    reply.status(error.statusCode ?? 500).send({
      error: error.message || "Erro interno do servidor.",
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: `Rota não encontrada: ${request.method} ${request.url}` });
  });

  return app;
}
