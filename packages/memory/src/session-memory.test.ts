import { describe, expect, it } from "vitest";
import { SessionMemory } from "./session-memory.js";

describe("SessionMemory", () => {
  it("acumula mensagens por sessão, isoladas entre sessões diferentes", () => {
    const memory = new SessionMemory();
    memory.append("s1", { role: "user", content: "oi" });
    memory.append("s2", { role: "user", content: "olá" });

    expect(memory.getHistory("s1")).toHaveLength(1);
    expect(memory.getHistory("s2")).toHaveLength(1);
    expect(memory.getHistory("s1")[0]?.content).toBe("oi");
  });

  it("aplica janela deslizante respeitando maxMessagesPerSession", () => {
    const memory = new SessionMemory({ maxMessagesPerSession: 3 });
    for (let i = 0; i < 5; i++) {
      memory.append("s1", { role: "user", content: `msg-${i}` });
    }
    const history = memory.getHistory("s1");
    expect(history).toHaveLength(3);
    expect(history.map((m) => m.content)).toEqual(["msg-2", "msg-3", "msg-4"]);
  });

  it("limpa o histórico de uma sessão", () => {
    const memory = new SessionMemory();
    memory.append("s1", { role: "user", content: "oi" });
    memory.clear("s1");
    expect(memory.getHistory("s1")).toHaveLength(0);
  });

  it("retorna uma cópia do histórico (não a referência interna)", () => {
    const memory = new SessionMemory();
    memory.append("s1", { role: "user", content: "oi" });
    const history = memory.getHistory("s1");
    history.push({ role: "assistant", content: "não deveria persistir" });
    expect(memory.getHistory("s1")).toHaveLength(1);
  });
});
