/**
 * Contrato da memória de longo prazo (docs/ARCHITECTURE.md seção F —
 * roadmap Fase 2 / seções 8–11 do briefing original: episódica, semântica,
 * preferências, projetos, tarefas, decisões).
 *
 * Este arquivo define APENAS o contrato. A implementação concreta
 * (`PostgresMemoryStore`, sobre `packages/database` com pgvector para busca
 * semântica por embeddings) é construída na Fase 2. Nenhum código da Fase 1
 * depende desta interface — ela existe para que a Fase 2 tenha um alvo
 * estável a implementar, e para que `AgentOrchestrator` já saiba, desde já,
 * qual será a forma de recuperar memória de longo prazo quando ela existir.
 */

export type MemoryType =
  | "episodic"
  | "semantic"
  | "preference"
  | "project"
  | "task"
  | "decision";

export interface MemoryRecord {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  /** 0–1: quão importante essa memória é para retenção/priorização em contexto. */
  importance: number;
  /** Quantas vezes essa memória foi recuperada/usada — alimenta a heurística de relevância. */
  accessCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  sourceConversationId?: string;
}

export interface MemorySearchQuery {
  userId: string;
  /** Texto livre — buscado por similaridade semântica (embeddings) via pgvector. */
  query: string;
  types?: MemoryType[];
  limit?: number;
}

export interface MemoryStore {
  save(record: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt" | "accessCount">): Promise<MemoryRecord>;
  search(query: MemorySearchQuery): Promise<MemoryRecord[]>;
  update(id: string, patch: Partial<Pick<MemoryRecord, "content" | "importance" | "expiresAt">>): Promise<MemoryRecord>;
  delete(id: string): Promise<void>;
  /** Usado pelo botão "Apagar todas as minhas memórias" (seção 47 do briefing). */
  deleteAllForUser(userId: string): Promise<number>;
}
