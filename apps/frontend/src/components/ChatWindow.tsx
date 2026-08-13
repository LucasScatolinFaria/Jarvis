import { useEffect, useRef } from "react";
import { useJarvisStore } from "../store/useJarvisStore.js";
import { MessageBubble } from "./MessageBubble.js";
import { ToolCallCard } from "./ToolCallCard.js";
import { SystemNotice } from "./SystemNotice.js";

export function ChatWindow() {
  const timeline = useJarvisStore((s) => s.timeline);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-jarvis-text-dim">
        <p className="text-sm">Diga olá para começar.</p>
        <p className="text-xs">
          Experimente: <span className="text-jarvis-cyan">"Que horas são?"</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
      {timeline.map((entry) => {
        switch (entry.kind) {
          case "message":
            return <MessageBubble key={entry.id} entry={entry} />;
          case "tool":
            return <ToolCallCard key={entry.id} entry={entry} />;
          case "system":
            return <SystemNotice key={entry.id} entry={entry} />;
          default:
            return null;
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
}
