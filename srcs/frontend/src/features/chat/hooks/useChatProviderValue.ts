import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MessageOut, ProfileOut, RoomOut } from "../../profile/types";
import { getRooms } from "../api";
import { useChatWebSocket } from "../../../hooks/useWebSocket";
import { useChatNotifications } from "../../../hooks/useChatNotifications";
import { useChatInvite } from "./useChatInvite";
import { useChatActions } from "./useChatActions";
import { useChatRealtimeEffects } from "./useChatRealtimeEffects";

interface GroupedMessage {
    dateKey: string;
    dateLabel: string;
    messages: Array<{ msg: MessageOut; idx: number }>;
}

interface UseChatProviderValueParams {
    initialRoomId?: number | null;
    initialDmUserId?: number | null;
}

export function useChatProviderValue({ initialRoomId = null, initialDmUserId = null }: UseChatProviderValueParams) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [rooms, setRooms] = useState<RoomOut[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [messages, setMessages] = useState<MessageOut[]>([]);
    const [roomName, setRoomName] = useState("");
    const [messageText, setMessageText] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Record<number, ProfileOut>>({});
    const [avatarBlobs, setAvatarBlobs] = useState<Record<number, string>>({});
    const [memberIds, setMemberIds] = useState<number[]>([]);
    const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());
    const [roomMemberIds, setRoomMemberIds] = useState<number[]>([]);
    const [systemEvents, setSystemEvents] = useState<Array<{ id: string; text: string }>>([]);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupSelectedFriends, setGroupSelectedFriends] = useState<Set<number>>(new Set());
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isInvitingMember, setIsInvitingMember] = useState(false);
    const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
    const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
    const [isChannelsOpen, setIsChannelsOpen] = useState(false);
    const [typingUser, setTypingUser] = useState<{ userId: number; username?: string } | null>(null);
    const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);
    const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());
    const [allFriendIds, setAllFriendIds] = useState<number[]>([]);
    const [isNewDmOpen, setIsNewDmOpen] = useState(false);

    const avatarBlobsRef = useRef<Record<number, string>>({});
    const seenMemberEventRef = useRef<Set<string>>(new Set());
    const membersLoadedRoomIdRef = useRef<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const lastTypingSentRef = useRef<number>(0);
    const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const token = localStorage.getItem("access_token");
    const currentUserId = Number(localStorage.getItem("user_id") ?? "0");

    const refreshRooms = useCallback(async () => {
        if (!token) return;
        const data = await getRooms(token);
        setRooms(data);
    }, [token]);

    const parseDmPairFromRoomName = (name: string): [number, number] | null => {
        const match = /^dm-(\d+)-(\d+)$/.exec(name.trim());
        if (!match) return null;
        const a = Number(match[1]);
        const b = Number(match[2]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
        return [a, b];
    };

    const getDmOtherUserId = useCallback((room: RoomOut): number | null => {
        if (!room.is_private) return null;
        const pair = parseDmPairFromRoomName(room.name);
        if (!pair) return null;
        const [a, b] = pair;
        if (currentUserId === a) return b;
        if (currentUserId === b) return a;
        return null;
    }, [currentUserId]);

    const getRoomDisplayName = useCallback((room: RoomOut): string => {
        const otherUserId = getDmOtherUserId(room);
        if (!otherUserId) return room.name;
        const partner = profiles[otherUserId];
        return partner?.display_name?.trim() || "Direct message";
    }, [getDmOtherUserId, profiles]);

    const visibleRooms = useMemo(() => {
        return rooms.filter((room) => {
            if (!room.is_private) return true;
            const pair = parseDmPairFromRoomName(room.name);
            if (!pair) return true;
            const [a, b] = pair;
            return currentUserId > 0 && (currentUserId === a || currentUserId === b);
        });
    }, [rooms, currentUserId]);

    const selectedRoom = useMemo(
        () => visibleRooms.find((room) => room.id === selectedRoomId) ?? null,
        [visibleRooms, selectedRoomId]
    );

    const selectedDmUserId = useMemo(
        () => (selectedRoom ? getDmOtherUserId(selectedRoom) : null),
        [selectedRoom, getDmOtherUserId]
    );
    const isSelectedRoomDm = Boolean(selectedRoom && selectedDmUserId);

    const {
        roomMembers: wsRoomMembers,
        memberEvent: wsMemberEvent,
        lastMessage: wsLastMessage,
        connected: wsConnected,
        error: wsError,
        typingEvent: wsTypingEvent,
        readReceipt: wsReadReceipt,
        sendMessage: sendWsMessage,
        sendTyping: sendWsTyping,
        sendRead: sendWsRead,
        joinRoom: joinWsRoom,
        leaveRoom: leaveWsRoom,
    } = useChatWebSocket(selectedRoomId ?? undefined, selectedDmUserId ?? undefined);

    const { unreadRoomIds, hasUnread, lastMessageByRoomId } = useChatNotifications({
        enabled: Boolean(token),
        rooms: visibleRooms,
    });

    const invite = useChatInvite({
        token,
        currentUserId,
        isSelectedRoomDm,
        selectedDmUserId,
        profiles,
        sendWsMessage,
    });

    const { unreadRoomIds: unreadRoomIdsRaw, hasUnread: hasUnreadRaw, lastMessageByRoomId: lastMessageByRoomIdRaw } = {
        unreadRoomIds,
        hasUnread,
        lastMessageByRoomId,
    };

    const orderedRooms = useMemo(() => {
        const fallbackTimestamp = (room: RoomOut) => {
            const parsed = room.created_at ? Date.parse(room.created_at) : NaN;
            return Number.isFinite(parsed) ? parsed : 0;
        };
        return [...visibleRooms].sort((a, b) => {
            const aTimestamp = lastMessageByRoomId[a.id] ?? fallbackTimestamp(a);
            const bTimestamp = lastMessageByRoomId[b.id] ?? fallbackTimestamp(b);
            if (aTimestamp === bTimestamp) return b.id - a.id;
            return bTimestamp - aTimestamp;
        });
    }, [visibleRooms, lastMessageByRoomId]);

    const dmRooms = useMemo(() => orderedRooms.filter((r) => Boolean(getDmOtherUserId(r))), [orderedRooms, getDmOtherUserId]);
    const publicChannels = useMemo(() => orderedRooms.filter((r) => !r.is_private && !getDmOtherUserId(r)), [orderedRooms, getDmOtherUserId]);
    const privateGroups = useMemo(() => orderedRooms.filter((r) => r.is_private && !getDmOtherUserId(r)), [orderedRooms, getDmOtherUserId]);
    const dmUserIds = useMemo(() => new Set(dmRooms.map((r) => getDmOtherUserId(r)).filter(Boolean) as number[]), [dmRooms, getDmOtherUserId]);
    const friendsWithoutDm = useMemo(() => allFriendIds.filter((id) => !dmUserIds.has(id)), [allFriendIds, dmUserIds]);

    const isMember = useMemo(() => {
        if (isSelectedRoomDm) return true;
        if (!selectedRoomId || currentUserId <= 0) return false;
        return roomMemberIds.includes(currentUserId);
    }, [selectedRoomId, currentUserId, roomMemberIds, isSelectedRoomDm]);

    const resolveAvatarUrl = (avatarUrl: string | null | undefined) => {
        if (!avatarUrl) return null;
        return avatarUrl.startsWith("/profile/") ? `/api${avatarUrl}` : avatarUrl;
    };

    useChatRealtimeEffects({
        token,
        t,
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
    });

    const {
        handleCreateRoom,
        handleJoinRoom,
        handleSendMessage,
        handleLeaveRoom,
        handleDeleteRoom,
        handleStartDm,
        handleCreateGroup,
        handleInviteMember,
        handleTypingPing,
    } = useChatActions({
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
    });

    const isOwner = Boolean(selectedRoom && currentUserId > 0 && selectedRoom.owner_user_id === currentUserId);

    const formatMsgTime = (iso: string | null): string => {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDateSep = (iso: string | null): string => {
        if (!iso) return "";
        const d = new Date(iso);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return t("Today", "Today");
        if (d.toDateString() === yesterday.toDateString()) return t("Yesterday", "Yesterday");
        return d.toLocaleDateString();
    };

    const handleAvatarError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        event.currentTarget.src = "/assets/default-profile.jpg";
    };

    const openProfile = (userId: number) => {
        navigate(`/profile?userId=${encodeURIComponent(String(userId))}`);
    };

    const renderAvatar = (userId: number) => {
        const profile = profiles[userId];
        const resolvedAvatarUrl = resolveAvatarUrl(profile?.avatar_url ?? null);
        return avatarBlobs[userId] || (resolvedAvatarUrl && !resolvedAvatarUrl.startsWith("/api/") ? resolvedAvatarUrl : "/assets/default-profile.jpg");
    };

    const groupedMessages = useMemo(() => {
        const groups: GroupedMessage[] = [];
        messages.forEach((msg, idx) => {
            if (blockedIds.has(msg.sender_user_id)) return;
            const dateLabel = formatDateSep(msg.created_at ?? null);
            const dateKey = msg.created_at ? new Date(msg.created_at).toDateString() : `idx-${idx}`;
            const lastGroup = groups[groups.length - 1];
            if (!lastGroup || lastGroup.dateKey !== dateKey) {
                groups.push({ dateKey, dateLabel, messages: [{ msg, idx }] });
            } else {
                lastGroup.messages.push({ msg, idx });
            }
        });
        return groups;
    }, [messages, blockedIds]);

    return {
        token,
        currentUserId,
        rooms,
        visibleRooms,
        publicChannels,
        privateGroups,
        dmRooms,
        selectedRoomId,
        setSelectedRoomId,
        selectedRoom,
        selectedDmUserId,
        isSelectedRoomDm,
        isMember,
        isOwner,
        messages,
        groupedMessages,
        systemEvents,
        profiles,
        avatarBlobs,
        onlineIds,
        allFriendIds,
        friendsWithoutDm,
        blockedIds,
        memberIds,
        roomMemberIds,
        status,
        isCreatingRoom,
        isCreateFormOpen,
        setIsCreateFormOpen,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        roomName,
        setRoomName,
        groupName,
        setGroupName,
        groupSelectedFriends,
        setGroupSelectedFriends,
        isCreatingGroup,
        isInvitingMember,
        isInviteMemberOpen,
        setIsInviteMemberOpen,
        isSubmittingMessage,
        isChannelsOpen,
        setIsChannelsOpen,
        isNewDmOpen,
        setIsNewDmOpen,
        messageText,
        setMessageText,
        typingUser,
        partnerLastReadAt,
        unreadRoomIds: unreadRoomIdsRaw,
        hasUnread: hasUnreadRaw,
        lastMessageByRoomId: lastMessageByRoomIdRaw,
        messageEndRef,
        getDmOtherUserId,
        getRoomDisplayName,
        renderAvatar,
        handleAvatarError,
        formatMsgTime,
        formatDateSep,
        openProfile,
        handleCreateRoom,
        handleJoinRoom,
        handleSendMessage,
        handleLeaveRoom,
        handleDeleteRoom,
        handleStartDm,
        handleCreateGroup,
        handleInviteMember,
        handleTypingPing,
        invite,
    };
}
