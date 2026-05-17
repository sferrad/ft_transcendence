import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from './socketSingleton';

type EventHandler = (...args: unknown[]) => void;
type SocketPayload = Record<string, unknown>;

export interface UseWebSocketOptions {
  /** @deprecated le socket est désormais un singleton global ; conservé pour compat. */
  url?: string;
  enabled?: boolean;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
  emit: (event: string, data?: SocketPayload) => boolean;
  on: (event: string, callback: EventHandler) => void;
  off: (event: string, callback?: EventHandler) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { enabled = true } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) { setSocket(null); setConnected(false); return; }

    const shared = getSocket();
    if (!shared) {
      setSocket(null);
      setConnected(false);
      setError(new Error('Missing access token'));
      return;
    }

    setSocket(shared);
    setConnected(shared.connected);

    const onConnect = () => { setConnected(true); setError(null); };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) => { setConnected(false); setError(err); };
    const onWsError = (payload: unknown) => {
      const data = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
      setError(new Error(String(data.message || 'WebSocket error')));
    };

    shared.on('connect', onConnect);
    shared.on('disconnect', onDisconnect);
    shared.on('connect_error', onConnectError);
    shared.on('ws.error', onWsError);

    return () => {
      shared.off('connect', onConnect);
      shared.off('disconnect', onDisconnect);
      shared.off('connect_error', onConnectError);
      shared.off('ws.error', onWsError);
    };
  }, [enabled]);

  const emit = useCallback((event: string, data?: SocketPayload) => {
    if (!socket?.connected) return false;
    socket.emit(event, data ?? {});
    return true;
  }, [socket]);

  const on = useCallback((event: string, callback: EventHandler) => {
    socket?.on(event, callback);
  }, [socket]);

  const off = useCallback((event: string, callback?: EventHandler) => {
    if (!socket) return;
    if (callback) socket.off(event, callback);
    else socket.off(event);
  }, [socket]);

  return { socket, connected, error, emit, on, off };
}

// Re-exports for backwards compatibility
export type { ChatMessage, ChatMemberEvent, TypingEvent, ReadReceiptEvent } from './useChatWebSocket';
export { useChatWebSocket } from './useChatWebSocket';
