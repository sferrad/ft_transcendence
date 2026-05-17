import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import type { RoomOut, MessageOut } from "../../profile/types";
import { createRoom, deleteRoom, getRoomMembers, getRooms, inviteToRoom, joinRoom } from "../api";

interface UseChatActionsParams {
    token: string | null;
    t: TFunction;
    currentUserId: number;
    selectedRoomId: number | null;
    selectedRoom: RoomOut | null;
    isSelectedRoomDm: boolean;
    messageText: string;
    roomName: string;
    groupName: string;
    groupSelectedFriends: Set<number>;
    isCreatingGroup: boolean;
    isInvitingMember: boolean;
    dmRooms: RoomOut[];
    membersLoadedRoomIdRef: MutableRefObject<number | null>;
    lastTypingSentRef: MutableRefObject<number>;
    sendWsMessage: (content: string) => void;
    sendWsTyping: () => void;
    joinWsRoom: () => void;
    leaveWsRoom: () => boolean;
    getDmOtherUserId: (room: RoomOut) => number | null;
    refreshRooms: () => Promise<void>;
    setRoomName: Dispatch<SetStateAction<string>>;
    setMessageText: Dispatch<SetStateAction<string>>;
    setStatus: Dispatch<SetStateAction<string | null>>;
    setIsCreatingRoom: Dispatch<SetStateAction<boolean>>;
    setIsSubmittingMessage: Dispatch<SetStateAction<boolean>>;
    setRoomMemberIds: Dispatch<SetStateAction<number[]>>;
    setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
    setMessages: Dispatch<SetStateAction<MessageOut[]>>;
    setMemberIds: Dispatch<SetStateAction<number[]>>;
    setSystemEvents: Dispatch<SetStateAction<Array<{ id: string; text: string }>>>;
    setIsNewDmOpen: Dispatch<SetStateAction<boolean>>;
    setGroupName: Dispatch<SetStateAction<string>>;
    setGroupSelectedFriends: Dispatch<SetStateAction<Set<number>>>;
    setIsCreateGroupOpen: Dispatch<SetStateAction<boolean>>;
    setIsChannelsOpen: Dispatch<SetStateAction<boolean>>;
    setIsCreatingGroup: Dispatch<SetStateAction<boolean>>;
    setIsInviteMemberOpen: Dispatch<SetStateAction<boolean>>;
    setIsInvitingMember: Dispatch<SetStateAction<boolean>>;
}

