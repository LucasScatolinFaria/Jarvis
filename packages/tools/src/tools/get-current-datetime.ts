import { z } from "zod";
import { PermissionLevel, type Tool } from "../tool.js";

const inputSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe(
      "Fuso horário IANA, ex: 'America/Sao_Paulo'. Se omitido, usa o fuso do servidor.",
    ),
});

export interface CurrentDateTimeOutput {
  iso: string;
  formatted: string;
  timezone: string;
}

/**
 * Ferramenta de demonstração de ponta a ponta do Tool Engine na Fase 1:
 * LEVEL 0 (somente leitura), sem nenhum risco, mas exercitando o pipeline
 * completo — LLM decide chamar a ferramenta → PermissionEngine avalia →
 * ToolRegistry executa → AuditLogger registra → resultado volta ao modelo.
 */
export const getCurrentDateTimeTool: Tool<z.infer<typeof inputSchema>, CurrentDateTimeOutput> = {
  name: "get_current_datetime",
  description:
    "Retorna a data e a hora atuais do sistema. Use sempre que o usuário perguntar as horas, " +
    "o dia de hoje ou precisar de um timestamp exato — nunca adivinhe a data/hora atual.",
  permissionLevel: PermissionLevel.L0_READ_ONLY,
  inputSchema,
  async execute(input) {
    try {
      const timezone = input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: timezone,
      }).format(now);

      return {
        success: true,
        data: { iso: now.toISOString(), formatted, timezone },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `Fuso horário inválido: ${error.message}`
            : "Fuso horário inválido.",
      };
    }
  },
};
