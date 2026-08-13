import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { LLMToolDefinition } from "@jarvis/shared";
import { PermissionLevel } from "@jarvis/shared";

/**
 * Contrato de ferramenta (docs/ARCHITECTURE.md / seção 43 do briefing
 * original). Toda ferramenta concreta (arquivos, terminal, navegador,
 * controle do computador, ...) implementa esta interface — o restante do
 * sistema (ToolRegistry, AgentOrchestrator) nunca precisa conhecer os
 * detalhes de uma ferramenta específica.
 */
export interface ToolContext {
  sessionId: string;
  requestId: string;
}

export interface ToolResult<TOutput = unknown> {
  success: boolean;
  data?: TOutput;
  error?: string;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  inputSchema: ZodType<TInput>;
  execute(input: TInput, ctx: ToolContext): Promise<ToolResult<TOutput>>;
}

/** Converte uma Tool tipada em zod para o formato que os LLMs entendem. */
export function toLLMToolDefinition(tool: Tool<unknown, unknown>): LLMToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema, { target: "openApi3" }) as Record<
      string,
      unknown
    >,
  };
}

export { PermissionLevel };
