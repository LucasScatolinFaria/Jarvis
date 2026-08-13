/**
 * Estados do agente (docs/ARCHITECTURE.md seção 29 do briefing original).
 * A UI usa esse enum para escolher a animação/indicador correto.
 */
export enum AgentState {
  OFFLINE = "OFFLINE",
  STARTING = "STARTING",
  IDLE = "IDLE",
  LISTENING = "LISTENING",
  THINKING = "THINKING",
  PLANNING = "PLANNING",
  SEARCHING = "SEARCHING",
  EXECUTING = "EXECUTING",
  VERIFYING = "VERIFYING",
  SPEAKING = "SPEAKING",
  WAITING_CONFIRMATION = "WAITING_CONFIRMATION",
  ERROR = "ERROR",
}
