import { AgentState } from "@jarvis/shared";

export interface AgentStateMeta {
  label: string;
  colorClass: string;
  pulse: boolean;
}

const META: Record<AgentState, AgentStateMeta> = {
  [AgentState.OFFLINE]: { label: "Offline", colorClass: "bg-jarvis-text-dim text-jarvis-text-dim", pulse: false },
  [AgentState.STARTING]: { label: "Iniciando", colorClass: "bg-jarvis-cyan text-jarvis-cyan", pulse: true },
  [AgentState.IDLE]: { label: "Pronto", colorClass: "bg-jarvis-green text-jarvis-green", pulse: false },
  [AgentState.LISTENING]: { label: "Ouvindo", colorClass: "bg-jarvis-cyan text-jarvis-cyan", pulse: true },
  [AgentState.THINKING]: { label: "Pensando", colorClass: "bg-jarvis-violet text-jarvis-violet", pulse: true },
  [AgentState.PLANNING]: { label: "Planejando", colorClass: "bg-jarvis-violet text-jarvis-violet", pulse: true },
  [AgentState.SEARCHING]: { label: "Pesquisando", colorClass: "bg-jarvis-cyan text-jarvis-cyan", pulse: true },
  [AgentState.EXECUTING]: { label: "Executando", colorClass: "bg-jarvis-amber text-jarvis-amber", pulse: true },
  [AgentState.VERIFYING]: { label: "Verificando", colorClass: "bg-jarvis-amber text-jarvis-amber", pulse: true },
  [AgentState.SPEAKING]: { label: "Falando", colorClass: "bg-jarvis-cyan text-jarvis-cyan", pulse: true },
  [AgentState.WAITING_CONFIRMATION]: {
    label: "Aguardando confirmação",
    colorClass: "bg-jarvis-amber text-jarvis-amber",
    pulse: true,
  },
  [AgentState.ERROR]: { label: "Erro", colorClass: "bg-jarvis-red text-jarvis-red", pulse: false },
};

export function getAgentStateMeta(state: AgentState): AgentStateMeta {
  return META[state];
}

const PERMISSION_LABELS = ["L0 · Leitura", "L1 · Ação simples", "L2 · Arquivos", "L3 · Comando", "L4 · Admin", "L5 · Crítico"];

export function permissionShortLabel(level: number): string {
  return PERMISSION_LABELS[level] ?? `L${level}`;
}
