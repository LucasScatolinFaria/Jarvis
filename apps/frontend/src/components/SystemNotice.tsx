import type { TimelineEntry } from "../store/types.js";

interface Props {
  entry: Extract<TimelineEntry, { kind: "system" }>;
}

export function SystemNotice({ entry }: Props) {
  return (
    <div className="flex justify-center">
      <div
        className={`rounded-full border px-3 py-1 text-[11px] ${
          entry.level === "error"
            ? "border-jarvis-red/40 text-jarvis-red"
            : "border-jarvis-border text-jarvis-text-dim"
        }`}
      >
        {entry.text}
      </div>
    </div>
  );
}
