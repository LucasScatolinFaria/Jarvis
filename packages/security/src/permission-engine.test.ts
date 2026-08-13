import { describe, expect, it } from "vitest";
import { PermissionLevel } from "@jarvis/shared";
import { PermissionEngine } from "./permission-engine.js";

describe("PermissionEngine", () => {
  it("permite ferramentas dentro do nível máximo configurado", () => {
    const engine = new PermissionEngine(PermissionLevel.L3_COMMAND_EXECUTION);
    const result = engine.evaluate(PermissionLevel.L1_SIMPLE_ACTION);
    expect(result.decision).toBe("allow");
  });

  it("nega ferramentas acima do nível máximo configurado", () => {
    const engine = new PermissionEngine(PermissionLevel.L2_FILE_MODIFICATION);
    const result = engine.evaluate(PermissionLevel.L4_ADMIN_ACTION);
    expect(result.decision).toBe("deny");
  });

  it("exige confirmação para ações administrativas (L4) mesmo dentro do limite", () => {
    const engine = new PermissionEngine(PermissionLevel.L5_CRITICAL_ACTION);
    const result = engine.evaluate(PermissionLevel.L4_ADMIN_ACTION);
    expect(result.decision).toBe("confirm");
  });

  it("exige confirmação para ações críticas (L5)", () => {
    const engine = new PermissionEngine(PermissionLevel.L5_CRITICAL_ACTION);
    const result = engine.evaluate(PermissionLevel.L5_CRITICAL_ACTION);
    expect(result.decision).toBe("confirm");
  });

  it("permite forçar confirmação em qualquer nível", () => {
    const engine = new PermissionEngine(PermissionLevel.L3_COMMAND_EXECUTION);
    const result = engine.evaluate(PermissionLevel.L0_READ_ONLY, { forceConfirm: true });
    expect(result.decision).toBe("confirm");
  });

  it("nunca permite (allow) algo acima do máximo, mesmo com forceConfirm=false", () => {
    const engine = new PermissionEngine(PermissionLevel.L0_READ_ONLY);
    const result = engine.evaluate(PermissionLevel.L1_SIMPLE_ACTION);
    expect(result.decision).toBe("deny");
  });
});
