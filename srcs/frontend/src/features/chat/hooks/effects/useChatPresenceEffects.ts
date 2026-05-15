import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { RoomOut, MessageOut } from "../../../profile/types";
import { getFriendsWithStatus, getBlockedIds } from "../../../profile/api/friends";
import { getSocket } from "../../../../hooks/socketSingleton";

interface UseChatPresenceEffectsParams {
    token: string | null;
    initialRoomId: number | null;
    initialDmUserId: number | null;
    selectedRoomId: number | null;
    visibleRooms: RoomOut[];
    refreshRooms: () => Promise<void>;
    getDmOtherUserId: (room: RoomOut) => number | null;
    membersLoadedRoomIdRef: MutableRefObject<number | null>;
    setOnlineIds: Dispatch<SetStateAction<Set<number>>>;
    setAllFriendIds: Dispatch<SetStateAction<number[]>>;
    setBlockedIds: Dispatch<SetStateAction<Set<number>>>;
    setStatus: Dispatch<SetStateAction<string | null>>;
    setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
    setMessages: Dispatch<SetStateAction<MessageOut[]>>;
    setMemberIds: Dispatch<SetStateAction<number[]>>;
    setRoomMemberIds: Dispatch<SetStateAction<number[]>>;
    setSystemEvents: Dispatch<SetStateAction<Array<{ id: string; text: string }>>>;
}

export function useChatPresenceEffects({
    token,
    initialRoomId,
    initialDmUserId,
    selectedRoomId,
    visibleRooms,
    refreshRooms,
    getDmOtherUserId,
    membersLoadedRoomIdRef,
    setOnlineIds,
    setAllFriendIds,
    setBlockedIds,
    setStatus,
    setSelectedRoomId,
    setMessages,
    setMemberIds,
    setRoomMemberIds,
    setSystemEvents,
}: UseChatPresenceEffectsParams) {
    useEffect(() => {
        if (!token) return;
        const fetchOnline = () => {
            getFriendsWithStatus(token)
                .then((friends) => {
                    const ids = new Set(friends.filter((f) => f.online).map((f) => f.friend_id));
                    setOnlineIds(ids);
                    setAllFriendIds(friends.map((f) => f.friend_id));
                })
                .catch(() => undefined);
        };
        fetchOnline();
        const intervalId = window.setInterval(fetchOnline, 30000);
        return () => window.clearInterval(intervalId);
    }, [setAllFriendIds, setOnlineIds, token]);

    useEffect(() => {
        if (!token) {
            setStatus("Missing access token");
            return;
        }
        refreshRooms().catch((error) => setStatus(error instanceof Error ? error.message : "Failed to fetch rooms"));
        getBlockedIds(token).then((ids) => setBlockedIds(new Set(ids))).catch(() => undefined);

        const sock = getSocket();
        if (!sock) return;
        const onJoined = () => refreshRooms().catch(() => undefined);
        const onLeft = () => refreshRooms().catch(() => undefined);
        sock.on("chat.joined", onJoined);
        sock.on("chat.left", onLeft);
        return () => {
            sock.off("chat.joined", onJoined);
            sock.off("chat.left", onLeft);
        };
    }, [refreshRooms, setBlockedIds, setStatus, token]);

    useEffect(() => {
        if (!initialRoomId || selectedRoomId != null || visibleRooms.length === 0) return;
        const exists = visibleRooms.some((room) => room.id === initialRoomId);
        if (exists) setSelectedRoomId(initialRoomId);
    }, [initialRoomId, selectedRoomId, setSelectedRoomId, visibleRooms]);

    useEffect(() => {
        if (!initialDmUserId || selectedRoomId != null || visibleRooms.length === 0) return;
        const dmRoom = visibleRooms.find((room) => getDmOtherUserId(room) === initialDmUserId);
        if (dmRoom) setSelectedRoomId(dmRoom.id);
    }, [getDmOtherUserId, initialDmUserId, selectedRoomId, setSelectedRoomId, visibleRooms]);

    useEffect(() => {
        if (selectedRoomId == null) return;
        const stillVisible = visibleRooms.some((room) => room.id === selectedRoomId);
        if (stillVisible) return;
        setSelectedRoomId(null);
        setMessages([]);
        setMemberIds([]);
        setRoomMemberIds([]);
        setSystemEvents([]);
    }, [selectedRoomId, setMemberIds, setMessages, setRoomMemberIds, setSelectedRoomId, setSystemEvents, visibleRooms]);

    useEffect(() => {
        if (selectedRoomId == null) return;
        setSystemEvents([]);
        setRoomMemberIds([]);
        setMemberIds([]);
        membersLoadedRoomIdRef.current = null;
    }, [membersLoadedRoomIdRef, selectedRoomId, setMemberIds, setRoomMemberIds, setSystemEvents]);
}
