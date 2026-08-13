import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import type { PermissionLevel } from "@jarvis/shared";

// `npm run dev`/`start` a partir da raiz do monorepo executa este processo
// com cwd = apps/backend (comportamento padrão de workspaces do npm), então
// o `.env` na raiz do projeto (documentado no README/.env.example) NÃO
// seria encontrado pelo comportamento padrão do dotenv, que resolve
// relativo a process.cwd(). Resolvemos o caminho relativo a este arquivo
// (estável, independente de onde o processo foi iniciado) e caímos de
// volta no comportamento padrão do dotenv se não existir (ex.: rodando
// diretamente dentro de apps/backend com seu próprio .env local).
const moduleDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(moduleDir, "../../../.env");
loadDotenv(existsSync(rootEnvPath) ? { path: rootEnvPath } : undefined);

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY é obrigatório — veja .env.example"),
  JARVIS_MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),
  JARVIS_MODEL_DEFAULT: z.string().default("claude-sonnet-5"),
  JARVIS_MODEL_ADVANCED: z.string().default("claude-opus-5"),

  DEFAULT_PERMISSION_LEVEL: z.coerce.number().int().min(0).max(5).default(3),
  TOOL_CONFIRMATION_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  AUDIT_LOG_PATH: z.string().default("./data/audit.log"),

  AGENT_MAX_TOOL_ITERATIONS: z.coerce.number().int().positive().default(5),
  AGENT_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  AGENT_NAME: z.string().default("JARVIS"),
  USER_NAME: z.string().default("Usuário"),
});

export interface AppConfig {
  port: number;
  host: string;
  corsOrigin: string;
  nodeEnv: "development" | "test" | "production";
  anthropicApiKey: string;
  models: { fast: string; default: string; advanced: string };
  defaultPermissionLevel: PermissionLevel;
  toolConfirmationTimeoutMs: number;
  auditLogPath: string;
  agentMaxToolIterations: number;
  agentRequestTimeoutMs: number;
  agentName: string;
  userName: string;
}

export function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Configuração inválida em .env:\n${parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  const env = parsed.data;

  return {
    port: env.PORT,
    host: env.HOST,
    corsOrigin: env.CORS_ORIGIN,
    nodeEnv: env.NODE_ENV,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    models: {
      fast: env.JARVIS_MODEL_FAST,
      default: env.JARVIS_MODEL_DEFAULT,
      advanced: env.JARVIS_MODEL_ADVANCED,
    },
    defaultPermissionLevel: env.DEFAULT_PERMISSION_LEVEL as PermissionLevel,
    toolConfirmationTimeoutMs: env.TOOL_CONFIRMATION_TIMEOUT_MS,
    auditLogPath: env.AUDIT_LOG_PATH,
    agentMaxToolIterations: env.AGENT_MAX_TOOL_ITERATIONS,
    agentRequestTimeoutMs: env.AGENT_REQUEST_TIMEOUT_MS,
    agentName: env.AGENT_NAME,
    userName: env.USER_NAME,
  };
}
