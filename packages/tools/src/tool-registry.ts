import type { LLMToolDefinition } from "@jarvis/shared";
import type { Logger } from "@jarvis/observability";
import { toLLMToolDefinition, type Tool, type ToolContext, type ToolResult } from "./tool.js";

/**
 * Registro central de ferramentas. Ferramentas concretas se registram aqui
 * uma vez, na inicialização do backend; o `AgentOrchestrator` só conhece
 * este registro, nunca as ferramentas individualmente.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown, unknown>>();

  constructor(private readonly logger?: Logger) {}

  register(tool: Tool<unknown, unknown>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Ferramenta duplicada: "${tool.name}" já está registrada.`);
    }
    this.tools.set(tool.name, tool);
    this.logger?.info({ tool: tool.name, level: tool.permissionLevel }, "Ferramenta registrada");
  }

  get(name: string): Tool<unknown, unknown> | undefined {
    return this.tools.get(name);
  }

  list(): Tool<unknown, unknown>[] {
    return Array.from(this.tools.values());
  }

  toLLMDefinitions(): LLMToolDefinition[] {
    return this.list().map(toLLMToolDefinition);
  }

  /**
   * Valida a entrada (via zod) e executa a ferramenta. Nunca lança — erros
   * de validação ou de execução viram um `ToolResult` com `success: false`,
   * para que o chamador sempre possa devolver algo ao modelo/à auditoria.
   */
  async run(name: string, rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Ferramenta desconhecida: "${name}".` };
    }

    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: `Entrada inválida para "${name}": ${parsed.error.message}`,
      };
    }

    try {
      return await tool.execute(parsed.data, ctx);
    } catch (error) {
      this.logger?.error({ err: error, tool: name }, "Falha ao executar ferramenta");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na ferramenta.",
      };
    }
  }
}
