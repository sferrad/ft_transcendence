import { useCallback, useEffect, useMemo, useState } from "react";
import type { MessageOut, PrivateMessageOut, RoomOut } from "../Profile/types";
import { getMessages, getPrivateMessages, getRoomMembers, getRooms } from "../Profile/api/chat";
import { getSocket } from "./socketSingleton";

type UseChatNotificationsOptions = {
    enabled?: boolean;
    rooms?: RoomOut[];
};

type UnreadState = {
    hasUnread: boolean;
    unreadCount: number;
    unreadRoomIds: number[];
    lastMessageByRoomId: Record<number, number>;
};

const lastSeenKey = (roomId: number) => `chat:lastSeen:${roomId}`;

const readLastSeen = (roomId: number) => {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(lastSeenKey(roomId));
    const value = Number(raw ?? "0");
    return Number.isFinite(value) ? value : 0;
};

export const setRoomLastSeen = (roomId: number, timestamp: number) => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(roomId) || roomId <= 0) return;
    const safeTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now();
    localStorage.setItem(lastSeenKey(roomId), String(safeTimestamp));
};

const parseDmPairFromRoomName = (roomName: string): [number, number] | null => {
    const match = /^dm-(\d+)-(\d+)$/.exec(roomName.trim());
    if (!match) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
    return [a, b];
};

const isRoomVisibleToUser = (room: RoomOut, currentUserId: number) => {
    if (!room.is_private) return true;
    const pair = parseDmPairFromRoomName(room.name);
    if (!pair) return true;
    const [a, b] = pair;
    return currentUserId > 0 && (currentUserId === a || currentUserId === b);
};

const isDmRoomForUser = (room: RoomOut, currentUserId: number) => {
    if (!room.is_private) return false;
    const pair = parseDmPairFromRoomName(room.name);
    if (!pair) return false;
    const [a, b] = pair;
    return currentUserId > 0 && (currentUserId === a || currentUserId === b);
};

const getDmOtherUserId = (room: RoomOut, currentUserId: number): number | null => {
    const pair = parseDmPairFromRoomName(room.name);
    if (!pair) return null;
    const [a, b] = pair;
    if (currentUserId === a) return b;
    if (currentUserId === b) return a;
    return null;
};

type MessageLike = {
    sender_user_id: number;
    created_at?: string | null;
};

const getMessageTimestamp = (message: MessageLike) => {
    const timestamp = message.created_at ? Date.parse(message.created_at) : NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const findLatestMessage = (messages: MessageLike[]): MessageLike | null => {
    let latest: MessageLike | null = null;
    let latestTimestamp = 0;

    messages.forEach((message) => {
        const timestamp = getMessageTimestamp(message);
        if (timestamp >= latestTimestamp) {
            latest = message;
            latestTimestamp = timestamp;
        }
    });

    return latest;
};

export function useChatNotifications(options: UseChatNotificationsOptions = {}): UnreadState {
    const { enabled = true, rooms: providedRooms } = options;
    const [unreadRoomIds, setUnreadRoomIds] = useState<number[]>([]);
    const [lastMessageByRoomId, setLastMessageByRoomId] = useState<Record<number, number>>({});

    const token = typeof window === "undefined" ? null : localStorage.getItem("access_token");
    const currentUserId = typeof window === "undefined" ? 0 : Number(localStorage.getItem("user_id") ?? "0");

    const refreshUnread = useCallback(async () => {
        if (!enabled || !token || currentUserId <= 0) {
            setUnreadRoomIds([]);
            return;
        }

        const rooms = providedRooms ?? (await getRooms(token));
        const visibleRooms = rooms.filter((room) => isRoomVisibleToUser(room, currentUserId));

        const memberChecks = await Promise.all(
            visibleRooms.map(async (room) => {
                if (isDmRoomForUser(room, currentUserId)) {
                    const otherUserId = getDmOtherUserId(room, currentUserId);
                    return { room, isMember: true, dmUserId: otherUserId };
                }
                try {
                    const members = await getRoomMembers(token, room.id);
                    return { room, isMember: members.includes(currentUserId), dmUserId: null };
                } catch {
                    return { room, isMember: false, dmUserId: null };
                }
            })
        );

        const memberRooms = memberChecks.filter((entry) => entry.isMember);
        const nextLastMessageByRoomId: Record<number, number> = {};
        const unreadCandidates = await Promise.all(
            memberRooms.map(async (entry) => {
                try {
                    const isDmRoom = isDmRoomForUser(entry.room, currentUserId);
                    const messages: Array<MessageOut | PrivateMessageOut> = isDmRoom && entry.dmUserId
                        ? await getPrivateMessages(token, entry.dmUserId)
                        : await getMessages(token, entry.room.id);
                    if (!messages.length) return null;

                    const latest = findLatestMessage(messages);
                    if (!latest) return null;

                    const latestTimestamp = getMessageTimestamp(latest);
                    nextLastMessageByRoomId[entry.room.id] = latestTimestamp;
                    if (!latestTimestamp) return null;

                    if (latest.sender_user_id === currentUserId) return null;

                    const lastSeen = readLastSeen(entry.room.id);
                    if (latestTimestamp > lastSeen) return entry.room.id;
                } catch {
                    nextLastMessageByRoomId[entry.room.id] = 0;
                    return null;
                }
                return null;
            })
        );

        const unreadRoomIds = unreadCandidates.filter((id): id is number => typeof id === "number");
        setUnreadRoomIds(unreadRoomIds);
        setLastMessageByRoomId((prev) => ({ ...prev, ...nextLastMessageByRoomId }));
    }, [currentUserId, enabled, providedRooms, token]);

    useEffect(() => {
        if (!enabled) return;
        let mounted = true;

        refreshUnread().catch(() => undefined);

        const sock = getSocket();
        if (!sock) return;

        // Mettre à jour l'état unread en temps réel sur chaque nouveau message.
        const onMessage = (payload: unknown) => {
            const data = payload as { room_id?: number; sender_user_id?: number; created_at?: string };
            if (!mounted || !data?.room_id || data.sender_user_id === currentUserId) return;
            const ts = data.created_at ? Date.parse(data.created_at) : Date.now();
            setLastMessageByRoomId(prev => ({ ...prev, [data.room_id!]: ts }));
            const lastSeen = readLastSeen(data.room_id);
            if (ts > lastSeen) {
                setUnreadRoomIds(prev => prev.includes(data.room_id!) ? prev : [...prev, data.room_id!]);
            }
        };

        sock.on('chat.message', onMessage);
        sock.on('dm.message', onMessage);

        return () => {
            mounted = false;
            sock.off('chat.message', onMessage);
            sock.off('dm.message', onMessage);
        };
    }, [enabled, currentUserId, refreshUnread]);

    const unreadCount = unreadRoomIds.length;
    const hasUnread = unreadCount > 0;

    return useMemo(
        () => ({ hasUnread, unreadCount, unreadRoomIds, lastMessageByRoomId }),
        [hasUnread, unreadCount, unreadRoomIds, lastMessageByRoomId]
    );
}
