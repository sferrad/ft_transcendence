import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from './socketSingleton';

type EventHandler = (...args: unknown[]) => void;
type SocketPayload = Record<string, unknown>;

export interface UseWebSocketOptions {
  /** @deprecated le socket est désormais un singleton global ; conservé pour compat. */
  url?: string;
  enabled?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
  emit: (event: string, data?: SocketPayload) => boolean;
  on: (event: string, callback: EventHandler) => void;
  off: (event: string, callback?: EventHandler) => void;
}

export interface ChatMessage {
  id?: number;
  room_id: number;
  sender_user_id: number;
  receiver_user_id?: number;
  user_id?: number;
  username?: string;
  content: string;
  created_at?: string;
  timestamp?: string;
}

export interface ChatMemberEvent {
  room_id: number;
  user_id: number;
  username?: string;
  type: 'joined' | 'left';
  reason?: string;
  timestamp?: string;
}



const numberList = (value: unknown): number[] => {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [];
};

const asPayload = (value: unknown): SocketPayload => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as SocketPayload
    : {};
};

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { enabled = true } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Le socket est un SINGLETON global (cf. socketSingleton.ts). Ce hook ne
  // crée plus de connexion : il se contente de s'abonner à l'état du socket
  // partagé. Démonter un composant ne ferme donc JAMAIS la connexion — c'est
  // ce qui rend le `disconnect` backend fiable (un seul socket par user).
  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      return;
    }

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
    const onDisconnect = () => { setConnected(false); };
    const onConnectError = (err: Error) => { setConnected(false); setError(err); };
    const onWsError = (payload: unknown) => {
      const data = asPayload(payload);
      setError(new Error(String(data.message || 'WebSocket error')));
    };

    shared.on('connect', onConnect);
    shared.on('disconnect', onDisconnect);
    shared.on('connect_error', onConnectError);
    shared.on('ws.error', onWsError);

    return () => {
      // On se désabonne UNIQUEMENT de nos propres listeners. Le socket
      // partagé reste vivant pour le reste de l'application.
      shared.off('connect', onConnect);
      shared.off('disconnect', onDisconnect);
      shared.off('connect_error', onConnectError);
      shared.off('ws.error', onWsError);
    };
  }, [enabled]);

  const emit = useCallback((event: string, data?: SocketPayload) => {
    if (!socket?.connected) {
      return false;
    }
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

  return {
    socket,
    connected,
    error,
    emit,
    on,
    off,
  };
}

export interface TypingEvent {
  from_user_id: number;
  username?: string;
  room_id?: number;
  timestamp: number;
}

export interface ReadReceiptEvent {
  reader_user_id: number;
  last_read_at: string | null;
  timestamp: number;
}

export function useChatWebSocket(roomId?: number, dmUserId?: number) {
  const { socket, connected, emit, on, off, error } = useWebSocket({ enabled: Boolean(roomId || dmUserId) });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<number[]>([]);
  const [memberEvent, setMemberEvent] = useState<ChatMemberEvent | null>(null);
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
  const [typingEvent, setTypingEvent] = useState<TypingEvent | null>(null);
  const [readReceipt, setReadReceipt] = useState<ReadReceiptEvent | null>(null);

  useEffect(() => {
    setMemberEvent(null);
    setTypingEvent(null);
    setReadReceipt(null);
  }, [roomId, dmUserId]);

  useEffect(() => {
    if (!socket) return;

    const handleJoined: EventHandler = (payload) => {
      const data = asPayload(payload);
      setRoomMembers(numberList(data.room_members));
      setMemberEvent(null);
      setLastMessage(null);
    };

    const handleMessage: EventHandler = (payload) => {
      const data = asPayload(payload);
      const message: ChatMessage = {
        id: typeof data.id === 'number' ? data.id : undefined,
        room_id: Number(data.room_id),
        sender_user_id: Number(data.sender_user_id ?? data.user_id),
        receiver_user_id: data.receiver_user_id === undefined ? undefined : Number(data.receiver_user_id),
        user_id: data.user_id === undefined ? undefined : Number(data.user_id),
        username: data.username === undefined ? undefined : String(data.username),
        content: String(data.content ?? ''),
        created_at: data.created_at === undefined ? undefined : String(data.created_at),
        timestamp: data.timestamp === undefined ? undefined : String(data.timestamp),
      };
      if (Number.isFinite(message.room_id) && Number.isFinite(message.sender_user_id) && message.content) {
        setMessages((prev) => [...prev, message]);
        setLastMessage(message);
      }
    };

    const handleDmMessage: EventHandler = (payload) => {
      const data = asPayload(payload);
      const message: ChatMessage = {
        id: typeof data.id === 'number' ? data.id : undefined,
        room_id: roomId ?? 0,
        sender_user_id: Number(data.sender_user_id ?? data.user_id),
        receiver_user_id: data.receiver_user_id === undefined ? undefined : Number(data.receiver_user_id),
        user_id: data.user_id === undefined ? undefined : Number(data.user_id),
        username: data.username === undefined ? undefined : String(data.username),
        content: String(data.content ?? ''),
        created_at: data.created_at === undefined ? undefined : String(data.created_at),
        timestamp: data.timestamp === undefined ? undefined : String(data.timestamp),
      };
      if (dmUserId) {
        const matchesPartner = message.sender_user_id === dmUserId || message.receiver_user_id === dmUserId;
        if (!matchesPartner) return;
      }
      if (Number.isFinite(message.sender_user_id) && message.content) {
        setMessages((prev) => [...prev, message]);
        setLastMessage(message);
      }
    };


    const handleUserJoined: EventHandler = (payload) => {
      const data = asPayload(payload);
      setRoomMembers(numberList(data.room_members));
      setMemberEvent({
        room_id: Number(data.room_id),
        user_id: Number(data.user_id),
        username: data.username === undefined ? undefined : String(data.username),
        type: 'joined',
        reason: data.reason === undefined ? undefined : String(data.reason),
        timestamp: data.timestamp === undefined ? undefined : String(data.timestamp),
      });
    };

    const handleUserLeft: EventHandler = (payload) => {
      const data = asPayload(payload);
      setRoomMembers(numberList(data.room_members));
      setMemberEvent({
        room_id: Number(data.room_id),
        user_id: Number(data.user_id),
        username: data.username === undefined ? undefined : String(data.username),
        type: 'left',
        reason: data.reason === undefined ? undefined : String(data.reason),
        timestamp: data.timestamp === undefined ? undefined : String(data.timestamp),
      });
    };

    const handleTyping: EventHandler = (payload) => {
      const data = asPayload(payload);
      const fromUserId = Number(data.user_id ?? data.from_user_id);
      if (!Number.isFinite(fromUserId) || fromUserId <= 0) return;
      // Ignore our own typing pings.
      const myId = typeof window !== 'undefined' ? Number(localStorage.getItem('user_id') ?? '0') : 0;
      if (fromUserId === myId) return;
      setTypingEvent({
        from_user_id: fromUserId,
        username: data.username === undefined ? undefined : String(data.username),
        room_id: data.room_id === undefined ? undefined : Number(data.room_id),
        timestamp: Date.now(),
      });
    };

    const handleRead: EventHandler = (payload) => {
      const data = asPayload(payload);
      const readerUserId = Number(data.reader_user_id);
      if (!Number.isFinite(readerUserId) || readerUserId <= 0) return;
      const myId = typeof window !== 'undefined' ? Number(localStorage.getItem('user_id') ?? '0') : 0;
      if (readerUserId === myId) return;
      setReadReceipt({
        reader_user_id: readerUserId,
        last_read_at: data.last_read_at === undefined || data.last_read_at === null ? null : String(data.last_read_at),
        timestamp: Date.now(),
      });
    };

    on('chat.joined', handleJoined);
    on('chat.message', handleMessage);
    on('chat.user_joined', handleUserJoined);
    on('chat.user_left', handleUserLeft);
    on('dm.message', handleDmMessage);
    on('chat.typing', handleTyping);
    on('dm.typing', handleTyping);
    on('dm.read', handleRead);

    return () => {
      off('chat.joined', handleJoined);
      off('chat.message', handleMessage);
      off('chat.user_joined', handleUserJoined);
      off('chat.user_left', handleUserLeft);
      off('dm.message', handleDmMessage);
      off('chat.typing', handleTyping);
      off('dm.typing', handleTyping);
      off('dm.read', handleRead);
    };
  }, [socket, on, off, roomId]);

  const sendMessage = useCallback((content: string) => {
    if (dmUserId) {
      return emit('dm.message', { target_user_id: dmUserId, room_id: roomId, content });
    }
    if (!roomId) return false;
    return emit('chat.message', { room_id: roomId, content });
  }, [roomId, dmUserId, emit]);

  const sendTyping = useCallback(() => {
    if (dmUserId) {
      return emit('dm.typing', { target_user_id: dmUserId });
    }
    if (!roomId) return false;
    return emit('chat.typing', { room_id: roomId });
  }, [roomId, dmUserId, emit]);

  const sendRead = useCallback((lastReadAt?: string | null) => {
    // Read receipts are DM-only for now.
    if (!dmUserId) return false;
    return emit('dm.read', { target_user_id: dmUserId, last_read_at: lastReadAt ?? null });
  }, [dmUserId, emit]);

  const joinRoom = useCallback(() => {
    if (dmUserId) {
      return emit('dm.join', { target_user_id: dmUserId, room_id: roomId });
    }
    if (!roomId) return false;
    return emit('chat.join', { room_id: roomId });
  }, [roomId, dmUserId, emit]);

  const leaveRoom = useCallback(() => {
    if (dmUserId) {
      const sent = emit('dm.leave', { target_user_id: dmUserId, room_id: roomId });
      setMessages([]);
      setRoomMembers([]);
      return sent;
    }
    if (!roomId) return false;
    const sent = emit('chat.leave', { room_id: roomId });
    setMessages([]);
    setRoomMembers([]);
    return sent;
  }, [roomId, dmUserId, emit]);

  return {
    socket,
    connected,
    error,
    messages,
    roomMembers,
    memberEvent,
    lastMessage,
    typingEvent,
    readReceipt,
    sendMessage,
    sendTyping,
    sendRead,
    joinRoom,
    leaveRoom,
  };
}
