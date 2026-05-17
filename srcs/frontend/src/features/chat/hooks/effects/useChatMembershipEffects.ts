import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { getRoomMembers, joinRoom } from "../../api";

interface UseChatMembershipEffectsParams {
    token: string | null;
    currentUserId: number;
    selectedRoomId: number | null;
    selectedDmUserId: number | null;
    isSelectedRoomDm: boolean;
    wsConnected: boolean;
    roomMemberIds: number[];
    membersLoadedRoomIdRef: MutableRefObject<number | null>;
    joinWsRoom: () => boolean;
    setStatus: Dispatch<SetStateAction<string | null>>;
    setRoomMemberIds: Dispatch<SetStateAction<number[]>>;
    setMemberIds: Dispatch<SetStateAction<number[]>>;
}

export function useChatMembershipEffects({
    token,
    currentUserId,
    selectedRoomId,
    selectedDmUserId,
    isSelectedRoomDm,
    wsConnected,
    roomMemberIds,
    membersLoadedRoomIdRef,
    joinWsRoom,
    setStatus,
    setRoomMemberIds,
    setMemberIds,
}: UseChatMembershipEffectsParams) {
    useEffect(() => {
        if (!token || selectedRoomId == null || isSelectedRoomDm) return;
        getRoomMembers(token, selectedRoomId)
            .then((ids) => {
                setRoomMemberIds(ids);
                membersLoadedRoomIdRef.current = selectedRoomId;
                if (ids.includes(currentUserId) && wsConnected) joinWsRoom();
            })
            .catch(() => {
                setRoomMemberIds([]);
                setStatus(null);
                membersLoadedRoomIdRef.current = null;
            });
    }, [token, selectedRoomId, isSelectedRoomDm, setRoomMemberIds, membersLoadedRoomIdRef, currentUserId, wsConnected, joinWsRoom, setStatus]);

    useEffect(() => {
        if (!isSelectedRoomDm || selectedRoomId == null) return;
        const ids = [currentUserId, selectedDmUserId ?? 0].filter((id) => Number.isFinite(id) && id > 0);
        setRoomMemberIds(ids);
        setMemberIds(ids);
        membersLoadedRoomIdRef.current = selectedRoomId;
    }, [currentUserId, isSelectedRoomDm, membersLoadedRoomIdRef, selectedDmUserId, selectedRoomId, setMemberIds, setRoomMemberIds]);

    useEffect(() => {
        if (!token || selectedRoomId == null || !isSelectedRoomDm) return;
        joinRoom(token, selectedRoomId).catch(() => undefined);
    }, [token, selectedRoomId, isSelectedRoomDm]);

    useEffect(() => {
        if (!wsConnected || selectedRoomId == null || isSelectedRoomDm) return;
        if (membersLoadedRoomIdRef.current !== selectedRoomId) return;
        if (!roomMemberIds.includes(currentUserId)) return;
        joinWsRoom();
    }, [wsConnected, selectedRoomId, isSelectedRoomDm, membersLoadedRoomIdRef, roomMemberIds, currentUserId, joinWsRoom]);

    useEffect(() => {
        if (!wsConnected || selectedRoomId == null || !isSelectedRoomDm || !selectedDmUserId) return;
        joinWsRoom();
    }, [wsConnected, selectedRoomId, isSelectedRoomDm, selectedDmUserId, joinWsRoom]);
}
