import { createLogger } from "@jarvis/observability";
import { AnthropicProvider, ModelRouter } from "@jarvis/ai";
import { ToolRegistry, getCurrentDateTimeTool } from "@jarvis/tools";
import { FileAuditLogger } from "@jarvis/security";
import { SessionMemory } from "@jarvis/memory";
import { AgentOrchestrator } from "@jarvis/agent";
import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ name: "jarvis-backend" });

  const llmProvider = new AnthropicProvider(config.anthropicApiKey);
  const modelRouter = new ModelRouter(config.models);

  const toolRegistry = new ToolRegistry(logger.child({ module: "tools" }));
  toolRegistry.register(getCurrentDateTimeTool);
  // Novas ferramentas (Fase 4+: arquivos, terminal, navegador, controle do
  // computador) se registram aqui, sem tocar em mais nenhum outro arquivo.

  const auditLogger = new FileAuditLogger(config.auditLogPath, logger.child({ module: "audit" }));
  const sessionMemory = new SessionMemory();

  const orchestrator = new AgentOrchestrator(
    llmProvider,
    modelRouter,
    toolRegistry,
    config.defaultPermissionLevel,
    auditLogger,
    sessionMemory,
    {
      agentName: config.agentName,
      userName: config.userName,
      maxToolIterations: config.agentMaxToolIterations,
      requestTimeoutMs: config.agentRequestTimeoutMs,
      toolConfirmationTimeoutMs: config.toolConfirmationTimeoutMs,
    },
    logger.child({ module: "agent" }),
  );

  const app = await buildApp({
    orchestrator,
    corsOrigin: config.corsOrigin,
    logger,
    toolCount: toolRegistry.list().length,
  });

  const address = await app.listen({ port: config.port, host: config.host });

  logger.info(`🤖 ${config.agentName} online em ${address}`);
  logger.info(
    `   Ferramentas registradas: ${toolRegistry.list().map((t) => t.name).join(", ") || "nenhuma"}`,
  );
  logger.info(`   Nível máximo de permissão: L${config.defaultPermissionLevel}`);
  logger.info(`   WebSocket: ws://${config.host}:${config.port}/ws`);

  const shutdown = (signal: string) => {
    logger.info(`Recebido ${signal}, encerrando graciosamente...`);
    app
      .close()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, "Erro ao encerrar o servidor");
        process.exit(1);
      });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Falha fatal ao iniciar o backend do JARVIS:", error);
  process.exit(1);
});
