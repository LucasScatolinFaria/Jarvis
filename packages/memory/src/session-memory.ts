import type { LLMMessage } from "@jarvis/shared";

export interface SessionMemoryOptions {
  /** Máximo de mensagens mantidas em memória por sessão (janela deslizante). */
  maxMessagesPerSession?: number;
}

/**
 * Memória de sessão (docs/ARCHITECTURE.md / seção 8 do briefing — "Memória
 * de sessão: contexto da conversa atual").
 *
 * Implementação da Fase 1: inteiramente em processo (`Map`), perdida ao
 * reiniciar o backend. Isso é intencional — memória de sessão é, por
 * definição, o contexto da conversa *atual*; persistência entre sessões
 * (curto/longo prazo, episódica, semântica) é a Fase 2 e vive em
 * `MemoryStore` (packages/memory/src/memory-store.ts), sobre Postgres.
 */
export class SessionMemory {
  private readonly sessions = new Map<string, LLMMessage[]>();
  private readonly maxMessages: number;

  constructor(options: SessionMemoryOptions = {}) {
    this.maxMessages = options.maxMessagesPerSession ?? 40;
  }

  append(sessionId: string, message: LLMMessage): void {
    const history = this.sessions.get(sessionId) ?? [];
    history.push(message);
    if (history.length > this.maxMessages) {
      history.splice(0, history.length - this.maxMessages);
    }
    this.sessions.set(sessionId, history);
  }

  getHistory(sessionId: string): LLMMessage[] {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  sessionCount(): number {
    return this.sessions.size;
  }
}
