import { AgentState } from "@jarvis/shared";
import { useJarvisSocket } from "./hooks/useJarvisSocket.js";
import { useJarvisStore } from "./store/useJarvisStore.js";
import { Header } from "./components/Header.js";
import { ChatWindow } from "./components/ChatWindow.js";
import { ConfirmationBar } from "./components/ConfirmationBar.js";
import { InputBar } from "./components/InputBar.js";

export default function App() {
  const { sendUserMessage, confirmTool } = useJarvisSocket();
  const agentState = useJarvisStore((s) => s.agentState);
  const connectionStatus = useJarvisStore((s) => s.connectionStatus);

  // Fase 1: uma requisição por vez, sem fila de mensagens — o campo de
  // entrada só libera quando o agente está ocioso e conectado.
  const inputDisabled = connectionStatus !== "online" || agentState !== AgentState.IDLE;

  return (
    <div className="flex h-screen flex-col">
      <div className="jarvis-backdrop" />
      <Header />
      <ChatWindow />
      <ConfirmationBar onConfirm={confirmTool} />
      <InputBar onSend={sendUserMessage} disabled={inputDisabled} />
    </div>
  );
}
