# Migrations — Fase 2

Migrations SQL versionadas serão adicionadas aqui quando `packages/database`
for implementado. `docker-compose.yml` já monta esta pasta em
`/docker-entrypoint-initdb.d` do container Postgres, então os arquivos
`NNN_descricao.sql` colocados aqui rodam automaticamente na primeira
inicialização do banco.
