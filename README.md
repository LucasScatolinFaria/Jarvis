# JARVIS — Personal AI Operating System

Um agente de IA pessoal avançado — não um chatbot. Este repositório contém a
**Fase 1 (Core + Chat)** de um roadmap de 10 fases rumo a um verdadeiro
sistema operacional de IA pessoal: conversa por texto e voz, memória de
longo prazo, uso de ferramentas, controle do computador, visão
computacional, multiagentes e aprendizado contínuo.

📐 **Leia primeiro:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — análise
arquitetural completa, escolha de stack (com comparativos), diagrama do
sistema, estrutura de pastas e como os módulos conversam entre si.

## O que já funciona nesta fase

- **Chat em tempo real** por WebSocket, com streaming de texto (efeito de
  digitação) e fallback REST (`POST /api/chat`).
- **Um agente de verdade**, não só um wrapper de chat: o modelo pode decidir
  chamar ferramentas, o resultado volta para ele, e ele decide se já pode
  responder — com proteção contra loops infinitos.
- **Tool Engine** funcional de ponta a ponta, com duas ferramentas reais:
  - `get_current_datetime` (LEVEL 0)
  - `open_application` (LEVEL 1) — abre programas conhecidos no Windows
    (VS Code, Chrome, Discord, Spotify, Bloco de Notas, Explorador de
    Arquivos, terminal, ...) por allowlist, testado abrindo de verdade.
  Pronto para receber as próximas ferramentas (arquivos, terminal,
  navegador, mais controle do computador).
- **Segurança desde o núcleo**: `PermissionEngine` (níveis L0–L5),
  `CommandValidator` (detecção de comandos destrutivos) e `AuditLogger`
  (`data/audit.log`) — inclusive nas ferramentas que já mexem no sistema.
- **Confirmação de ações críticas**: ferramentas L4/L5 pausam o agente e
  pedem aprovação explícita na UI antes de executar.
- **Memória de sessão** (contexto da conversa atual, em processo).
- **ModelRouter**: escolhe automaticamente entre modelo rápido, padrão ou
  avançado conforme a mensagem.
- **HUD de chat** em React/Tailwind: estado do agente em tempo real,
  indicador animado tipo waveform que reage ao vivo (`AgentAvatar`, pulsa
  enquanto o JARVIS pensa/executa/responde), cartões de execução de
  ferramenta, banner de confirmação, tema escuro com detalhes neon.

O que **ainda não** está aqui (por fase, ver roadmap abaixo): voz, memória
persistente/semântica, controle do computador mais amplo (janelas, mídia,
processos), visão computacional, multiagentes, plugins, app desktop. As
interfaces (`LLMProvider`, `SpeechToTextProvider`, `MemoryStore`, ...) já
existem como contratos estáveis para essas fases não quebrarem nada do que
já funciona.

## Stack

TypeScript de ponta a ponta · Fastify + WebSocket · React + Vite + Tailwind
v4 · Zustand · Vitest · npm workspaces. `LLMProvider` é uma interface
trocável (`packages/ai`) com duas implementações prontas: **Ollama** (local,
grátis) e **Anthropic Claude** (nuvem, pago). Detalhes e justificativas em
`docs/ARCHITECTURE.md` seção B.

## Rodando 100% grátis (Ollama)

