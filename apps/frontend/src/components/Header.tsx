import { useJarvisStore } from "../store/useJarvisStore.js";
import { getAgentStateMeta } from "../lib/agentStateMeta.js";

export function Header() {
  const connectionStatus = useJarvisStore((s) => s.connectionStatus);
  const agentState = useJarvisStore((s) => s.agentState);
  const meta = getAgentStateMeta(agentState);

  const connectionLabel =
    connectionStatus === "online" ? "SISTEMA ONLINE" : connectionStatus === "connecting" ? "CONECTANDO..." : "OFFLINE";
  const connectionColor =
    connectionStatus === "online" ? "bg-jarvis-green" : connectionStatus === "connecting" ? "bg-jarvis-amber" : "bg-jarvis-red";

  return (
    <header className="flex items-center justify-between border-b border-jarvis-border px-6 py-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold tracking-[0.3em] text-jarvis-text">JARVIS</h1>
        <span className="text-[11px] text-jarvis-text-dim">Personal AI Operating System</span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connectionColor} ${connectionStatus !== "offline" ? "jarvis-pulse" : ""}`} />
          <span className="tracking-widest text-jarvis-text-dim">{connectionLabel}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-jarvis-border px-3 py-1">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.colorClass.split(" ")[0]} ${meta.pulse ? "jarvis-pulse" : ""}`} />
          <span className={meta.colorClass.split(" ")[1]}>{meta.label}</span>
        </div>
      </div>
    </header>
  );
}
