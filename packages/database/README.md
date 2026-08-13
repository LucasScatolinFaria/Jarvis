# @jarvis/database — Fase 2

Este pacote hospedará o cliente de acesso a dados (PostgreSQL + pgvector +
Redis) descrito em `docs/ARCHITECTURE.md`. Ainda não há código aqui — é
implementado junto com `packages/memory`'s `MemoryStore` (ver
`packages/memory/src/memory-store.ts` para o contrato que a implementação
deste pacote precisará satisfazer).

Planejado para a Fase 2:

- Cliente Postgres (ex.: `pg` ou `postgres.js`) com pool de conexões.
- Migrations versionadas em `database/migrations/`.
- `PostgresMemoryStore implements MemoryStore` usando `pgvector` para busca
  semântica.
- Cliente Redis para cache de contexto quente e pub/sub entre processos.
- Repositórios para as tabelas `users`, `conversations`, `messages`,
  `preferences`, `projects`, `tasks`, `events`, `tool_executions`,
  `audit_logs`, `feedback` (ver `docs/ARCHITECTURE.md`).
