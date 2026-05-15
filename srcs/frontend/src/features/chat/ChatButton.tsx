import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MessageOut, ProfileOut, RoomOut } from "../profile/types";
import { createRoom, deleteRoom, getMessages, getPrivateMessages, getRoomMembers, getRooms, joinRoom, inviteToRoom } from "./api";
import { fetchProfileByUserId } from "../profile/api/profile";
import { useTranslation } from "react-i18next";
import { useChatWebSocket } from "../../hooks/useWebSocket";
import { getSocket } from "../../hooks/socketSingleton";
import { setRoomLastSeen, useChatNotifications } from "../../hooks/useChatNotifications";
import { acceptInvite, cancelInvite, createDmInvite } from "../game/api/matchmaking";
import { savePendingInvite } from "../../utils/pendingInvite";
import { markInviteResolved, getResolvedIds, onResolvedUpdated } from "../../utils/resolvedInvites";
import { getFriendsWithStatus, getBlockedIds } from "../profile/api/friends";
import { CHARACTERS } from "../../characters";
import { SCORE_OPTIONS, TIMER_OPTIONS, SCORE_DEFAULT, TIMER_DEFAULT } from "../game/engine/constants";
import { THEMES, THEME_DEFAULT } from "../game/themes";

// Marker used to identify chat messages that are actually game invites.
// Format: __GAME_INVITE__|<match_id>|<from_user_id>|<from_name>|<from_nation>|<winning_score>|<duration>|<theme_id>
const INVITE_PREFIX = "__GAME_INVITE__|";

interface ParsedInvite {
    matchId: number;
    fromUserId: number;
    fromName: string;
    fromNation: string;
    winningScore: 3 | 5 | null;
    duration: 30 | 60 | null;
    themeId: string;
}

function parseInviteContent(content: string): ParsedInvite | null {
    if (!content.startsWith(INVITE_PREFIX)) return null;
    const parts = content.slice(INVITE_PREFIX.length).split("|");
    if (parts.length < 4) return null;
    const matchId = Number(parts[0]);
    const fromUserId = Number(parts[1]);
    if (!Number.isFinite(matchId) || matchId <= 0) return null;
    if (!Number.isFinite(fromUserId) || fromUserId <= 0) return null;
    const rawScore = parts[4];
    const rawDuration = parts[5];
    const winningScore = rawScore === "null" ? null : ([3, 5] as const).includes(Number(rawScore) as 3 | 5) ? Number(rawScore) as 3 | 5 : SCORE_DEFAULT;
    const duration = rawDuration === "null" ? null : ([30, 60] as const).includes(Number(rawDuration) as 30 | 60) ? Number(rawDuration) as 30 | 60 : TIMER_DEFAULT;
    const themeId = parts[6] || THEME_DEFAULT.id;
    return { matchId, fromUserId, fromName: parts[2], fromNation: parts[3], winningScore, duration, themeId };
}

