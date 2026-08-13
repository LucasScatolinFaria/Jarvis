import { describe, expect, it } from "vitest";
import { ModelRouter } from "./model-router.js";

const config = { fast: "FAST", default: "DEFAULT", advanced: "ADVANCED" };

describe("ModelRouter", () => {
  const router = new ModelRouter(config);

  it("usa o modelo rápido para saudações curtas", () => {
    expect(router.select({ text: "Olá" })).toBe("FAST");
    expect(router.select({ text: "que horas são" })).toBe("FAST");
  });

  it("usa o modelo avançado para mensagens longas", () => {
    const longText = "Analise ".repeat(120);
    expect(router.select({ text: longText })).toBe("ADVANCED");
  });

  it("usa o modelo avançado para palavras-chave de planejamento/arquitetura", () => {
    expect(router.select({ text: "Analise a arquitetura desse projeto inteiro" })).toBe(
      "ADVANCED",
    );
  });

  it("usa o modelo padrão para o restante", () => {
    expect(router.select({ text: "Qual a diferença entre React e Vue?" })).toBe("DEFAULT");
  });

  it("respeita um hint explícito, ignorando a heurística de texto", () => {
    expect(router.select({ text: "Olá", hint: "advanced" })).toBe("ADVANCED");
    expect(router.select({ text: "Analise a arquitetura", hint: "fast" })).toBe("FAST");
  });
});
