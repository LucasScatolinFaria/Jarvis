# apps/desktop — Fase 10

Shell desktop em **Tauri** (justificativa da escolha em
`docs/ARCHITECTURE.md`, seção B.5), que hospedará `apps/frontend` como a
webview e exporá comandos nativos (controle do computador, sistema de
arquivos, processos) através do modelo de permissões explícitas do Tauri —
alinhado ao `PermissionEngine` de `packages/security`.

Sem código ainda: esta é a Fase 10 do roadmap, depois de Controle do
Computador (Fase 5) e Visão Computacional (Fase 6) já estarem prontos no
backend.