export function useChatActions({
    token,
    t,
    currentUserId,
    selectedRoomId,
    selectedRoom,
    isSelectedRoomDm,
    messageText,
    roomName,
    groupName,
    groupSelectedFriends,
    isCreatingGroup,
    isInvitingMember,
    dmRooms,
    membersLoadedRoomIdRef,
    lastTypingSentRef,
    sendWsMessage,
    sendWsTyping,
    joinWsRoom,
    leaveWsRoom,
    getDmOtherUserId,
    refreshRooms,
    setRoomName,
    setMessageText,
    setStatus,
    setIsCreatingRoom,
    setIsSubmittingMessage,
    setRoomMemberIds,
    setSelectedRoomId,
    setMessages,
    setMemberIds,
    setSystemEvents,
    setIsNewDmOpen,
    setGroupName,
    setGroupSelectedFriends,
    setIsCreateGroupOpen,
    setIsChannelsOpen,
    setIsCreatingGroup,
    setIsInviteMemberOpen,
    setIsInvitingMember,
}: UseChatActionsParams) {
    const handleCreateRoom = async () => {
        if (!token) return;
        if (!roomName.trim()) {
            setStatus("Room name is required");
            return;
        }
        try {
            setIsCreatingRoom(true);
            const room = await createRoom(token, { name: roomName.trim(), is_private: false });
            setRoomName("");
            setSelectedRoomId(room.id);
            setIsChannelsOpen(false);
            setStatus(null);
            await refreshRooms();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to create room"));
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!token || selectedRoomId == null || isSelectedRoomDm) return;
        try {
            await joinRoom(token, selectedRoomId);
            joinWsRoom();
            const ids = await getRoomMembers(token, selectedRoomId);
            setRoomMemberIds(ids);
            membersLoadedRoomIdRef.current = selectedRoomId;
            setStatus(null);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to join room"));
        }
    };

    const handleSendMessage = async () => {
        if (!token || selectedRoomId == null) return;
        if (!messageText.trim()) return;
        try {
            setIsSubmittingMessage(true);
            sendWsMessage(messageText.trim());
            setMessageText("");
            setStatus(null);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to send message"));
        } finally {
            setIsSubmittingMessage(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (!token || selectedRoomId == null || isSelectedRoomDm) return;
        try {
            const left = leaveWsRoom();
            if (!left) {
                setStatus(t("Unable to leave room"));
                return;
            }
            setStatus(null);
            setRoomMemberIds((prev) => prev.filter((id) => id !== currentUserId));
            setSelectedRoomId(null);
            setMessages([]);
            setMemberIds([]);
            setRoomMemberIds([]);
            setSystemEvents([]);
            await refreshRooms();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to leave room"));
        }
    };

    const handleDeleteRoom = async () => {
        if (!token || selectedRoomId == null) return;
        if (selectedRoom && getDmOtherUserId(selectedRoom)) {
            setStatus(t("This private channel cannot be deleted"));
            return;
        }
        try {
            await deleteRoom(token, selectedRoomId);
            setStatus(null);
            setSelectedRoomId(null);
            setMessages([]);
            setMemberIds([]);
            setSystemEvents([]);
            await refreshRooms();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to delete room"));
        }
    };

    const handleStartDm = async (friendId: number) => {
        if (!token || !currentUserId) return;
        const existing = dmRooms.find((r) => getDmOtherUserId(r) === friendId);
        if (existing) {
            setSelectedRoomId(existing.id);
            setIsNewDmOpen(false);
            return;
        }
        try {
            const ids = [currentUserId, friendId].sort((a, b) => a - b);
            const name = `dm-${ids[0]}-${ids[1]}`;
            let room: RoomOut;
            try {
                room = await createRoom(token, { name, is_private: true });
            } catch {
                const freshRooms = await getRooms(token);
                const found = freshRooms.find((r) => r.name === name);
                if (!found) {
                    setStatus(t("Failed to start conversation"));
                    return;
                }
                room = found;
            }
            await refreshRooms();
            setSelectedRoomId(room.id);
            setIsNewDmOpen(false);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to start conversation"));
        }
    };

    const handleCreateGroup = async () => {
        if (!token || !groupName.trim() || isCreatingGroup) return;
        setIsCreatingGroup(true);
        try {
            const room = await createRoom(token, { name: groupName.trim(), is_private: true });
            await Promise.all(Array.from(groupSelectedFriends).map((fid) => inviteToRoom(token, room.id, fid).catch(() => undefined)));
            setGroupName("");
            setGroupSelectedFriends(new Set());
            setIsCreateGroupOpen(false);
            setIsChannelsOpen(false);
            await refreshRooms();
            setSelectedRoomId(room.id);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to create group"));
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleInviteMember = async (friendId: number) => {
        if (!token || !selectedRoomId || isInvitingMember) return;
        setIsInvitingMember(true);
        try {
            await inviteToRoom(token, selectedRoomId, friendId);
            setIsInviteMemberOpen(false);
            await refreshRooms();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to invite member"));
        } finally {
            setIsInvitingMember(false);
        }
    };

    const handleTypingPing = useCallback(() => {
        const now = Date.now();
        if (now - lastTypingSentRef.current < 1500) return;
        lastTypingSentRef.current = now;
        sendWsTyping();
    }, [sendWsTyping, lastTypingSentRef]);

    return {
        handleCreateRoom,
        handleJoinRoom,
        handleSendMessage,
        handleLeaveRoom,
        handleDeleteRoom,
        handleStartDm,
        handleCreateGroup,
        handleInviteMember,
        handleTypingPing,
    };
}
