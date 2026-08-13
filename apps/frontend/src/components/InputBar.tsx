import { useState, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-3 border-t border-jarvis-border px-6 py-4">
      <button
        type="button"
        disabled
        title="Voz chega na Fase 3 do roadmap — veja docs/ARCHITECTURE.md"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-jarvis-border text-jarvis-text-dim opacity-50"
      >
        🎤
      </button>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={disabled ? "JARVIS está processando..." : "Digite sua mensagem..."}
        className="max-h-32 flex-1 resize-none rounded-xl border border-jarvis-border bg-jarvis-surface px-4 py-2.5 text-sm text-jarvis-text placeholder:text-jarvis-text-dim focus:border-jarvis-cyan focus:outline-none"
      />

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyan transition hover:bg-jarvis-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ➤
      </button>
    </div>
  );
}
