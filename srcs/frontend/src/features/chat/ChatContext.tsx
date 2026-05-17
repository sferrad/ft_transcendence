import { createContext, useContext } from "react";
import type { MessageOut, ProfileOut, RoomOut } from "../profile/types";
import { useChatInvite } from "./hooks/useChatInvite";
import { useChatProviderValue } from "./hooks/useChatProviderValue";

interface GroupedMessage {
    dateKey: string;
    dateLabel: string;
    messages: Array<{ msg: MessageOut; idx: number }>;
}

interface ChatContextValue {
    token: string | null;
    currentUserId: number;
    rooms: RoomOut[];
    visibleRooms: RoomOut[];
    publicChannels: RoomOut[];
    privateGroups: RoomOut[];
    dmRooms: RoomOut[];
    selectedRoomId: number | null;
    setSelectedRoomId: React.Dispatch<React.SetStateAction<number | null>>;
    selectedRoom: RoomOut | null;
    selectedDmUserId: number | null;
    isSelectedRoomDm: boolean;
    isMember: boolean;
    isOwner: boolean;
    messages: MessageOut[];
    groupedMessages: GroupedMessage[];
    systemEvents: Array<{ id: string; text: string }>;
    profiles: Record<number, ProfileOut>;
    avatarBlobs: Record<number, string>;
    onlineIds: Set<number>;
    allFriendIds: number[];
    friendsWithoutDm: number[];
    blockedIds: Set<number>;
    memberIds: number[];
    roomMemberIds: number[];
    status: string | null;
    isCreatingRoom: boolean;
    isCreateFormOpen: boolean;
    setIsCreateFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isCreateGroupOpen: boolean;
    setIsCreateGroupOpen: React.Dispatch<React.SetStateAction<boolean>>;
    roomName: string;
    setRoomName: React.Dispatch<React.SetStateAction<string>>;
    groupName: string;
    setGroupName: React.Dispatch<React.SetStateAction<string>>;
    groupSelectedFriends: Set<number>;
    setGroupSelectedFriends: React.Dispatch<React.SetStateAction<Set<number>>>;
    isCreatingGroup: boolean;
    isInvitingMember: boolean;
    isInviteMemberOpen: boolean;
    setIsInviteMemberOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isSubmittingMessage: boolean;
    isChannelsOpen: boolean;
    setIsChannelsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isNewDmOpen: boolean;
    setIsNewDmOpen: React.Dispatch<React.SetStateAction<boolean>>;
    messageText: string;
    setMessageText: React.Dispatch<React.SetStateAction<string>>;
    typingUser: { userId: number; username?: string } | null;
    partnerLastReadAt: string | null;
    unreadRoomIds: number[];
    hasUnread: boolean;
    lastMessageByRoomId: Record<number, number>;
    messageEndRef: React.RefObject<HTMLDivElement | null>;
    getDmOtherUserId: (room: RoomOut) => number | null;
    getRoomDisplayName: (room: RoomOut) => string;
    renderAvatar: (userId: number) => string;
    handleAvatarError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    formatMsgTime: (iso: string | null) => string;
    formatDateSep: (iso: string | null) => string;
    openProfile: (userId: number) => void;
    handleCreateRoom: () => Promise<void>;
    handleJoinRoom: () => Promise<void>;
    handleSendMessage: () => Promise<void>;
    handleLeaveRoom: () => Promise<void>;
    handleDeleteRoom: () => Promise<void>;
    handleStartDm: (friendId: number) => Promise<void>;
    handleCreateGroup: () => Promise<void>;
    handleInviteMember: (friendId: number) => Promise<void>;
    handleTypingPing: () => void;
    invite: ReturnType<typeof useChatInvite>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChatContext must be used inside ChatProvider");
    return ctx;
}

interface ChatProviderProps {
    initialRoomId?: number | null;
    initialDmUserId?: number | null;
    children: React.ReactNode;
}

export function ChatProvider({ initialRoomId = null, initialDmUserId = null, children }: ChatProviderProps) {
    const value = useChatProviderValue({ initialRoomId, initialDmUserId });
    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
