import { describe, expect, it } from "vitest";
import { getCurrentDateTimeTool } from "./get-current-datetime.js";

const ctx = { sessionId: "test-session", requestId: "test-request" };

describe("getCurrentDateTimeTool", () => {
  it("retorna a data/hora atuais no fuso padrão do sistema quando nenhum é informado", async () => {
    const result = await getCurrentDateTimeTool.execute({}, ctx);
    expect(result.success).toBe(true);
    expect(result.data?.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.data?.formatted.length).toBeGreaterThan(0);
  });

  it("respeita um fuso horário IANA válido", async () => {
    const result = await getCurrentDateTimeTool.execute({ timezone: "America/Sao_Paulo" }, ctx);
    expect(result.success).toBe(true);
    expect(result.data?.timezone).toBe("America/Sao_Paulo");
  });

  it("retorna erro para um fuso horário inválido, sem lançar exceção", async () => {
    const result = await getCurrentDateTimeTool.execute({ timezone: "Not/A_Zone" }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
