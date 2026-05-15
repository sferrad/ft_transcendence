import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MessageOut, ProfileOut, RoomOut } from "../profile/types";
import { createRoom, deleteRoom, getMessages, getPrivateMessages, getRoomMembers, getRooms, joinRoom, inviteToRoom } from "./api";
import { fetchProfileByUserId } from "../profile/api/profile";
import { useTranslation } from "react-i18next";
import { useChatWebSocket } from "../../hooks/useWebSocket";
import { getSocket } from "../../hooks/socketSingleton";
import { setRoomLastSeen, useChatNotifications } from "../../hooks/useChatNotifications";
import { getFriendsWithStatus, getBlockedIds } from "../profile/api/friends";
import { TYPING_TIMEOUT_MS } from "./types";
import { useChatInvite } from "./hooks/useChatInvite";
import { ChannelsSidebar } from "./components/ChannelsSidebar";
import { DmList } from "./components/DmList";
import { ConversationHeader } from "./components/ConversationHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { SendInviteModal } from "./components/SendInviteModal";
import { AcceptInviteModal } from "./components/AcceptInviteModal";

type ChatButtonProps = {
    initialRoomId?: number | null;
    initialDmUserId?: number | null;
};

export function ChatButton({ initialRoomId = null, initialDmUserId = null }: ChatButtonProps) {
    const navigate = useNavigate();
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

    const avatarBlobsRef = useRef<Record<number, string>>({});
    const seenMemberEventRef = useRef<Set<string>>(new Set());
    const membersLoadedRoomIdRef = useRef<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const lastTypingSentRef = useRef<number>(0);
    const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { t } = useTranslation();

    const token = localStorage.getItem("access_token");
    const currentUserId = Number(localStorage.getItem("user_id") ?? "0");

    const refreshRooms = async () => {
        if (!token) return;
        const data = await getRooms(token);
        setRooms(data);
    };

    const parseDmPairFromRoomName = (roomName: string): [number, number] | null => {
        const match = /^dm-(\d+)-(\d+)$/.exec(roomName.trim());
        if (!match) return null;
        const a = Number(match[1]);
        const b = Number(match[2]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
        return [a, b];
    };

    const getDmOtherUserId = (room: RoomOut): number | null => {
        if (!room.is_private) return null;
        const pair = parseDmPairFromRoomName(room.name);
        if (!pair) return null;
        const [a, b] = pair;
        if (currentUserId === a) return b;
        if (currentUserId === b) return a;
        return null;
    };

    const getRoomDisplayName = (room: RoomOut): string => {
        const otherUserId = getDmOtherUserId(room);
        if (!otherUserId) return room.name;
        const partner = profiles[otherUserId];
        return partner?.display_name?.trim() || "Direct message";
    };

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

    const selectedDmUserId = useMemo(() => (selectedRoom ? getDmOtherUserId(selectedRoom) : null), [selectedRoom]);
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

    const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());
    const [allFriendIds, setAllFriendIds] = useState<number[]>([]);
    const [isNewDmOpen, setIsNewDmOpen] = useState(false);

    const invite = useChatInvite({
        token,
        currentUserId,
        isSelectedRoomDm,
        selectedDmUserId,
        profiles,
        sendWsMessage,
    });

    useEffect(() => {
        if (!token) return;
        const fetchOnline = () => {
            getFriendsWithStatus(token)
                .then((friends) => {
                    const ids = new Set(
                        friends.filter((f) => f.online).map((f) => f.friend_id)
                    );
                    setOnlineIds(ids);
                    setAllFriendIds(friends.map((f) => f.friend_id));
                })
                .catch(() => undefined);
        };
        fetchOnline();
        const intervalId = window.setInterval(fetchOnline, 30000);
        return () => window.clearInterval(intervalId);
    }, [token]);

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

    const dmRooms = useMemo(() => orderedRooms.filter(r => Boolean(getDmOtherUserId(r))), [orderedRooms]);
    // Public channels: is_private=false, not a DM
    const publicChannels = useMemo(() => orderedRooms.filter(r => !r.is_private && !getDmOtherUserId(r)), [orderedRooms]);
    // Private groups: is_private=true, not a DM
    const privateGroups = useMemo(() => orderedRooms.filter(r => r.is_private && !getDmOtherUserId(r)), [orderedRooms]);
    const dmUserIds = useMemo(() => new Set(dmRooms.map(r => getDmOtherUserId(r)).filter(Boolean) as number[]), [dmRooms]);
    const friendsWithoutDm = useMemo(() => allFriendIds.filter(id => !dmUserIds.has(id)), [allFriendIds, dmUserIds]);

    // Hydrate profiles for all friends so names show in new DM picker
    useEffect(() => {
        if (allFriendIds.length === 0) return;
        hydrateProfilesByUserIds(allFriendIds).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allFriendIds]);

    const hydrateProfilesByUserIds = async (userIds: number[]) => {
        if (!token) return {} as Record<number, ProfileOut>;

        const uniqueUserIds = Array.from(new Set(userIds.filter((id) => id > 0)));
        const existing: Record<number, ProfileOut> = {};
        uniqueUserIds.forEach((id) => {
            if (profiles[id]) existing[id] = profiles[id];
        });

        const missing = uniqueUserIds.filter((id) => !profiles[id]);
        if (missing.length === 0) return existing;

        const fetched = await Promise.all(
            missing.map(async (id) => ({ id, profile: await fetchProfileByUserId(token, id) }))
        );

        const fetchedMap: Record<number, ProfileOut> = {};
        fetched.forEach(({ id, profile }) => {
            fetchedMap[id] = profile;
        });

        setProfiles((prev) => ({ ...prev, ...fetchedMap }));
        return { ...existing, ...fetchedMap };
    };


    const hydrateProfiles = async (nextMessages: MessageOut[]) => {
        const uniqueUserIds = Array.from(new Set(nextMessages.map((m) => m.sender_user_id)));
        await hydrateProfilesByUserIds(uniqueUserIds);
    };

    const resolveAvatarUrl = (avatarUrl: string | null | undefined) => {
        if (!avatarUrl) return null;
        return avatarUrl.startsWith("/profile/") ? `/api${avatarUrl}` : avatarUrl;
    };

    const fetchAvatarBlob = async (userId: number, avatarUrl: string) => {
        if (!token) return;
        const response = await fetch(avatarUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setAvatarBlobs((prev) => {
            const previousUrl = prev[userId];
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            const next = { ...prev, [userId]: objectUrl };
            avatarBlobsRef.current = next;
            return next;
        });
    };

    useEffect(() => {
        if (!token) {
            setStatus("Missing access token");
            return;
        }

        refreshRooms().catch((error) => setStatus(error instanceof Error ? error.message : "Failed to fetch rooms"));
        getBlockedIds(token).then(ids => setBlockedIds(new Set(ids))).catch(() => undefined);

        // Rafraîchir la liste des rooms uniquement quand on rejoint/quitte une room.
        const sock = getSocket();
        if (!sock) return;
        const onJoined = () => refreshRooms().catch(() => undefined);
        const onLeft = () => refreshRooms().catch(() => undefined);
        sock.on('chat.joined', onJoined);
        sock.on('chat.left', onLeft);
        return () => {
            sock.off('chat.joined', onJoined);
            sock.off('chat.left', onLeft);
        };
    }, [token]);

    useEffect(() => {
        if (!initialRoomId || selectedRoomId != null || visibleRooms.length === 0) return;
        const exists = visibleRooms.some((room) => room.id === initialRoomId);
        if (exists) setSelectedRoomId(initialRoomId);
    }, [initialRoomId, visibleRooms, selectedRoomId]);

    useEffect(() => {
        if (!initialDmUserId || selectedRoomId != null || visibleRooms.length === 0) return;
        const dmRoom = visibleRooms.find((room) => getDmOtherUserId(room) === initialDmUserId);
        if (dmRoom) setSelectedRoomId(dmRoom.id);
    }, [initialDmUserId, visibleRooms, selectedRoomId]);

    useEffect(() => {
        if (selectedRoomId == null) return;
        const stillVisible = visibleRooms.some((room) => room.id === selectedRoomId);
        if (stillVisible) return;
        setSelectedRoomId(null);
        setMessages([]);
        setMemberIds([]);
        setRoomMemberIds([]);
        setSystemEvents([]);
    }, [visibleRooms, selectedRoomId]);

    useEffect(() => {
        if (selectedRoomId == null) return;
        setSystemEvents([]);
        setRoomMemberIds([]);
        setMemberIds([]);
        membersLoadedRoomIdRef.current = null;
    }, [selectedRoomId]);

    useEffect(() => {
        if (!token || selectedRoomId == null || isSelectedRoomDm) return;
        getRoomMembers(token, selectedRoomId)
            .then((ids) => {
                setRoomMemberIds(ids);
                membersLoadedRoomIdRef.current = selectedRoomId;
                if (ids.includes(currentUserId) && wsConnected) {
                    joinWsRoom();
                }
            })
            .catch(() => {
                setRoomMemberIds([]);
                setStatus(null);
                membersLoadedRoomIdRef.current = null;
            });
    }, [token, selectedRoomId, currentUserId, wsConnected, joinWsRoom, t, isSelectedRoomDm]);

    useEffect(() => {
        if (!isSelectedRoomDm || selectedRoomId == null) return;
        const ids = [currentUserId, selectedDmUserId ?? 0].filter((id) => Number.isFinite(id) && id > 0);
        setRoomMemberIds(ids);
        setMemberIds(ids);
        membersLoadedRoomIdRef.current = selectedRoomId;
    }, [isSelectedRoomDm, selectedRoomId, currentUserId, selectedDmUserId]);

    useEffect(() => {
        if (!token || selectedRoomId == null || !isSelectedRoomDm) return;
        joinRoom(token, selectedRoomId).catch(() => {
            // ignore join errors to keep DM usable
        });
    }, [token, selectedRoomId, isSelectedRoomDm]);

    useEffect(() => {
        if (!wsConnected || selectedRoomId == null || isSelectedRoomDm) return;
        if (membersLoadedRoomIdRef.current !== selectedRoomId) return;
        if (!roomMemberIds.includes(currentUserId)) return;
        joinWsRoom();
    }, [wsConnected, selectedRoomId, roomMemberIds, currentUserId, joinWsRoom, isSelectedRoomDm]);

    useEffect(() => {
        if (!wsConnected || selectedRoomId == null || !isSelectedRoomDm || !selectedDmUserId) return;
        joinWsRoom();
    }, [wsConnected, selectedRoomId, isSelectedRoomDm, selectedDmUserId, joinWsRoom]);

    const isMember = useMemo(() => {
        if (isSelectedRoomDm) return true;
        if (!selectedRoomId || currentUserId <= 0) return false;
        return roomMemberIds.includes(currentUserId);
    }, [selectedRoomId, currentUserId, roomMemberIds, isSelectedRoomDm]);


    useEffect(() => {
        if (!token || selectedRoomId == null) return;
        if (!isMember) {
            setMessages([]);
            return;
        }
        if (isSelectedRoomDm) {
            if (!selectedDmUserId) {
                setMessages([]);
                return;
            }
            getPrivateMessages(token, selectedDmUserId)
                .then((data) =>
                    setMessages(
                        data.map((message) => ({
                            sender_user_id: message.sender_user_id,
                            room_id: selectedRoomId,
                            content: message.content,
                            created_at: message.created_at ?? null,
                        }))
                    )
                )
                .catch(() => setStatus(t("Failed to fetch messages")));
            return;
        }
        getMessages(token, selectedRoomId)
            .then((data) => setMessages(data))
            .catch(() => setStatus(t("Failed to fetch messages")));
    }, [token, selectedRoomId, isMember, t, isSelectedRoomDm, selectedDmUserId]);

    useEffect(() => {
        if (!wsLastMessage || selectedRoomId == null) return;
        if (wsLastMessage.room_id !== selectedRoomId) return;
        if (isSelectedRoomDm && selectedDmUserId) {
            const isFromPartner = wsLastMessage.sender_user_id === selectedDmUserId;
            const isToPartner = wsLastMessage.receiver_user_id === selectedDmUserId;
            if (!isFromPartner && !isToPartner) return;
        }

        // Clear typing indicator immediately when a message arrives from the partner
        if (wsLastMessage.sender_user_id === selectedDmUserId || wsLastMessage.sender_user_id !== currentUserId) {
            if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
            setTypingUser(null);
        }

        setMessages((prev) => {
            if (wsLastMessage.id !== undefined && prev.some((message) => message.created_at && wsLastMessage.created_at && message.created_at === wsLastMessage.created_at && message.sender_user_id === wsLastMessage.sender_user_id && message.content === wsLastMessage.content)) {
                return prev;
            }
            if (wsLastMessage.id !== undefined && (prev as Array<MessageOut & { id?: number }>).some((message) => message.id === wsLastMessage.id)) {
                return prev;
            }
            return [
                ...prev,
                {
                    sender_user_id: wsLastMessage.sender_user_id,
                    room_id: wsLastMessage.room_id,
                    content: wsLastMessage.content,
                    created_at: wsLastMessage.created_at ?? wsLastMessage.timestamp ?? null,
                },
            ];
        });
    }, [wsLastMessage, selectedRoomId, isSelectedRoomDm, selectedDmUserId]);

    useEffect(() => {
        if (selectedRoomId == null || !isMember) return;
        if (messages.length === 0) {
            setRoomLastSeen(selectedRoomId, Date.now());
            return;
        }
        const lastMessage = messages[messages.length - 1];
        const lastTimestamp = lastMessage.created_at ? Date.parse(lastMessage.created_at) : Date.now();
        setRoomLastSeen(selectedRoomId, Number.isFinite(lastTimestamp) ? lastTimestamp : Date.now());
    }, [messages, selectedRoomId, isMember]);

    useEffect(() => {
        if (selectedRoomId == null || isSelectedRoomDm) return;
        setMemberIds(wsRoomMembers);
    }, [wsRoomMembers, selectedRoomId, isSelectedRoomDm]);

    useEffect(() => {
        if (!wsError) return;
        const message = wsError.message || "";
        if (message.toLowerCase().includes("blocked")) {
            setStatus(t("Cannot send message to blocked user"));
            return;
        }
        setStatus(message);
    }, [wsError, t]);

    useEffect(() => {
        if (!wsMemberEvent || selectedRoomId == null || isSelectedRoomDm) return;
        if (wsMemberEvent.room_id !== selectedRoomId) return;
        if (!isMember) return;
        const selectedRoomForEvents = visibleRooms.find((room) => room.id === selectedRoomId) ?? null;
        if (!selectedRoomForEvents || selectedRoomForEvents.is_private) return;
        if (wsMemberEvent.reason !== "join" && wsMemberEvent.reason !== "leave") return;
        if (wsMemberEvent.reason === "join" && wsMemberEvent.type !== "joined") return;
        if (wsMemberEvent.reason === "leave" && wsMemberEvent.type !== "left") return;

        const eventKey = `${wsMemberEvent.room_id}:${wsMemberEvent.user_id}:${wsMemberEvent.type}:${wsMemberEvent.reason}:${wsMemberEvent.timestamp ?? ""}`;
        if (seenMemberEventRef.current.has(eventKey)) return;
        seenMemberEventRef.current.add(eventKey);
        if (seenMemberEventRef.current.size > 200) {
            seenMemberEventRef.current.clear();
        }

        const resolveLabel = async () => {
            const userId = wsMemberEvent.user_id;
            if (!Number.isFinite(userId) || userId <= 0) return "A user";
            if (userId === currentUserId) return t("You");
            const resolvedProfiles = await hydrateProfilesByUserIds([userId]);
            const profile = resolvedProfiles[userId] ?? profiles[userId];
            return profile?.display_name?.trim() || wsMemberEvent.username || "A user";
        };

        resolveLabel()
            .then((label) => {
                const verb = wsMemberEvent.type === "joined" ? t("joined the channel") : t("left the channel");
                setSystemEvents((prev) => [
                    ...prev,
                    {
                        id: `${wsMemberEvent.type}-${selectedRoomId}-${wsMemberEvent.user_id}-${Date.now()}-${Math.random()}`,
                        text: `${label} ${verb}`,
                    },
                ].slice(-40));
            })
            .catch(() => undefined);
    }, [wsMemberEvent, selectedRoomId, visibleRooms, currentUserId, profiles, t, isSelectedRoomDm, isMember]);

    useEffect(() => {
        if (!messages.length) return;
        hydrateProfiles(messages).catch(() => undefined);
    }, [messages]);

    useEffect(() => {
        if (!token || currentUserId <= 0 || rooms.length === 0) return;
        const partnerIds = Array.from(
            new Set(
                rooms
                    .map((room) => getDmOtherUserId(room))
                    .filter((id): id is number => typeof id === "number" && id > 0)
            )
        );
        if (partnerIds.length === 0) return;
        hydrateProfilesByUserIds(partnerIds).catch(() => undefined);
    }, [rooms, token, currentUserId]);

    // ── Typing indicator: handle incoming events, auto-clear after a delay ──
    useEffect(() => {
        if (!wsTypingEvent || selectedRoomId == null) return;
        // For public channels, ignore typings from other rooms.
        if (!isSelectedRoomDm && wsTypingEvent.room_id !== selectedRoomId) return;
        // For DMs, only show typings from the DM partner.
        if (isSelectedRoomDm && wsTypingEvent.from_user_id !== selectedDmUserId) return;

        setTypingUser({ userId: wsTypingEvent.from_user_id, username: wsTypingEvent.username });
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_TIMEOUT_MS);
    }, [wsTypingEvent, selectedRoomId, isSelectedRoomDm, selectedDmUserId]);

    useEffect(() => () => {
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    }, []);

    useEffect(() => {
        setTypingUser(null);
        setPartnerLastReadAt(null);
    }, [selectedRoomId]);

    // ── Read receipts: store the DM partner's last_read_at ──
    useEffect(() => {
        if (!wsReadReceipt || !isSelectedRoomDm) return;
        if (wsReadReceipt.reader_user_id !== selectedDmUserId) return;
        setPartnerLastReadAt(wsReadReceipt.last_read_at);
    }, [wsReadReceipt, isSelectedRoomDm, selectedDmUserId]);

    // ── Send a "read" event for the current DM whenever new messages arrive ──
    useEffect(() => {
        if (!isSelectedRoomDm || !selectedDmUserId || !wsConnected) return;
        if (messages.length === 0) return;
        const last = messages[messages.length - 1];
        // Only signal "read" for messages from the partner.
        if (last.sender_user_id !== selectedDmUserId) return;
        sendWsRead(last.created_at ?? null);
    }, [messages, isSelectedRoomDm, selectedDmUserId, wsConnected, sendWsRead]);

    const handleTypingPing = useCallback(() => {
        // Throttle: send at most once per 1.5s.
        const now = Date.now();
        if (now - lastTypingSentRef.current < 1500) return;
        lastTypingSentRef.current = now;
        sendWsTyping();
    }, [sendWsTyping]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, systemEvents, selectedRoomId]);

    useEffect(() => {
        const entries = Object.entries(profiles);
        if (!entries.length) return;

        entries.forEach(([id, profile]) => {
            const userId = Number(id);
            const resolved = resolveAvatarUrl(profile?.avatar_url ?? null);
            if (!resolved || !resolved.startsWith("/api/")) return;
            if (avatarBlobsRef.current[userId]) return;
            fetchAvatarBlob(userId, resolved).catch(() => undefined);
        });
    }, [profiles, token]);

    useEffect(() => {
        return () => {
            Object.values(avatarBlobsRef.current).forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

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
            // HTTP join first so the backend registers membership before we fetch messages
            await joinRoom(token, selectedRoomId);
            joinWsRoom();
            // Re-fetch members so isMember becomes true and triggers message load
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
        const existing = dmRooms.find(r => getDmOtherUserId(r) === friendId);
        if (existing) { setSelectedRoomId(existing.id); setIsNewDmOpen(false); return; }
        try {
            const ids = [currentUserId, friendId].sort((a, b) => a - b);
            const name = `dm-${ids[0]}-${ids[1]}`;
            let room: RoomOut;
            try {
                room = await createRoom(token, { name, is_private: true });
            } catch {
                // Room déjà existante (409) — récupérer depuis la liste fraîche
                const freshRooms = await getRooms(token);
                const found = freshRooms.find(r => r.name === name);
                if (!found) { setStatus(t("Failed to start conversation")); return; }
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
            // Invite all selected friends
            await Promise.all(
                Array.from(groupSelectedFriends).map(fid => inviteToRoom(token, room.id, fid).catch(() => undefined))
            );
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

    const isOwner = Boolean(selectedRoom && currentUserId > 0 && selectedRoom.owner_user_id === currentUserId);

    const formatMsgTime = (iso: string | null): string => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSep = (iso: string | null): string => {
        if (!iso) return '';
        const d = new Date(iso);
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return t('Today', 'Today');
        if (d.toDateString() === yesterday.toDateString()) return t('Yesterday', 'Yesterday');
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

    // Build a grouped list of messages by date for rendering with date separators
    const groupedMessages = useMemo(() => {
        const groups: { dateKey: string; dateLabel: string; messages: Array<{ msg: MessageOut; idx: number }> }[] = [];
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

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border-4 border-[#1f2937] bg-[#f5efe2] shadow-[10px_10px_0_#1f2937] min-[481px]:rounded-[1.5rem]">
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b-4 border-[#1f2937] bg-[#18212f] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                    {/* # Canaux button — mobile only, opens channels sidebar */}
                    <button
                        type="button"
                        onClick={() => setIsChannelsOpen((v) => !v)}
                        aria-label="Toggle channels"
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition lg:hidden ${isChannelsOpen ? "border-white bg-white text-[#1f2937]" : "border-white/20 bg-white/10 text-white hover:bg-white/20"}`}
                    ># {t("Channels")}</button>
                    <h2 className="text-lg font-semibold">{t("Messages")}</h2>
                    {hasUnread && (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(15,23,42,0.6)]" aria-hidden="true" />
                    )}
                </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[19rem_1fr]">

                {/* ── Channels sidebar (permanent desktop, drawer mobile) ── */}
                {isChannelsOpen && (
                    <button
                        type="button"
                        aria-label="Close channels"
                        onClick={() => setIsChannelsOpen(false)}
                        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    />
                )}
                <ChannelsSidebar
                    isChannelsOpen={isChannelsOpen}
                    setIsChannelsOpen={setIsChannelsOpen}
                    isCreateFormOpen={isCreateFormOpen}
                    setIsCreateFormOpen={setIsCreateFormOpen}
                    isCreateGroupOpen={isCreateGroupOpen}
                    setIsCreateGroupOpen={setIsCreateGroupOpen}
                    roomName={roomName}
                    setRoomName={setRoomName}
                    isCreatingRoom={isCreatingRoom}
                    handleCreateRoom={handleCreateRoom}
                    publicChannels={publicChannels}
                    privateGroups={privateGroups}
                    selectedRoomId={selectedRoomId}
                    setSelectedRoomId={setSelectedRoomId}
                    unreadRoomIds={unreadRoomIds}
                    lastMessageByRoomId={lastMessageByRoomId}
                    allFriendIds={allFriendIds}
                    profiles={profiles}
                    groupName={groupName}
                    setGroupName={setGroupName}
                    groupSelectedFriends={groupSelectedFriends}
                    setGroupSelectedFriends={setGroupSelectedFriends}
                    isCreatingGroup={isCreatingGroup}
                    handleCreateGroup={handleCreateGroup}
                    renderAvatar={renderAvatar}
                    handleAvatarError={handleAvatarError}
                />

                {/* ── Main area: DM list or conversation ── */}
                <main className="flex min-h-0 flex-col bg-[#f7f3ea] lg:col-span-1">

                    {/* DM list — shown when no room is selected (all screens) */}
                    {!selectedRoom && (
                        <DmList
                            isNewDmOpen={isNewDmOpen}
                            setIsNewDmOpen={setIsNewDmOpen}
                            friendsWithoutDm={friendsWithoutDm}
                            profiles={profiles}
                            onlineIds={onlineIds}
                            handleStartDm={handleStartDm}
                            dmRooms={dmRooms}
                            getDmOtherUserId={getDmOtherUserId}
                            getRoomDisplayName={getRoomDisplayName}
                            unreadRoomIds={unreadRoomIds}
                            lastMessageByRoomId={lastMessageByRoomId}
                            setSelectedRoomId={setSelectedRoomId}
                            renderAvatar={renderAvatar}
                            handleAvatarError={handleAvatarError}
                        />
                    )}

                    {/* Conversation header */}
                    <ConversationHeader
                        selectedRoom={selectedRoom}
                        isSelectedRoomDm={isSelectedRoomDm}
                        selectedDmUserId={selectedDmUserId}
                        onlineIds={onlineIds}
                        memberIds={memberIds}
                        roomMemberIds={roomMemberIds}
                        allFriendIds={allFriendIds}
                        profiles={profiles}
                        isMember={isMember}
                        isOwner={isOwner}
                        isInviting={invite.isInviting}
                        isInviteMemberOpen={isInviteMemberOpen}
                        setIsInviteMemberOpen={setIsInviteMemberOpen}
                        isInvitingMember={isInvitingMember}
                        getRoomDisplayName={getRoomDisplayName}
                        renderAvatar={renderAvatar}
                        handleAvatarError={handleAvatarError}
                        handleSendInvite={invite.handleSendInvite}
                        handleJoinRoom={handleJoinRoom}
                        handleLeaveRoom={handleLeaveRoom}
                        handleDeleteRoom={handleDeleteRoom}
                        handleInviteMember={handleInviteMember}
                        setSelectedRoomId={setSelectedRoomId}
                    />

                    {status && (
                        <div className={`border-b-4 border-[#1f2937] bg-[#fff7d6] px-4 py-2.5 text-sm font-medium text-[#1f2937] ${!selectedRoom ? "hidden" : ""}`}>
                            {status}
                        </div>
                    )}

                    {/* Messages area */}
                    <MessageList
                        selectedRoom={Boolean(selectedRoom)}
                        messages={messages}
                        groupedMessages={groupedMessages}
                        systemEvents={systemEvents}
                        profiles={profiles}
                        currentUserId={currentUserId}
                        isSelectedRoomDm={isSelectedRoomDm}
                        partnerLastReadAt={partnerLastReadAt}
                        isMember={isMember}
                        typingUser={typingUser}
                        resolvedInviteIds={invite.resolvedInviteIds}
                        busyInviteId={invite.busyInviteId}
                        messageEndRef={messageEndRef}
                        formatMsgTime={formatMsgTime}
                        renderAvatar={renderAvatar}
                        handleAvatarError={handleAvatarError}
                        openProfile={openProfile}
                        handleAcceptInvite={invite.handleAcceptInvite}
                        handleDeclineInvite={invite.handleDeclineInvite}
                    />

                    {/* Input area */}
                    <MessageInput
                        selectedRoom={Boolean(selectedRoom)}
                        isMember={isMember}
                        selectedRoomId={selectedRoomId}
                        isSelectedRoomDm={isSelectedRoomDm}
                        messageText={messageText}
                        setMessageText={setMessageText}
                        isSubmittingMessage={isSubmittingMessage}
                        currentUserId={currentUserId}
                        isInviting={invite.isInviting}
                        renderAvatar={renderAvatar}
                        handleAvatarError={handleAvatarError}
                        handleSendMessage={handleSendMessage}
                        handleSendInvite={invite.handleSendInvite}
                        handleTypingPing={handleTypingPing}
                    />
                </main>
            </div>

            {/* ── Modal sélection inviteur ── */}
            <SendInviteModal
                showInviteModal={invite.showInviteModal}
                setShowInviteModal={invite.setShowInviteModal}
                inviteNation={invite.inviteNation}
                setInviteNation={invite.setInviteNation}
                inviteScore={invite.inviteScore}
                setInviteScore={invite.setInviteScore}
                inviteDuration={invite.inviteDuration}
                setInviteDuration={invite.setInviteDuration}
                inviteThemeId={invite.inviteThemeId}
                setInviteThemeId={invite.setInviteThemeId}
                isInviting={invite.isInviting}
                handleConfirmInvite={invite.handleConfirmInvite}
            />

            {/* ── Modal sélection accepteur ── */}
            <AcceptInviteModal
                pendingAccept={invite.pendingAccept}
                setPendingAccept={invite.setPendingAccept}
                acceptNation={invite.acceptNation}
                setAcceptNation={invite.setAcceptNation}
                busyInviteId={invite.busyInviteId}
                handleConfirmAccept={invite.handleConfirmAccept}
                handleDeclineInvite={invite.handleDeclineInvite}
            />
        </div>
    );
}