Não é obrigatório pagar nada pra usar o JARVIS. Por padrão (`LLM_PROVIDER=
ollama` no `.env.example`), o agente roda inteiramente na sua máquina com
modelos abertos via [Ollama](https://ollama.com) — sem chave de API, sem
limite de uso, sem enviar nada para a nuvem. O resto do stack (Node,
Postgres, Redis, tudo) já é open-source e roda local.

**Trade-off honesto:** modelos abertos rodando localmente (Llama, Qwen) são
mais fracos que o Claude em raciocínio complexo e uso de ferramentas, e a
velocidade depende do seu hardware (GPU/RAM).

1. Instale o Ollama: [ollama.com/download](https://ollama.com/download)
   (Windows/macOS/Linux). Ele fica rodando em segundo plano automaticamente
   depois de instalado, escutando em `http://localhost:11434`.
2. Baixe os modelos usados por padrão:
   ```bash
   ollama pull llama3.2:3b          # modelo rápido — respostas curtas/simples
   ollama pull qwen2.5:7b-instruct  # modelo padrão — melhor uso de ferramentas
   ```
   Em GPUs de laptop com pouca VRAM (≤4GB), comece só com `llama3.2:3b` pra
   validar o pipeline; ele é bem mais leve. Se tiver mais VRAM disponível,
   dá pra usar modelos maiores — ajuste `JARVIS_MODEL_*` no `.env`.
3. `npm install && cp .env.example .env` — o padrão já é `LLM_PROVIDER=
   ollama`, nenhuma chave de API é necessária.
4. `npm run dev` e teste com "Que horas são?".

Quer trocar para a Anthropic depois (melhor qualidade, pago)? Defina
`LLM_PROVIDER=anthropic` e `ANTHROPIC_API_KEY=...` no `.env` — nenhum outro
código muda, é só configuração.

## Pré-requisitos

- Node.js 20+ (testado com Node 22)
- **Opção grátis:** [Ollama](https://ollama.com/download) instalado localmente (ver acima)
- **Opção paga:** uma chave de API da Anthropic — [console.anthropic.com](https://console.anthropic.com/)

## Instalação

```bash
npm install
cp .env.example .env
# padrão já é LLM_PROVIDER=ollama (grátis) — ver seção acima.
# pra usar a Anthropic, troque LLM_PROVIDER=anthropic e preencha ANTHROPIC_API_KEY.
```

## Executando em desenvolvimento

```bash
npm run dev
```

Isso sobe backend (`http://localhost:3333`, WS em `ws://localhost:3333/ws`)
e frontend (`http://localhost:5173`) juntos. Para rodar separadamente:

```bash
npm run dev:backend
npm run dev:frontend
```

Abra `http://localhost:5173` e digite (ou, na Fase 3, fale): **"Que horas
são?"** — isso exercita o pipeline completo: LLM decide usar a ferramenta
`get_current_datetime` → `PermissionEngine` libera (LEVEL 0) →
`ToolRegistry` executa → `AuditLogger` registra em `data/audit.log` → o
resultado volta para o modelo → a resposta final é transmitida por
streaming para a UI.

## Testes

```bash
npm test          # roda todos os testes (Vitest) uma vez
npm run test:watch
npm run typecheck  # checagem de tipos em todos os pacotes/apps
npm run lint
```

Cobertura atual: `PermissionEngine`, `ModelRouter`, `ToolRegistry` (incluindo
a normalização de `null` em campos opcionais), `get_current_datetime`,
`open_application` (launcher injetado — nenhum teste abre um app de
verdade), `SessionMemory`, `OllamaProvider` (streaming, tool_calls, erros de
conexão/modelo — com `fetch` mockado), `AgentOrchestrator` (fluxo direto,
uso de ferramenta, negação de permissão, confirmação aprovada/expirada,
limite de iterações) e as rotas do backend (`/api/health`, `/api/chat`,
`/ws`) com um `LLMProvider` falso — nenhum teste chama a API da Anthropic ou
uma instância real do Ollama.

## Estrutura do projeto

Ver `docs/ARCHITECTURE.md` seção D para a árvore completa comentada. Resumo:

```
apps/backend    Fastify — API REST + WebSocket, composição do agente
apps/frontend   React + Tailwind — HUD de chat
apps/desktop    Shell Tauri (Fase 10, ainda vazio)
packages/*      Domínios: shared, ai, agent, memory, tools, security,
                database (Fase 2), observability
docs/           Arquitetura
database/       Migrations e seeds (Fase 2)
plugins/        Plugins de terceiros (Fase 9)
```

## Roadmap

| Fase | Escopo | Status |
|---|---|---|
| 1 | Core + Chat | ✅ Este repositório |
| 2 | PostgreSQL + pgvector + Redis; memória de longo prazo/semântica | Planejado |
| 3 | Voice pipeline (wake word, VAD, STT, TTS, interrupção) | Planejado |
| 4 | Tool Engine completo (arquivos, terminal, programação) | Planejado |
| 5 | Controle do computador | Planejado |
| 6 | Visão computacional | Planejado |
| 7 | Multiagentes especializados | Planejado |
| 8 | Aprendizado contínuo e feedback | Planejado |
| 9 | Sistema de plugins | Planejado |
| 10 | Desktop AI OS (Tauri) | Planejado |

## Segurança

Todo tool call passa por `PermissionEngine` (L0–L5) antes de executar.
Ferramentas L4+ exigem confirmação explícita na UI, com timeout configurável
(`TOOL_CONFIRMATION_TIMEOUT_MS`). Toda decisão — permitida, negada ou
pendente — é registrada em `data/audit.log` (JSON Lines). Nunca commite
`.env`; `data/audit.log` também é gitignored por padrão.

## Licença

Projeto pessoal — sem licença de distribuição definida ainda.
