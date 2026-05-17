import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

type EventHandler = (...args: unknown[]) => void;
type SocketPayload = Record<string, unknown>;

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

const numberList = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];

const asPayload = (value: unknown): SocketPayload =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as SocketPayload : {};

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

    const parseMessage = (payload: unknown, fallbackRoomId?: number): ChatMessage | null => {
      const data = asPayload(payload);
      const msg: ChatMessage = {
        id: typeof data.id === 'number' ? data.id : undefined,
        room_id: Number(data.room_id ?? fallbackRoomId ?? 0),
        sender_user_id: Number(data.sender_user_id ?? data.user_id),
        receiver_user_id: data.receiver_user_id !== undefined ? Number(data.receiver_user_id) : undefined,
        user_id: data.user_id !== undefined ? Number(data.user_id) : undefined,
        username: data.username !== undefined ? String(data.username) : undefined,
        content: String(data.content ?? ''),
        created_at: data.created_at !== undefined ? String(data.created_at) : undefined,
        timestamp: data.timestamp !== undefined ? String(data.timestamp) : undefined,
      };
      return Number.isFinite(msg.sender_user_id) && msg.content ? msg : null;
    };

    const handleJoined: EventHandler = (payload) => {
      const data = asPayload(payload);
      setRoomMembers(numberList(data.room_members));
      setMemberEvent(null);
      setLastMessage(null);
    };

    const handleMessage: EventHandler = (payload) => {
      const msg = parseMessage(payload);
      if (msg && Number.isFinite(msg.room_id)) {
        setMessages(prev => [...prev, msg]);
        setLastMessage(msg);
      }
    };

    const handleDmMessage: EventHandler = (payload) => {
      const msg = parseMessage(payload, roomId);
      if (!msg) return;
      if (dmUserId) {
        const matchesPartner = msg.sender_user_id === dmUserId || msg.receiver_user_id === dmUserId;
        if (!matchesPartner) return;
      }
      setMessages(prev => [...prev, msg]);
      setLastMessage(msg);
    };

    const parseMemberEvent = (payload: unknown, type: 'joined' | 'left'): ChatMemberEvent => {
      const data = asPayload(payload);
      return {
        room_id: Number(data.room_id),
        user_id: Number(data.user_id),
        username: data.username !== undefined ? String(data.username) : undefined,
        type,
        reason: data.reason !== undefined ? String(data.reason) : undefined,
        timestamp: data.timestamp !== undefined ? String(data.timestamp) : undefined,
      };
    };

    const handleUserJoined: EventHandler = (payload) => {
      setRoomMembers(numberList(asPayload(payload).room_members));
      setMemberEvent(parseMemberEvent(payload, 'joined'));
    };

    const handleUserLeft: EventHandler = (payload) => {
      setRoomMembers(numberList(asPayload(payload).room_members));
      setMemberEvent(parseMemberEvent(payload, 'left'));
    };

    const handleTyping: EventHandler = (payload) => {
      const data = asPayload(payload);
      const fromUserId = Number(data.user_id ?? data.from_user_id);
      if (!Number.isFinite(fromUserId) || fromUserId <= 0) return;
      const myId = Number(localStorage.getItem('user_id') ?? '0');
      if (fromUserId === myId) return;
      setTypingEvent({
        from_user_id: fromUserId,
        username: data.username !== undefined ? String(data.username) : undefined,
        room_id: data.room_id !== undefined ? Number(data.room_id) : undefined,
        timestamp: Date.now(),
      });
    };

    const handleRead: EventHandler = (payload) => {
      const data = asPayload(payload);
      const readerUserId = Number(data.reader_user_id);
      if (!Number.isFinite(readerUserId) || readerUserId <= 0) return;
      const myId = Number(localStorage.getItem('user_id') ?? '0');
      if (readerUserId === myId) return;
      setReadReceipt({
        reader_user_id: readerUserId,
        last_read_at: data.last_read_at == null ? null : String(data.last_read_at),
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
    if (dmUserId) return emit('dm.message', { target_user_id: dmUserId, room_id: roomId, content });
    if (!roomId) return false;
    return emit('chat.message', { room_id: roomId, content });
  }, [roomId, dmUserId, emit]);

  const sendTyping = useCallback(() => {
    if (dmUserId) return emit('dm.typing', { target_user_id: dmUserId });
    if (!roomId) return false;
    return emit('chat.typing', { room_id: roomId });
  }, [roomId, dmUserId, emit]);

  const sendRead = useCallback((lastReadAt?: string | null) => {
    if (!dmUserId) return false;
    return emit('dm.read', { target_user_id: dmUserId, last_read_at: lastReadAt ?? null });
  }, [dmUserId, emit]);

  const joinRoom = useCallback(() => {
    if (dmUserId) return emit('dm.join', { target_user_id: dmUserId, room_id: roomId });
    if (!roomId) return false;
    return emit('chat.join', { room_id: roomId });
  }, [roomId, dmUserId, emit]);

  const leaveRoom = useCallback(() => {
    const sent = dmUserId
      ? emit('dm.leave', { target_user_id: dmUserId, room_id: roomId })
      : roomId ? emit('chat.leave', { room_id: roomId }) : false;
    setMessages([]);
    setRoomMembers([]);
    return sent;
  }, [roomId, dmUserId, emit]);

  return { socket, connected, error, messages, roomMembers, memberEvent, lastMessage, typingEvent, readReceipt, sendMessage, sendTyping, sendRead, joinRoom, leaveRoom };
}
