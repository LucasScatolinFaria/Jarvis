import { useCallback, useEffect, useRef } from "react";
import type { ClientEvent, ServerEvent } from "@jarvis/shared";
import { useJarvisStore } from "../store/useJarvisStore.js";

const WS_URL = import.meta.env.VITE_BACKEND_WS_URL ?? "ws://localhost:3333/ws";
const RECONNECT_DELAY_MS = 2000;

/**
 * Gerencia a conexão WebSocket com o backend: conecta, reconecta com um
 * atraso fixo em caso de queda (seção 7 do briefing — "perda de conexão"),
 * e traduz eventos recebidos para o store global.
 */
export function useJarvisSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const handleServerEvent = useJarvisStore((state) => state.handleServerEvent);
  const setConnectionStatus = useJarvisStore((state) => state.setConnectionStatus);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    setConnectionStatus("connecting");

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onmessage = (messageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data as string) as ServerEvent;
        handleServerEvent(event);
      } catch (error) {
        console.error("Evento inválido recebido do backend:", error);
      }
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("offline");
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [handleServerEvent, setConnectionStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((event: ClientEvent) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  }, []);

  const sendUserMessage = useCallback((text: string) => send({ type: "user_message", text }), [send]);
  const confirmTool = useCallback(
    (requestId: string, approved: boolean) => send({ type: "confirm_tool", requestId, approved }),
    [send],
  );

  return { sendUserMessage, confirmTool };
}