const TYPING_TIMEOUT_MS = 3500;

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
    const [isInviting, setIsInviting] = useState(false);
    const [busyInviteId, setBusyInviteId] = useState<number | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteNation, setInviteNation] = useState<string>("Algeria");
    const [inviteScore, setInviteScore] = useState<3 | 5 | null>(SCORE_DEFAULT);
    const [inviteDuration, setInviteDuration] = useState<30 | 60 | null>(TIMER_DEFAULT);
    const [inviteThemeId, setInviteThemeId] = useState<string>(THEME_DEFAULT.id);
    const [pendingAccept, setPendingAccept] = useState<ParsedInvite | null>(null);
    const [acceptNation, setAcceptNation] = useState<string>("Algeria");
    const [resolvedInviteIds, setResolvedInviteIds] = useState<Set<number>>(() => getResolvedIds());
    const avatarBlobsRef = useRef<Record<number, string>>({});
    const seenMemberEventRef = useRef<Set<string>>(new Set());
    const membersLoadedRoomIdRef = useRef<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const lastTypingSentRef = useRef<number>(0);
    const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    useEffect(() => onResolvedUpdated(setResolvedInviteIds), [])

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

    const getUserDisplayName = (userId: number) => {
        if (userId <= 0) return t("Anonymous");
        const profile = profiles[userId];
        return profile?.display_name?.trim() || `User ${userId}`;
    };

    const getUserAvatarUrl = (userId: number) => {
        if (userId <= 0) return "/assets/default-profile.jpg";
        return renderAvatar(userId);
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

    const handleSendInvite = () => {
        if (!isSelectedRoomDm || !selectedDmUserId || !token) return;
        const me = profiles[currentUserId];
        setInviteNation(me?.country?.trim() || "Algeria");
        setInviteScore(SCORE_DEFAULT);
        setInviteDuration(TIMER_DEFAULT);
        setInviteThemeId(THEME_DEFAULT.id);
        setShowInviteModal(true);
    };

    const handleConfirmInvite = async () => {
        if (!isSelectedRoomDm || !selectedDmUserId || !token) return;
        const myName = localStorage.getItem("username") || "Player";
        try {
            setIsInviting(true);
            setShowInviteModal(false);
            const result = await createDmInvite({
                targetUserId: selectedDmUserId,
                playerName: myName,
                playerNation: inviteNation,
                winningScore: inviteScore,
                duration: inviteDuration,
            });
            if (result.status !== "matched" || !result.match_id) {
                setStatus(t("Failed to send invite"));
                return;
            }
            const inviteContent = `${INVITE_PREFIX}${result.match_id}|${currentUserId}|${myName}|${inviteNation}|${inviteScore}|${inviteDuration}|${inviteThemeId}`;
            sendWsMessage(inviteContent);
            savePendingInvite({ ...result, myNation: inviteNation, themeId: inviteThemeId });
            setStatus(t("Invite sent! Waiting for opponent…"));
        } catch (err) {
            setStatus(err instanceof Error ? err.message : t("Failed to send invite"));
        } finally {
            setIsInviting(false);
        }
    };

    const handleAcceptInvite = (invite: ParsedInvite) => {
        const me = profiles[currentUserId];
        setAcceptNation(me?.country?.trim() || "Algeria");
        setPendingAccept(invite);
    };

    const handleConfirmAccept = async () => {
        if (!pendingAccept || !token) return;
        const invite = pendingAccept;
        const myName = localStorage.getItem("username") || "Player";
        try {
            setBusyInviteId(invite.matchId);
            setPendingAccept(null);
            const result = await acceptInvite({
                matchId: invite.matchId,
                playerName: myName,
                playerNation: acceptNation,
            });
            if (result.status !== "matched" || !result.match_id) {
                markInviteResolved(invite.matchId);
                setStatus(t("Invite expired"));
                return;
            }
            markInviteResolved(invite.matchId);
            navigate("/online-gameplay", { state: { ...result, myNation: acceptNation, themeId: invite.themeId } });
        } catch {
            markInviteResolved(invite.matchId);
        } finally {
            setBusyInviteId(null);
        }
    };

    const handleDeclineInvite = async (invite: ParsedInvite) => {
        try {
            setBusyInviteId(invite.matchId);
            await cancelInvite(invite.matchId);
        } catch {
            // best-effort
        } finally {
            markInviteResolved(invite.matchId);
            setBusyInviteId(null);
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
                <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(86vw,19rem)] flex-col border-r-4 border-[#1f2937] bg-[#ece3d0] shadow-[10px_0_0_#1f2937] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${isChannelsOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                    {/* Sidebar header */}
                    <div className="border-b-2 border-[#1f2937]/15 px-3 py-3 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">{t("Rooms")}</span>
                        <button
                            type="button"
                            onClick={() => setIsChannelsOpen(false)}
                            className="rounded-full border-2 border-[#1f2937] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1f2937] lg:hidden"
                        >{t("Close")}</button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto px-3 py-3 flex flex-col gap-4">

                        {/* ── Public channels ── */}
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]"># {t("Public channels")}</span>
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateFormOpen(v => !v); setIsCreateGroupOpen(false); }}
                                    title={t("Create channel")}
                                    className="rounded-full border-2 border-[#1f2937] bg-[#4AD95A] w-6 h-6 flex items-center justify-center text-xs font-bold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                >+</button>
                            </div>
                            {isCreateFormOpen && (
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder={t("Channel name")}
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateRoom(); } }}
                                        className="min-w-0 flex-1 rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500"
                                    />
                                    <button
                                        onClick={handleCreateRoom}
                                        disabled={isCreatingRoom}
                                        className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-1.5 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                                    >{isCreatingRoom ? "..." : t("Create")}</button>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                {publicChannels.length === 0 && (
                                    <p className="px-2 py-2 text-xs text-[#9ca3af]">{t("No public channels yet.")}</p>
                                )}
                                {publicChannels.map((room) => {
                                    const isSelected = room.id === selectedRoomId;
                                    const hasUnreadRoom = unreadRoomIds.includes(room.id);
                                    const lastTs = lastMessageByRoomId[room.id];
                                    const relativeTime = lastTs ? (() => {
                                        const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                                        if (diffMin < 1) return t("just now");
                                        if (diffMin < 60) return `${diffMin}${t("m")}`;
                                        const diffH = Math.floor(diffMin / 60);
                                        if (diffH < 24) return `${diffH}h`;
                                        return `${Math.floor(diffH / 24)}j`;
                                    })() : null;
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => { setSelectedRoomId(room.id); setIsChannelsOpen(false); }}
                                            className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left transition ${isSelected ? "border-[#1f2937] bg-white shadow-[3px_3px_0_#1f2937]" : "border-[#1f2937]/20 bg-white/60 hover:bg-white/85"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="shrink-0 h-8 w-8 rounded-full border-2 border-[#1f2937] bg-[#1f2937] flex items-center justify-center text-white text-xs font-bold">#</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="truncate text-sm font-semibold text-[#1f2937]">{room.name}</div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {hasUnreadRoom && !isSelected && <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />}
                                                            {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ── Private groups ── */}
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">👥 {t("Groups")}</span>
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateGroupOpen(v => !v); setIsCreateFormOpen(false); }}
                                    title={t("Create group")}
                                    className="rounded-full border-2 border-[#1f2937] bg-[#818cf8] w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                >+</button>
                            </div>
                            {isCreateGroupOpen && (
                                <div className="mb-2 rounded-2xl border-2 border-[#1f2937]/20 bg-white/60 p-3 flex flex-col gap-2">
                                    <input
                                        type="text"
                                        placeholder={t("Group name")}
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 w-full"
                                    />
                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#374151]">{t("Invite friends")}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {allFriendIds.length === 0 && (
                                            <p className="text-xs text-[#9ca3af]">{t("No friends yet.")}</p>
                                        )}
                                        {allFriendIds.map(fid => {
                                            const name = profiles[fid]?.display_name || `User ${fid}`;
                                            const sel = groupSelectedFriends.has(fid);
                                            return (
                                                <button
                                                    key={fid}
                                                    type="button"
                                                    onClick={() => setGroupSelectedFriends(prev => {
                                                        const next = new Set(prev);
                                                        if (sel) next.delete(fid); else next.add(fid);
                                                        return next;
                                                    })}
                                                    className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition ${sel ? "border-[#818cf8] bg-[#818cf8] text-white" : "border-[#1f2937]/20 bg-white text-[#1f2937] hover:border-[#818cf8]"}`}
                                                >
                                                    <img src={renderAvatar(fid)} alt={name} onError={handleAvatarError} className="h-4 w-4 rounded-full border border-[#1f2937]/20 object-cover" />
                                                    {name}
                                                    {sel && <span className="ml-0.5">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={isCreatingGroup || !groupName.trim()}
                                        className="rounded-xl border-2 border-[#1f2937] bg-[#818cf8] px-3 py-1.5 text-sm font-semibold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60 w-full"
                                    >{isCreatingGroup ? "..." : t("Create group")}</button>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                {privateGroups.length === 0 && (
                                    <p className="px-2 py-2 text-xs text-[#9ca3af]">{t("No groups yet.")}</p>
                                )}
                                {privateGroups.map((room) => {
                                    const isSelected = room.id === selectedRoomId;
                                    const hasUnreadRoom = unreadRoomIds.includes(room.id);
                                    const lastTs = lastMessageByRoomId[room.id];
                                    const relativeTime = lastTs ? (() => {
                                        const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                                        if (diffMin < 1) return t("just now");
                                        if (diffMin < 60) return `${diffMin}${t("m")}`;
                                        const diffH = Math.floor(diffMin / 60);
                                        if (diffH < 24) return `${diffH}h`;
                                        return `${Math.floor(diffH / 24)}j`;
                                    })() : null;
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => { setSelectedRoomId(room.id); setIsChannelsOpen(false); }}
                                            className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left transition ${isSelected ? "border-[#1f2937] bg-white shadow-[3px_3px_0_#1f2937]" : "border-[#1f2937]/20 bg-white/60 hover:bg-white/85"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="shrink-0 h-8 w-8 rounded-full border-2 border-[#818cf8] bg-[#818cf8] flex items-center justify-center text-white text-xs font-bold">👥</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="truncate text-sm font-semibold text-[#1f2937]">{room.name}</div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {hasUnreadRoom && !isSelected && <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />}
                                                            {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </aside>

                {/* ── Main area: DM list or conversation ── */}
                <main className="flex min-h-0 flex-col bg-[#f7f3ea] lg:col-span-1">

                    {/* DM list — shown when no room is selected (all screens) */}
                    {!selectedRoom && (
                        <div className="flex min-h-0 flex-col flex-1">
                            <div className="border-b-2 border-[#1f2937]/15 px-4 py-3 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">{t("Direct Messages")}</span>
                                <button
                                    type="button"
                                    onClick={() => { setIsNewDmOpen(v => !v); }}
                                    title={t("New conversation")}
                                    className="rounded-full border-2 border-[#1f2937] bg-[#4AD95A] w-7 h-7 flex items-center justify-center text-sm font-bold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                >+</button>
                            </div>
                            {/* New DM friend picker */}
                            {isNewDmOpen && (
                                <div className="border-b-2 border-[#1f2937]/15 bg-[#ece3d0] px-3 py-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#374151] mb-2">{t("Start a conversation")}</div>
                                    {friendsWithoutDm.length === 0 ? (
                                        <p className="text-xs text-[#6b7280] px-1">{t("All friends already have a conversation.")}</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {friendsWithoutDm.map(friendId => {
                                                const profile = profiles[friendId];
                                                const name = profile?.display_name || `User ${friendId}`;
                                                const isOnline = onlineIds.has(friendId);
                                                return (
                                                    <button
                                                        key={friendId}
                                                        type="button"
                                                        onClick={() => handleStartDm(friendId)}
                                                        className="flex items-center gap-2 rounded-2xl border-2 border-[#1f2937]/20 bg-white/80 px-3 py-2 text-left text-sm font-semibold text-[#1f2937] transition hover:bg-white hover:border-[#1f2937]"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={renderAvatar(friendId)}
                                                                alt={name}
                                                                onError={handleAvatarError}
                                                                className="h-8 w-8 rounded-full border-2 border-[#1f2937] object-cover"
                                                            />
                                                            {isOnline && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white" />}
                                                        </div>
                                                        <span className="truncate max-w-[8rem]">{name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
                                <div className="space-y-2">
                                    {dmRooms.length === 0 && (
                                        <p className="px-2 py-6 text-center text-sm text-[#6b7280]">{t("No direct messages yet.")}</p>
                                    )}
                                    {dmRooms.map((room) => {
                                        const dmUserId = getDmOtherUserId(room)!;
                                        const hasUnreadRoom = unreadRoomIds.includes(room.id);
                                        const isOnline = onlineIds.has(dmUserId);
                                        const lastTs = lastMessageByRoomId[room.id];
                                        const relativeTime = lastTs ? (() => {
                                            const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                                            if (diffMin < 1) return t("just now", "just now");
                                            if (diffMin < 60) return `${diffMin} ${t("min ago", "min ago")}`;
                                            const diffH = Math.floor(diffMin / 60);
                                            if (diffH < 24) return `${diffH}h ${t("ago", "ago")}`;
                                            return `${Math.floor(diffH / 24)}d ${t("ago", "ago")}`;
                                        })() : null;
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedRoomId(room.id)}
                                                className="w-full rounded-2xl border-2 border-[#1f2937]/20 bg-white/70 px-3 py-3 text-left transition hover:bg-white"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={renderAvatar(dmUserId)}
                                                            alt={getRoomDisplayName(room)}
                                                            onError={handleAvatarError}
                                                            className="h-11 w-11 rounded-full border-2 border-[#1f2937] object-cover"
                                                        />
                                                        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="truncate text-sm font-semibold text-[#1f2937]">{getRoomDisplayName(room)}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {hasUnreadRoom && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />}
                                                                {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs font-medium ${isOnline ? "text-green-600" : "text-[#9ca3af]"}`}>
                                                            {isOnline ? t("Online") : t("Offline")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conversation header — hidden when no room selected */}
                    <div className={`border-b-4 border-[#1f2937] bg-white/70 px-3 py-3 backdrop-blur-sm min-[481px]:px-4 ${!selectedRoom ? "hidden" : ""}`}>
                        {selectedRoom ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Back button on mobile */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoomId(null)}
                                        className="shrink-0 lg:hidden rounded-full border-2 border-[#1f2937] bg-white w-8 h-8 flex items-center justify-center text-[#1f2937] font-bold shadow-[2px_2px_0_#1f2937]"
                                        aria-label="Back"
                                    >←</button>
                                    {isSelectedRoomDm && selectedDmUserId ? (
                                        <div className="relative shrink-0">
                                            <img
                                                src={renderAvatar(selectedDmUserId)}
                                                alt={getRoomDisplayName(selectedRoom)}
                                                onError={handleAvatarError}
                                                className="h-10 w-10 rounded-full border-2 border-[#1f2937] object-cover"
                                            />
                                            {onlineIds.has(selectedDmUserId) && (
                                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                                            )}
                                        </div>
                                    ) : selectedRoom?.is_private ? (
                                        <div className="shrink-0 h-10 w-10 rounded-full border-2 border-[#818cf8] bg-[#818cf8] flex items-center justify-center text-white font-bold text-base">
                                            👥
                                        </div>
                                    ) : (
                                        <div className="shrink-0 h-10 w-10 rounded-full border-2 border-[#1f2937] bg-[#1f2937] flex items-center justify-center text-white font-bold text-base">
                                            #
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="truncate text-base font-bold text-[#1f2937]">{getRoomDisplayName(selectedRoom)}</div>
                                        {isSelectedRoomDm && selectedDmUserId ? (
                                            <div className={`text-xs font-medium ${onlineIds.has(selectedDmUserId) ? "text-green-600" : "text-[#9ca3af]"}`}>
                                                {onlineIds.has(selectedDmUserId) ? t("Online") : t("Offline")}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-[#6b7280]">
                                                {memberIds.length} {t("member")}{memberIds.length > 1 ? t("s") : ""}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Invite member button — private groups only (any member can invite) */}
                                    {selectedRoom?.is_private && !isSelectedRoomDm && isMember && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsInviteMemberOpen(v => !v)}
                                                title={t("Invite a friend")}
                                                className="rounded-xl border-2 border-[#1f2937] bg-[#818cf8] px-2.5 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                            >+ 👤</button>
                                            {isInviteMemberOpen && (
                                                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border-2 border-[#1f2937] bg-white shadow-[4px_4px_0_#1f2937] p-3 flex flex-col gap-2">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#374151]">{t("Invite a friend")}</div>
                                                    {allFriendIds.filter(id => !roomMemberIds.includes(id)).length === 0 ? (
                                                        <p className="text-xs text-[#9ca3af]">{t("All friends are already in this group.")}</p>
                                                    ) : (
                                                        allFriendIds.filter(id => !roomMemberIds.includes(id)).map(fid => {
                                                            const name = profiles[fid]?.display_name || `User ${fid}`;
                                                            return (
                                                                <button
                                                                    key={fid}
                                                                    type="button"
                                                                    disabled={isInvitingMember}
                                                                    onClick={() => handleInviteMember(fid)}
                                                                    className="flex items-center gap-2 rounded-xl border-2 border-[#1f2937]/20 bg-[#f5efe2] px-3 py-1.5 text-sm font-semibold text-[#1f2937] transition hover:bg-[#ece3d0] text-left"
                                                                >
                                                                    <img src={renderAvatar(fid)} alt={name} onError={handleAvatarError} className="h-6 w-6 rounded-full border border-[#1f2937]/20 object-cover shrink-0" />
                                                                    <span className="truncate">{name}</span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isSelectedRoomDm && (
                                        <button
                                            type="button"
                                            onClick={handleSendInvite}
                                            disabled={isInviting}
                                            title={isInviting ? t("Sending...") : t("Invite to game")}
                                            className="rounded-xl border-2 border-[#1f2937] bg-[#facc15] px-2.5 py-2 text-base font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            🎮
                                        </button>
                                    )}
                                    {!isSelectedRoomDm && !isMember && (
                                        <button
                                            onClick={handleJoinRoom}
                                            className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-2.5 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                        >
                                            {t("Join")}
                                        </button>
                                    )}
                                    {!isSelectedRoomDm && isMember && (
                                        <button
                                            onClick={handleLeaveRoom}
                                            className="rounded-xl border-2 border-[#1f2937] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                        >
                                            {t("Leave")}
                                        </button>
                                    )}
                                    {isOwner && !isSelectedRoomDm && (
                                        <button
                                            onClick={handleDeleteRoom}
                                            className="rounded-xl border-2 border-[#1f2937] bg-[#ef4444] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                        >
                                            {t("Delete")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-1 hidden lg:block">
                                <div className="text-lg font-bold text-[#1f2937]">{t("Select a conversation")}</div>
                            </div>
                        )}
                    </div>

                    {status && (
                        <div className={`border-b-4 border-[#1f2937] bg-[#fff7d6] px-4 py-2.5 text-sm font-medium text-[#1f2937] ${!selectedRoom ? "hidden" : ""}`}>
                            {status}
                        </div>
                    )}

                    {/* Messages area — hidden when no room selected */}
                    <div className={`min-h-0 flex-1 overflow-auto px-3 py-3 min-[481px]:px-4 min-[481px]:py-4 ${!selectedRoom ? "hidden" : ""}`}>
                        <div className="flex min-h-full flex-col justify-end gap-3">
                            {messages.length === 0 && systemEvents.length === 0 && (
                                <div className="rounded-2xl border-2 border-dashed border-[#1f2937]/20 bg-white/60 px-4 py-6 text-center text-sm text-[#6b7280]">
                                    {t("No messages yet in this room.")}
                                </div>
                            )}

                            {groupedMessages.map((group) => (
                                <div key={group.dateKey} className="flex flex-col gap-3">
                                    {/* Date separator */}
                                    {group.dateLabel && (
                                        <div className="flex items-center gap-2 my-1">
                                            <div className="flex-1 h-px bg-[#1f2937]/10" />
                                            <span className="rounded-full border border-[#1f2937]/15 bg-white/80 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                                                {group.dateLabel}
                                            </span>
                                            <div className="flex-1 h-px bg-[#1f2937]/10" />
                                        </div>
                                    )}

                                    {group.messages.map(({ msg: message, idx: index }, posInGroup) => {
                                        const profile = profiles[message.sender_user_id];
                                        const displayName = profile?.display_name || `User ${message.sender_user_id}`;
                                        const avatarUrl = renderAvatar(message.sender_user_id);
                                        const isMine = currentUserId > 0 && message.sender_user_id === currentUserId;
                                        const invite = parseInviteContent(message.content);
                                        const isLastMine = isMine && index === messages.length - 1;
                                        const seenByPartner = Boolean(
                                            isLastMine && isSelectedRoomDm && partnerLastReadAt && message.created_at &&
                                            Date.parse(partnerLastReadAt) >= Date.parse(message.created_at)
                                        );
                                        const nextItem = group.messages[posInGroup + 1];
                                        const isLastInRun = !nextItem || nextItem.msg.sender_user_id !== message.sender_user_id;
                                        const showAvatar = isLastInRun;

                                        return (
                                            <article
                                                key={`${message.room_id}-${message.sender_user_id}-${message.created_at ?? index}`}
                                                className={`flex items-end gap-2 sm:gap-3 ${isMine ? "justify-end" : "justify-start"}`}
                                            >
                                                {!isMine && (
                                                    <div className="shrink-0 w-9 sm:w-10">
                                                        {showAvatar ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openProfile(message.sender_user_id)}
                                                                aria-label={`Open ${displayName}'s profile`}
                                                            >
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={displayName}
                                                                    onError={handleAvatarError}
                                                                    className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                                />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                )}

                                                <div className="flex max-w-[86%] flex-col gap-1 sm:max-w-[80%]">
                                                    {invite ? (
                                                        <div
                                                            className={`rounded-3xl border-2 border-[#1f2937] px-3 py-3 shadow-[4px_4px_0_#1f2937] sm:px-4 sm:py-4 ${
                                                                isMine ? "bg-blue-700 text-white" : "bg-white text-[#1f2937]"
                                                            }`}
                                                        >
                                                            <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                                {isMine ? t("You") : displayName}
                                                            </div>
                                                            <div className="font-semibold text-sm sm:text-base mb-1">
                                                                🎮 {t("Game invite")}
                                                            </div>
                                                            <div className={`flex gap-2 text-[11px] mb-2 ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                                <span>{invite.winningScore !== null ? `${invite.winningScore} ${t("goals")}` : "∞ " + t("goals")}</span>
                                                                <span>·</span>
                                                                <span>{invite.duration !== null ? `${invite.duration}s` : "∞"}</span>
                                                                <span>·</span>
                                                                <span>{t(THEMES.find(th => th.id === invite.themeId)?.nameKey ?? THEME_DEFAULT.nameKey, invite.themeId)}</span>
                                                            </div>
                                                            {resolvedInviteIds.has(invite.matchId) ? (
                                                                <div className="text-xs text-gray-400 italic mt-1">{t("Invite expired", "Invitation expirée")}</div>
                                                            ) : isMine ? (
                                                                <div className="text-xs text-white/80">{t("Waiting for opponent...")}</div>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={busyInviteId === invite.matchId}
                                                                        onClick={() => handleAcceptInvite(invite)}
                                                                        className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                                                                    >
                                                                        {t("Accept")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={busyInviteId === invite.matchId}
                                                                        onClick={() => handleDeclineInvite(invite)}
                                                                        className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                                                                    >
                                                                        {t("Reject")}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {message.created_at && (
                                                                <div className={`mt-1 text-[10px] ${isMine ? "text-white/50 text-right" : "text-[#9ca3af]"}`}>
                                                                    {formatMsgTime(message.created_at)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={`rounded-3xl border-2 border-[#1f2937] px-3 py-2.5 shadow-[4px_4px_0_#1f2937] sm:px-4 sm:py-3 ${
                                                                isMine ? "bg-[#1f2937] text-white" : "bg-white text-[#1f2937]"
                                                            }`}
                                                        >
                                                            <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                                {isMine ? t("You") : displayName}
                                                            </div>
                                                            <div className="break-words text-sm leading-6 sm:text-[0.95rem]">{message.content}</div>
                                                            {message.created_at && (
                                                                <div className={`mt-1 text-[10px] ${isMine ? "text-white/50 text-right" : "text-[#9ca3af]"}`}>
                                                                    {formatMsgTime(message.created_at)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {seenByPartner && (
                                                        <div className="text-[10px] text-blue-600 self-end font-semibold uppercase tracking-wider">
                                                            ✓✓ {t("Seen")}
                                                        </div>
                                                    )}
                                                </div>

                                                {isMine && (
                                                    <div className="shrink-0 w-9 sm:w-10">
                                                        {showAvatar ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openProfile(message.sender_user_id)}
                                                                aria-label="Open your profile"
                                                            >
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={displayName}
                                                                    onError={handleAvatarError}
                                                                    className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                                />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Typing indicator */}
                            {typingUser && isMember && (
                                <div className="flex items-center gap-2 text-xs text-[#6b7280] pl-2">
                                    <span className="inline-flex gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </span>
                                    <span>{(profiles[typingUser.userId]?.display_name || typingUser.username || "Someone")} {t("is typing...")}</span>
                                </div>
                            )}

                            {systemEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="mx-auto max-w-[92%] rounded-2xl border-2 border-dashed border-[#1f2937]/25 bg-white/70 px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#6b7280]"
                                >
                                    {event.text}
                                </div>
                            ))}

                            <div ref={messageEndRef} />
                        </div>
                    </div>

                    {/* Input area — hidden when no room selected */}
                    <div className={`border-t-4 border-[#1f2937] bg-white/80 px-3 py-3 backdrop-blur-sm min-[481px]:px-4 ${!selectedRoom ? "hidden" : ""}`}>
                        <form
                            className="flex items-center gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (!isMember) return;
                                handleSendMessage();
                            }}
                        >
                            {/* Current user avatar */}
                            {currentUserId > 0 && (
                                <img
                                    src={renderAvatar(currentUserId)}
                                    alt="You"
                                    onError={handleAvatarError}
                                    className="shrink-0 h-8 w-8 rounded-full border-2 border-[#1f2937] object-cover"
                                />
                            )}
                            <input
                                type="text"
                                placeholder={isMember ? t("Write a message...") : t("Join the channel to chat")}
                                value={messageText}
                                onChange={(e) => {
                                    setMessageText(e.target.value);
                                    if (isMember && e.target.value.length > 0) handleTypingPing();
                                }}
                                disabled={!isMember}
                                className="min-w-0 flex-1 rounded-2xl border-2 border-[#1f2937] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            {/* Game invite button inline — DMs only */}
                            {isSelectedRoomDm && (
                                <button
                                    type="button"
                                    onClick={handleSendInvite}
                                    disabled={isInviting}
                                    title={isInviting ? t("Sending...") : t("Invite to game")}
                                    className="shrink-0 rounded-2xl border-2 border-[#1f2937] bg-[#facc15] px-2.5 py-2.5 text-base font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    🎮
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={selectedRoomId == null || isSubmittingMessage || !isMember}
                                className="shrink-0 rounded-2xl border-2 border-[#1f2937] bg-[#1f2937] px-3 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmittingMessage ? "..." : "→"}
                            </button>
                        </form>
                    </div>
                </main>
            </div>

            {/* ── Modal sélection inviteur ── */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInviteModal(false)}>
                    <div className="w-[min(92vw,22rem)] rounded-3xl border-4 border-[#1f2937] bg-[#f5efe2] p-6 shadow-[8px_8px_0_#1f2937]" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 text-center text-base font-bold uppercase tracking-widest text-[#1f2937]">🎮 {t("Game invite")}</div>

                        {/* Nation picker */}
                        <div className="mb-4 flex flex-col items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Your character")}</span>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { const i = CHARACTERS.indexOf(inviteNation as typeof CHARACTERS[number]); setInviteNation(CHARACTERS[(i - 1 + CHARACTERS.length) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">◀</button>
                                <div className="flex flex-col items-center gap-1 w-24">
                                    <img src={`/assets/perso/faces/${inviteNation.toLowerCase()}-face.png`} alt={inviteNation} className="w-14 h-14 object-contain" />
                                    <span className="text-xs font-semibold text-[#1f2937]">{inviteNation}</span>
                                </div>
                                <button type="button" onClick={() => { const i = CHARACTERS.indexOf(inviteNation as typeof CHARACTERS[number]); setInviteNation(CHARACTERS[(i + 1) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">▶</button>
                            </div>
                        </div>

                        {/* Score */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Goals")}</span>
                            <div className="flex gap-1.5">
                                {SCORE_OPTIONS.map(opt => (
                                    <button key={String(opt)} type="button" onClick={() => setInviteScore(opt)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${inviteScore === opt ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{opt === null ? "∞" : opt}</button>
                                ))}
                            </div>
                        </div>

                        {/* Timer */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Time")}</span>
                            <div className="flex gap-1.5">
                                {TIMER_OPTIONS.map(opt => (
                                    <button key={String(opt)} type="button" onClick={() => setInviteDuration(opt)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${inviteDuration === opt ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{opt === null ? "∞" : `${opt}s`}</button>
                                ))}
                            </div>
                        </div>

                        {/* Theme */}
                        <div className="mb-5 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Theme")}</span>
                            <div className="flex gap-1.5">
                                {THEMES.map(th => (
                                    <button key={th.id} type="button" onClick={() => setInviteThemeId(th.id)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${inviteThemeId === th.id ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{t(th.nameKey, th.id)}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-white py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937]">{t("Cancel")}</button>
                            <button type="button" onClick={handleConfirmInvite} disabled={isInviting} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-[#4AD95A] py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] disabled:opacity-60">{t("Send invite")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal sélection accepteur ── */}
            {pendingAccept && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPendingAccept(null)}>
                    <div className="w-[min(92vw,22rem)] rounded-3xl border-4 border-[#1f2937] bg-[#f5efe2] p-6 shadow-[8px_8px_0_#1f2937]" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 text-center text-base font-bold uppercase tracking-widest text-[#1f2937]">🎮 {t("Game invite")}</div>

                        {/* Nation picker */}
                        <div className="mb-3 flex flex-col items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Your character")}</span>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { const i = CHARACTERS.indexOf(acceptNation as typeof CHARACTERS[number]); setAcceptNation(CHARACTERS[(i - 1 + CHARACTERS.length) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">◀</button>
                                <div className="flex flex-col items-center gap-1 w-24">
                                    <img src={`/assets/perso/faces/${acceptNation.toLowerCase()}-face.png`} alt={acceptNation} className="w-14 h-14 object-contain" />
                                    <span className="text-xs font-semibold text-[#1f2937]">{acceptNation}</span>
                                </div>
                                <button type="button" onClick={() => { const i = CHARACTERS.indexOf(acceptNation as typeof CHARACTERS[number]); setAcceptNation(CHARACTERS[(i + 1) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">▶</button>
                            </div>
                        </div>

                        {/* Paramètres imposés par l'inviteur (lecture seule) */}
                        <div className="mb-5 flex items-center justify-between gap-2 text-xs text-[#6b7280]">
                            <span>{pendingAccept.winningScore !== null ? `${pendingAccept.winningScore} ${t("goals")}` : "∞ " + t("goals")}</span>
                            <span>{pendingAccept.duration !== null ? `${pendingAccept.duration}s` : "∞"}</span>
                            <span>{t(THEMES.find(th => th.id === pendingAccept.themeId)?.nameKey ?? THEME_DEFAULT.nameKey, pendingAccept.themeId)}</span>
                        </div>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => { handleDeclineInvite(pendingAccept); setPendingAccept(null); }} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-white py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937]">{t("Decline")}</button>
                            <button type="button" onClick={handleConfirmAccept} disabled={busyInviteId === pendingAccept.matchId} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-[#4AD95A] py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] disabled:opacity-60">{t("Accept")}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

