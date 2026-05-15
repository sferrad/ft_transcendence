import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import type { ChatMemberEvent, ChatMessage, ReadReceiptEvent, TypingEvent } from "../../../hooks/useWebSocket";
import type { MessageOut, ProfileOut, RoomOut } from "../../profile/types";
import { useChatPresenceEffects } from "./effects/useChatPresenceEffects";
import { useChatProfilesEffects } from "./effects/useChatProfilesEffects";
import { useChatMembershipEffects } from "./effects/useChatMembershipEffects";
import { useChatMessageEffects } from "./effects/useChatMessageEffects";

interface UseChatRealtimeEffectsParams {
    token: string | null;
    t: TFunction;
    currentUserId: number;
    initialRoomId: number | null;
    initialDmUserId: number | null;
    rooms: RoomOut[];
    visibleRooms: RoomOut[];
    selectedRoomId: number | null;
    selectedDmUserId: number | null;
    isSelectedRoomDm: boolean;
    isMember: boolean;
    roomMemberIds: number[];
    allFriendIds: number[];
    profiles: Record<number, ProfileOut>;
    messages: MessageOut[];
    wsRoomMembers: number[];
    wsMemberEvent: ChatMemberEvent | null;
    wsLastMessage: ChatMessage | null;
    wsTypingEvent: TypingEvent | null;
    wsReadReceipt: ReadReceiptEvent | null;
    wsConnected: boolean;
    wsError: Error | null;
    membersLoadedRoomIdRef: MutableRefObject<number | null>;
    seenMemberEventRef: MutableRefObject<Set<string>>;
    typingClearTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    avatarBlobsRef: MutableRefObject<Record<number, string>>;
    messageEndRef: RefObject<HTMLDivElement | null>;
    resolveAvatarUrl: (avatarUrl: string | null | undefined) => string | null;
    getDmOtherUserId: (room: RoomOut) => number | null;
    refreshRooms: () => Promise<void>;
    joinWsRoom: () => boolean;
    sendWsRead: (lastReadAt?: string | null) => boolean;
    setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
    setMessages: Dispatch<SetStateAction<MessageOut[]>>;
    setStatus: Dispatch<SetStateAction<string | null>>;
    setBlockedIds: Dispatch<SetStateAction<Set<number>>>;
    setProfiles: Dispatch<SetStateAction<Record<number, ProfileOut>>>;
    setAvatarBlobs: Dispatch<SetStateAction<Record<number, string>>>;
    setRoomMemberIds: Dispatch<SetStateAction<number[]>>;
    setMemberIds: Dispatch<SetStateAction<number[]>>;
    setSystemEvents: Dispatch<SetStateAction<Array<{ id: string; text: string }>>>;
    setOnlineIds: Dispatch<SetStateAction<Set<number>>>;
    setAllFriendIds: Dispatch<SetStateAction<number[]>>;
    setTypingUser: Dispatch<SetStateAction<{ userId: number; username?: string } | null>>;
    setPartnerLastReadAt: Dispatch<SetStateAction<string | null>>;
}

export function useChatRealtimeEffects(params: UseChatRealtimeEffectsParams) {
    const {
        token,
        currentUserId,
        initialRoomId,
        initialDmUserId,
        rooms,
        visibleRooms,
        selectedRoomId,
        selectedDmUserId,
        isSelectedRoomDm,
        isMember,
        roomMemberIds,
        allFriendIds,
        profiles,
        messages,
        wsRoomMembers,
        wsMemberEvent,
        wsLastMessage,
        wsTypingEvent,
        wsReadReceipt,
        wsConnected,
        wsError,
        membersLoadedRoomIdRef,
        seenMemberEventRef,
        typingClearTimerRef,
        avatarBlobsRef,
        messageEndRef,
        resolveAvatarUrl,
        getDmOtherUserId,
        refreshRooms,
        joinWsRoom,
        sendWsRead,
        setSelectedRoomId,
        setMessages,
        setStatus,
        setBlockedIds,
        setProfiles,
        setAvatarBlobs,
        setRoomMemberIds,
        setMemberIds,
        setSystemEvents,
        setOnlineIds,
        setAllFriendIds,
        setTypingUser,
        setPartnerLastReadAt,
        t,
    } = params;

    useChatPresenceEffects({
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
    });

    const { hydrateProfilesByUserIds } = useChatProfilesEffects({
        token,
        currentUserId,
        rooms,
        allFriendIds,
        messages,
        profiles,
        getDmOtherUserId,
        resolveAvatarUrl,
        avatarBlobsRef,
        setProfiles,
        setAvatarBlobs,
    });

    useChatMembershipEffects({
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
    });

    useChatMessageEffects({
        token,
        t,
        currentUserId,
        selectedRoomId,
        selectedDmUserId,
        isSelectedRoomDm,
        isMember,
        profiles,
        visibleRooms,
        messages,
        wsRoomMembers,
        wsMemberEvent,
        wsLastMessage,
        wsTypingEvent,
        wsReadReceipt,
        wsConnected,
        wsError,
        seenMemberEventRef,
        typingClearTimerRef,
        messageEndRef,
        sendWsRead,
        hydrateProfilesByUserIds,
        setMessages,
        setStatus,
        setMemberIds,
        setSystemEvents,
        setTypingUser,
        setPartnerLastReadAt,
    });
}
