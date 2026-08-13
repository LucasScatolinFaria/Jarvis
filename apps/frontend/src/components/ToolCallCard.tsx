import type { TimelineEntry, ToolCardStatus } from "../store/types.js";
import { permissionShortLabel } from "../lib/agentStateMeta.js";

interface Props {
  entry: Extract<TimelineEntry, { kind: "tool" }>;
}

const STATUS_META: Record<ToolCardStatus, { label: string; className: string; pulse: boolean }> = {
  running: { label: "Executando", className: "text-jarvis-amber", pulse: true },
  success: { label: "Concluído", className: "text-jarvis-green", pulse: false },
  error: { label: "Falhou", className: "text-jarvis-red", pulse: false },
  denied: { label: "Negado", className: "text-jarvis-red", pulse: false },
  awaiting_confirmation: { label: "Aguardando confirmação", className: "text-jarvis-amber", pulse: true },
};

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolCallCard({ entry }: Props) {
  const status = STATUS_META[entry.status];
  const inputText = formatValue(entry.input);
  const resultText = entry.result !== undefined ? formatValue(entry.result) : entry.error;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[75%] rounded-xl border border-jarvis-border bg-jarvis-surface-2 px-4 py-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🔧</span>
            <span className="text-jarvis-text">{entry.name}</span>
            <span className="rounded-full border border-jarvis-border px-2 py-0.5 text-[10px] text-jarvis-text-dim">
              {permissionShortLabel(entry.permissionLevel)}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 ${status.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${status.pulse ? "jarvis-pulse" : ""}`} />
            {status.label}
            {entry.durationMs !== undefined && <span className="text-jarvis-text-dim"> · {entry.durationMs}ms</span>}
          </div>
        </div>
        {inputText && inputText !== "{}" && (
          <pre className="mt-2 overflow-x-auto text-jarvis-text-dim">{inputText}</pre>
        )}
        {resultText && <pre className="mt-2 overflow-x-auto text-jarvis-text-dim">{resultText}</pre>}
      </div>
    </div>
  );
}
