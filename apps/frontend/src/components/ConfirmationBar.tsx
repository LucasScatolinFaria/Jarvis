import { useJarvisStore } from "../store/useJarvisStore.js";
import { permissionShortLabel } from "../lib/agentStateMeta.js";

interface Props {
  onConfirm: (requestId: string, approved: boolean) => void;
}

export function ConfirmationBar({ onConfirm }: Props) {
  const pending = useJarvisStore((s) => s.pendingConfirmation);
  if (!pending) return null;

  return (
    <div className="mx-6 mb-3 flex items-center justify-between gap-4 rounded-xl border border-jarvis-amber/40 bg-jarvis-amber/10 px-4 py-3 text-sm">
      <div>
        <div className="text-jarvis-amber">
          Confirmação necessária · {permissionShortLabel(pending.permissionLevel)}
        </div>
        <div className="text-xs text-jarvis-text-dim">
          O agente quer executar <span className="text-jarvis-text">{pending.tool}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onConfirm(pending.requestId, false)}
          className="rounded-lg border border-jarvis-border px-3 py-1.5 text-xs text-jarvis-text-dim transition hover:border-jarvis-red hover:text-jarvis-red"
        >
          Negar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(pending.requestId, true)}
          className="rounded-lg border border-jarvis-green/50 bg-jarvis-green/10 px-3 py-1.5 text-xs text-jarvis-green transition hover:bg-jarvis-green/20"
        >
          Aprovar
        </button>
      </div>
    </div>
  );
}
