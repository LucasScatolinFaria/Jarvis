import type { TimelineEntry } from "../store/types.js";

interface Props {
  entry: Extract<TimelineEntry, { kind: "message" }>;
}

export function MessageBubble({ entry }: Props) {
  const isUser = entry.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "border-jarvis-cyan/30 bg-jarvis-cyan/10 text-jarvis-text"
            : "border-jarvis-violet/30 bg-jarvis-surface text-jarvis-text"
        }`}
      >
        <div className={`mb-1 text-[10px] tracking-widest ${isUser ? "text-jarvis-cyan" : "text-jarvis-violet"}`}>
          {isUser ? "VOCÊ" : "JARVIS"}
        </div>
        <div className={entry.streaming ? "jarvis-caret" : ""}>{entry.text}</div>
      </div>
    </div>
  );
}
