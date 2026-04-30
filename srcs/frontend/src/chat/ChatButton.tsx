import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MessageOut, ProfileOut, RoomOut } from "../Profile/types";
import { createRoom, deleteRoom, getMessages, getRoomMembers, getRooms, joinRoom, leaveRoom, sendMessage } from "../Profile/api/chat";
import { fetchProfileByUserId } from "../Profile/api/profile";
import { useTranslation } from "react-i18next";

type ChatButtonProps = {
    initialRoomId?: number | null;
};

export function ChatButton({ initialRoomId = null }: ChatButtonProps) {
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
    const [systemEvents, setSystemEvents] = useState<Array<{ id: string; text: string }>>([]);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const avatarBlobsRef = useRef<Record<number, string>>({});
    const prevMemberIdsRef = useRef<number[] | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);


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

    const refreshMessages = async (roomId: number) => {
        if (!token) return;
        const data = await getMessages(token, roomId);
        setMessages(data);
    };

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

    const refreshMembers = async (roomId: number) => {
        if (!token) return;
        const data = await getRoomMembers(token, roomId);
        setMemberIds(data);

        const previousMembers = prevMemberIdsRef.current;
        if (previousMembers) {
            const joined = data.filter((id) => !previousMembers.includes(id));
            const left = previousMembers.filter((id) => !data.includes(id));
            const changedIds = Array.from(new Set([...joined, ...left]));
            const resolvedProfiles = await hydrateProfilesByUserIds(changedIds);

            const getMemberLabel = (id: number) => {
                if (id === currentUserId) return t("You");
                const profile = resolvedProfiles[id] ?? profiles[id];
                return profile?.display_name?.trim() || "A user";
            };

            const nextEvents = [
                ...joined.map((id) => ({
                    id: `join-${roomId}-${id}-${Date.now()}-${Math.random()}`,
                    text: `${getMemberLabel(id)} ${t("joined the channel")}`,
                })),
                ...left.map((id) => ({
                    id: `leave-${roomId}-${id}-${Date.now()}-${Math.random()}`,
                    text: `${getMemberLabel(id)} ${t("left the channel")}`,
                })),
            ];

            if (nextEvents.length > 0) {
                setSystemEvents((prev) => [...prev, ...nextEvents].slice(-40));
            }
        }

        prevMemberIdsRef.current = data;
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
        const intervalId = window.setInterval(() => {
            refreshRooms().catch(() => undefined);
        }, 8000);

        return () => window.clearInterval(intervalId);
    }, [token]);

    useEffect(() => {
        if (!initialRoomId || selectedRoomId != null || visibleRooms.length === 0) return;
        const exists = visibleRooms.some((room) => room.id === initialRoomId);
        if (exists) setSelectedRoomId(initialRoomId);
    }, [initialRoomId, visibleRooms, selectedRoomId]);

    useEffect(() => {
        if (selectedRoomId == null) return;
        const stillVisible = visibleRooms.some((room) => room.id === selectedRoomId);
        if (stillVisible) return;
        setSelectedRoomId(null);
        setMessages([]);
        setMemberIds([]);
        setSystemEvents([]);
    }, [visibleRooms, selectedRoomId]);

    useEffect(() => {
        if (selectedRoomId == null) return;

        prevMemberIdsRef.current = null;
        setSystemEvents([]);

        const load = async () => {
            await Promise.all([refreshMessages(selectedRoomId), refreshMembers(selectedRoomId)]);
        };

        load().catch((error) => setStatus(error instanceof Error ? error.message : t("Failed to fetch room data")));

        const intervalId = window.setInterval(() => {
            Promise.all([refreshMessages(selectedRoomId), refreshMembers(selectedRoomId)]).catch(() => undefined);
        }, 4000);

        return () => window.clearInterval(intervalId);
    }, [selectedRoomId, token]);

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
            setIsSidebarOpen(false);
            setStatus(null);
            await refreshRooms();
            await Promise.all([refreshMessages(room.id), refreshMembers(room.id)]);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to create room"));
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!token || selectedRoomId == null) return;
        try {
            await joinRoom(token, selectedRoomId);
            setStatus(null);
            await Promise.all([refreshMessages(selectedRoomId), refreshMembers(selectedRoomId)]);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to join room"));
        }
    };

    const handleSendMessage = async () => {
        if (!token || selectedRoomId == null) return;
        if (!messageText.trim()) return;

        try {
            setIsSubmittingMessage(true);
            await sendMessage(token, selectedRoomId, { content: messageText.trim() });
            setMessageText("");
            setStatus(null);
            await refreshMessages(selectedRoomId);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to send message"));
        } finally {
            setIsSubmittingMessage(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (!token || selectedRoomId == null) return;
        try {
            await leaveRoom(token, selectedRoomId);
            setStatus(null);
            setSelectedRoomId(null);
            setMessages([]);
            setMemberIds([]);
            setSystemEvents([]);
            setIsSidebarOpen(false);
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
            setIsSidebarOpen(false);
            await refreshRooms();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : t("Failed to delete room"));
        }
    };

    const selectedRoom = useMemo(
        () => visibleRooms.find((room) => room.id === selectedRoomId) ?? null,
        [visibleRooms, selectedRoomId]
    );

    const isOwner = Boolean(selectedRoom && currentUserId > 0 && selectedRoom.owner_user_id === currentUserId);
    const isSelectedRoomDm = Boolean(selectedRoom && getDmOtherUserId(selectedRoom));

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

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border-4 border-[#1f2937] bg-[#f5efe2] shadow-[10px_10px_0_#1f2937] min-[481px]:rounded-[1.5rem]">
            <div className="flex items-center justify-between border-b-4 border-[#1f2937] bg-[#18212f] px-4 py-3 text-white">
                <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/70">{t("Chat")}</div>
                    <h2 className="text-lg font-semibold">{t("Messages directs")}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20 lg:hidden"
                    >
                        {t("Rooms")}
                    </button>
                    <button
                        onClick={refreshRooms}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20"
                    >
                        {t("Refresh")}
                    </button>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[19rem_1fr]">
                {isSidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close rooms drawer"
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-40 flex w-[min(86vw,20rem)] -translate-x-full flex-col border-r-4 border-[#1f2937] bg-[#ece3d0] shadow-[10px_0_0_#1f2937] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:border-b-0 lg:border-r-4 lg:shadow-none ${
                        isSidebarOpen ? "translate-x-0" : ""
                    }`}
                >
                    <div className="border-b-2 border-[#1f2937]/15 px-3 py-3 min-[481px]:px-4 min-[481px]:py-4">
                        <div className="mb-2 flex items-center justify-between lg:hidden">
                            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">{t("Channels")}</label>
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="rounded-full border-2 border-[#1f2937] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1f2937]"
                            >
                                {t("Close")}
                            </button>
                        </div>
                        <label className="mb-2 hidden text-xs font-bold uppercase tracking-[0.18em] text-[#374151] lg:block">
                            {t("Create channel")}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t("Room name")}
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="min-w-0 flex-1 rounded-xl border-2 border-[#1f2937] bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                            />
                            <button
                                onClick={handleCreateRoom}
                                disabled={isCreatingRoom}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-2 text-sm font-semibold text-[#1f2937] shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isCreatingRoom ? t("Creating...") : t("Create")}
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
                        <div className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">
                            <span>{t("Channels")}</span>
                            <span>{visibleRooms.length}</span>
                        </div>
                        <div className="space-y-2">
                            {visibleRooms.length === 0 && <p className="px-2 py-3 text-sm text-[#6b7280]">{t("No rooms yet.")}</p>}
                            {visibleRooms.map((room) => {
                                const isSelected = room.id === selectedRoomId;
                                const isRoomOwner = currentUserId > 0 && room.owner_user_id === currentUserId;
                                const isDm = Boolean(getDmOtherUserId(room));
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => {
                                            setSelectedRoomId(room.id);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`w-full rounded-2xl border-2 px-3 py-3 text-left transition ${
                                            isSelected
                                                ? "border-[#1f2937] bg-white shadow-[4px_4px_0_#1f2937]"
                                                : "border-[#1f2937]/20 bg-white/60 hover:bg-white/85"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-[#1f2937]">{getRoomDisplayName(room)}</div>
                                                <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">
                                                    <span>{isDm ? t("Direct message") : room.is_private ? t("Private") : t("Public")}</span>
                                                    {!isDm && (
                                                        <>
                                                            <span>•</span>
                                                            <span>#{room.id}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {isRoomOwner && (
                                                    <span className="rounded-full bg-[#1f2937] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                                        {t("Owner")}
                                                    </span>
                                                )}
                                                {isSelected && (
                                                    <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                                        {t("Active")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-0 flex-col bg-[#f7f3ea] lg:col-span-1">
                    <div className="border-b-4 border-[#1f2937] bg-white/70 px-3 py-3 backdrop-blur-sm min-[481px]:px-4 min-[481px]:py-4">
                        {selectedRoom ? (
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <div className="text-xs uppercase tracking-[0.22em] text-[#6b7280]">Current channel</div>
                                    <div className="truncate text-lg font-bold text-[#1f2937] min-[481px]:text-xl">{getRoomDisplayName(selectedRoom)}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6b7280] min-[481px]:text-sm">
                                        <span>{isSelectedRoomDm ? "Direct message" : selectedRoom.is_private ? "Private" : "Public"}</span>
                                        {!isSelectedRoomDm && (
                                            <>
                                                <span>•</span>
                                                <span>{t("Owner")} #{selectedRoom.owner_user_id}</span>
                                            </>
                                        )}
                                        <span>•</span>
                                        <span>{memberIds.length} {t("member")}{memberIds.length > 1 ? t("s") : ""}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleJoinRoom}
                                        className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-2 text-sm font-semibold text-[#1f2937] shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                    >
                                        {t("Join")}
                                    </button>
                                    <button
                                        onClick={handleLeaveRoom}
                                        className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-2 text-sm font-semibold text-[#1f2937] shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                    >
                                        {t("Leave")}
                                    </button>
                                    {isOwner && !isSelectedRoomDm && (
                                        <button
                                            onClick={handleDeleteRoom}
                                            className="rounded-xl border-2 border-[#1f2937] bg-[#ef4444] px-3 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                        >
                                            {t("Delete channel")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-2">
                                <div className="text-xs uppercase tracking-[0.22em] text-[#6b7280]">{t("Current channel")}</div>
                                <div className="text-xl font-bold text-[#1f2937]">{t("Select a channel")}</div>
                            </div>
                        )}
                    </div>

                    {status && <div className="border-b-4 border-[#1f2937] bg-[#fff7d6] px-4 py-3 text-sm font-medium text-[#1f2937]">{status}</div>}

                    <div className="min-h-0 flex-1 overflow-auto px-3 py-3 min-[481px]:px-4 min-[481px]:py-4">
                        <div className="flex min-h-full flex-col justify-end gap-3">
                            {messages.length === 0 && systemEvents.length === 0 && (
                                <div className="rounded-2xl border-2 border-dashed border-[#1f2937]/20 bg-white/60 px-4 py-6 text-center text-sm text-[#6b7280]">
                                    {t("No messages yet in this room.")}
                                </div>
                            )}

                            {messages.map((message, index) => {
                                const profile = profiles[message.sender_user_id];
                                const displayName = profile?.display_name || `User ${message.sender_user_id}`;
                                const avatarUrl = renderAvatar(message.sender_user_id);
                                const isMine = currentUserId > 0 && message.sender_user_id === currentUserId;

                                return (
                                    <article
                                        key={`${message.room_id}-${message.sender_user_id}-${message.created_at ?? index}`}
                                        className={`flex items-end gap-2 sm:gap-3 ${isMine ? "justify-end" : "justify-start"}`}
                                    >
                                        {!isMine && (
                                            <button
                                                type="button"
                                                onClick={() => openProfile(message.sender_user_id)}
                                                className="shrink-0"
                                                aria-label={`Open ${displayName}'s profile`}
                                            >
                                                <img
                                                    src={avatarUrl}
                                                    alt={displayName}
                                                    onError={handleAvatarError}
                                                    className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                />
                                            </button>
                                        )}

                                        <div
                                            className={`max-w-[86%] rounded-3xl border-2 border-[#1f2937] px-3 py-2.5 shadow-[4px_4px_0_#1f2937] sm:max-w-[80%] sm:px-4 sm:py-3 ${
                                                isMine ? "bg-[#1f2937] text-white" : "bg-white text-[#1f2937]"
                                            }`}
                                        >
                                            <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                {isMine ? t("You") : displayName}
                                            </div>
                                            <div className="break-words text-sm leading-6 sm:text-[0.95rem]">{message.content}</div>
                                        </div>

                                        {isMine && (
                                            <button
                                                type="button"
                                                onClick={() => openProfile(message.sender_user_id)}
                                                className="shrink-0"
                                                aria-label="Open your profile"
                                            >
                                                <img
                                                    src={avatarUrl}
                                                    alt={displayName}
                                                    onError={handleAvatarError}
                                                    className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                />
                                            </button>
                                        )}
                                    </article>
                                );
                            })}

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

                    <div className="border-t-4 border-[#1f2937] bg-white/80 px-3 py-3 backdrop-blur-sm min-[481px]:px-4 min-[481px]:py-4">
                        <form
                            className="flex flex-col gap-2.5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleSendMessage();
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder={t("Write a message...")}
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    className="min-w-0 flex-1 rounded-2xl border-2 border-[#1f2937] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 sm:px-4 sm:py-3"
                                />
                                <button
                                    type="submit"
                                    disabled={selectedRoomId == null || isSubmittingMessage}
                                    className="rounded-2xl border-2 border-[#1f2937] bg-[#1f2937] px-3 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-3"
                                >
                                    {isSubmittingMessage ? "..." : t("Send")}
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6b7280] sm:text-xs">
                                <span>{selectedRoom ? `Connected to ${getRoomDisplayName(selectedRoom)}` : t("No channel selected")}</span>
                                <span>{messages.length} message{messages.length > 1 ? "s" : ""}</span>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

