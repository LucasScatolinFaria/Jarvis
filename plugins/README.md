# Plugins — Fase 9

Sistema de plugins (Spotify, Discord, GitHub, calendário, clima, navegador,
...) planejado para a Fase 9 do roadmap (`docs/ARCHITECTURE.md`, seção F).
Cada plugin será um diretório com `manifest.json` (nome, permissões
solicitadas, configuração) + um conjunto de `Tool`s (`packages/tools`) que se
registram no `ToolRegistry` do backend em tempo de inicialização, sem exigir
mudança no núcleo do agente.
