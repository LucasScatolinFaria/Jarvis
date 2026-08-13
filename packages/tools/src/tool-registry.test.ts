import { describe, expect, it } from "vitest";
import { ToolRegistry } from "./tool-registry.js";
import { getCurrentDateTimeTool } from "./tools/get-current-datetime.js";

const ctx = { sessionId: "s1", requestId: "r1" };

describe("ToolRegistry", () => {
  it("registra e lista ferramentas", () => {
    const registry = new ToolRegistry();
    registry.register(getCurrentDateTimeTool);
    expect(registry.list().map((t) => t.name)).toEqual(["get_current_datetime"]);
  });

  it("impede registrar duas ferramentas com o mesmo nome", () => {
    const registry = new ToolRegistry();
    registry.register(getCurrentDateTimeTool);
    expect(() => registry.register(getCurrentDateTimeTool)).toThrow();
  });

  it("executa uma ferramenta registrada com entrada válida", async () => {
    const registry = new ToolRegistry();
    registry.register(getCurrentDateTimeTool);
    const result = await registry.run("get_current_datetime", {}, ctx);
    expect(result.success).toBe(true);
  });

  it("retorna erro (sem lançar) para ferramenta desconhecida", async () => {
    const registry = new ToolRegistry();
    const result = await registry.run("ferramenta_inexistente", {}, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/desconhecida/);
  });

  it("retorna erro (sem lançar) para entrada inválida", async () => {
    const registry = new ToolRegistry();
    registry.register(getCurrentDateTimeTool);
    const result = await registry.run("get_current_datetime", { timezone: 42 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Entrada inválida/);
  });

  it("converte ferramentas registradas em definições de LLM", () => {
    const registry = new ToolRegistry();
    registry.register(getCurrentDateTimeTool);
    const [def] = registry.toLLMDefinitions();
    expect(def?.name).toBe("get_current_datetime");
    expect(def?.inputSchema).toBeDefined();
  });
});
