import { useCallback, useEffect, useMemo, useState } from "react";
import type { MessageOut, RoomOut } from "../Profile/types";
import { getMessages, getRoomMembers, getRooms } from "../Profile/api/chat";

type UseChatNotificationsOptions = {
    enabled?: boolean;
    pollIntervalMs?: number;
    rooms?: RoomOut[];
};

type UnreadState = {
    hasUnread: boolean;
    unreadCount: number;
    unreadRoomIds: number[];
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

const getMessageTimestamp = (message: MessageOut) => {
    const timestamp = message.created_at ? Date.parse(message.created_at) : NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const findLatestMessage = (messages: MessageOut[]) => {
    let latest: MessageOut | null = null;
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
    const { enabled = true, pollIntervalMs = 12000, rooms: providedRooms } = options;
    const [unreadRoomIds, setUnreadRoomIds] = useState<number[]>([]);

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
                    return { room, isMember: true };
                }
                try {
                    const members = await getRoomMembers(token, room.id);
                    return { room, isMember: members.includes(currentUserId) };
                } catch {
                    return { room, isMember: false };
                }
            })
        );

        const memberRooms = memberChecks.filter((entry) => entry.isMember).map((entry) => entry.room);
        const unreadCandidates = await Promise.all(
            memberRooms.map(async (room) => {
                try {
                    const messages = await getMessages(token, room.id);
                    if (!messages.length) return null;

                    const latest = findLatestMessage(messages);
                    if (!latest) return null;

                    if (latest.sender_user_id === currentUserId) return null;

                    const latestTimestamp = getMessageTimestamp(latest);
                    if (!latestTimestamp) return null;

                    const lastSeen = readLastSeen(room.id);
                    if (latestTimestamp > lastSeen) return room.id;
                } catch {
                    return null;
                }
                return null;
            })
        );

        const unreadRoomIds = unreadCandidates.filter((id): id is number => typeof id === "number");
        setUnreadRoomIds(unreadRoomIds);
    }, [currentUserId, enabled, providedRooms, token]);

    useEffect(() => {
        let mounted = true;

        const runRefresh = async () => {
            if (!mounted) return;
            try {
                await refreshUnread();
            } catch {
                // ignore refresh errors
            }
        };

        runRefresh();

        if (!enabled) return () => undefined;

        const intervalId = window.setInterval(runRefresh, pollIntervalMs);
        return () => {
            mounted = false;
            window.clearInterval(intervalId);
        };
    }, [enabled, pollIntervalMs, refreshUnread]);

    const unreadCount = unreadRoomIds.length;
    const hasUnread = unreadCount > 0;

    return useMemo(
        () => ({ hasUnread, unreadCount, unreadRoomIds }),
        [hasUnread, unreadCount, unreadRoomIds]
    );
}
