import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import type { ChatMemberEvent, ChatMessage, ReadReceiptEvent, TypingEvent } from "../../../../hooks/useWebSocket";
import type { MessageOut, ProfileOut, RoomOut } from "../../../profile/types";
import { getMessages, getPrivateMessages } from "../../api";
import { setRoomLastSeen } from "../../../../hooks/useChatNotifications";
import { TYPING_TIMEOUT_MS } from "../../types";

interface UseChatMessageEffectsParams {
    token: string | null;
    t: TFunction;
    currentUserId: number;
    selectedRoomId: number | null;
    selectedDmUserId: number | null;
    isSelectedRoomDm: boolean;
    isMember: boolean;
    profiles: Record<number, ProfileOut>;
    visibleRooms: RoomOut[];
    messages: MessageOut[];
    wsRoomMembers: number[];
    wsMemberEvent: ChatMemberEvent | null;
    wsLastMessage: ChatMessage | null;
    wsTypingEvent: TypingEvent | null;
    wsReadReceipt: ReadReceiptEvent | null;
    wsConnected: boolean;
    wsError: Error | null;
    seenMemberEventRef: MutableRefObject<Set<string>>;
    typingClearTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    messageEndRef: RefObject<HTMLDivElement | null>;
    sendWsRead: (lastReadAt?: string | null) => boolean;
    hydrateProfilesByUserIds: (userIds: number[]) => Promise<Record<number, ProfileOut>>;
    setMessages: Dispatch<SetStateAction<MessageOut[]>>;
    setStatus: Dispatch<SetStateAction<string | null>>;
    setMemberIds: Dispatch<SetStateAction<number[]>>;
    setSystemEvents: Dispatch<SetStateAction<Array<{ id: string; text: string }>>>;
    setTypingUser: Dispatch<SetStateAction<{ userId: number; username?: string } | null>>;
    setPartnerLastReadAt: Dispatch<SetStateAction<string | null>>;
}

export function useChatMessageEffects({
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
}: UseChatMessageEffectsParams) {
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
    }, [token, selectedRoomId, isMember, isSelectedRoomDm, selectedDmUserId, setMessages, setStatus, t]);

    useEffect(() => {
        if (!wsLastMessage || selectedRoomId == null) return;
        if (wsLastMessage.room_id !== selectedRoomId) return;
        if (isSelectedRoomDm && selectedDmUserId) {
            const isFromPartner = wsLastMessage.sender_user_id === selectedDmUserId;
            const isToPartner = wsLastMessage.receiver_user_id === selectedDmUserId;
            if (!isFromPartner && !isToPartner) return;
        }

        if (wsLastMessage.sender_user_id === selectedDmUserId || wsLastMessage.sender_user_id !== currentUserId) {
            if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
            setTypingUser(null);
        }

        setMessages((prev) => {
            if (
                wsLastMessage.id !== undefined &&
                prev.some(
                    (m) =>
                        m.created_at &&
                        wsLastMessage.created_at &&
                        m.created_at === wsLastMessage.created_at &&
                        m.sender_user_id === wsLastMessage.sender_user_id &&
                        m.content === wsLastMessage.content
                )
            ) return prev;
            if (wsLastMessage.id !== undefined && (prev as Array<MessageOut & { id?: number }>).some((m) => m.id === wsLastMessage.id)) return prev;
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
    }, [currentUserId, isSelectedRoomDm, selectedDmUserId, selectedRoomId, setMessages, setTypingUser, typingClearTimerRef, wsLastMessage]);

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
    }, [selectedRoomId, isSelectedRoomDm, setMemberIds, wsRoomMembers]);

    useEffect(() => {
        if (!wsError) return;
        const message = wsError.message || "";
        if (message.toLowerCase().includes("blocked")) {
            setStatus(t("Cannot send message to blocked user"));
            return;
        }
        setStatus(message);
    }, [wsError, setStatus, t]);

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
        if (seenMemberEventRef.current.size > 200) seenMemberEventRef.current.clear();

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
    }, [wsMemberEvent, selectedRoomId, isSelectedRoomDm, isMember, visibleRooms, seenMemberEventRef, currentUserId, t, profiles, hydrateProfilesByUserIds, setSystemEvents]);

    useEffect(() => {
        if (!wsTypingEvent || selectedRoomId == null) return;
        if (!isSelectedRoomDm && wsTypingEvent.room_id !== selectedRoomId) return;
        if (isSelectedRoomDm && wsTypingEvent.from_user_id !== selectedDmUserId) return;
        setTypingUser({ userId: wsTypingEvent.from_user_id, username: wsTypingEvent.username });
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_TIMEOUT_MS);
    }, [wsTypingEvent, selectedRoomId, isSelectedRoomDm, selectedDmUserId, setTypingUser, typingClearTimerRef]);

    useEffect(() => () => {
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    }, [typingClearTimerRef]);

    useEffect(() => {
        setTypingUser(null);
        setPartnerLastReadAt(null);
    }, [selectedRoomId, setTypingUser, setPartnerLastReadAt]);

    useEffect(() => {
        if (!wsReadReceipt || !isSelectedRoomDm) return;
        if (wsReadReceipt.reader_user_id !== selectedDmUserId) return;
        setPartnerLastReadAt(wsReadReceipt.last_read_at);
    }, [wsReadReceipt, isSelectedRoomDm, selectedDmUserId, setPartnerLastReadAt]);

    useEffect(() => {
        if (!isSelectedRoomDm || !selectedDmUserId || !wsConnected) return;
        if (messages.length === 0) return;
        const last = messages[messages.length - 1];
        if (last.sender_user_id !== selectedDmUserId) return;
        sendWsRead(last.created_at ?? null);
    }, [messages, isSelectedRoomDm, selectedDmUserId, wsConnected, sendWsRead]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, selectedRoomId, messageEndRef]);
}
