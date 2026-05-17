export type ProfileOut = {
    id: number;
    user_id: number;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    country: string | null;
    language: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type FriendswithStatusOut = {
    friend_id: number;
    created_at?: string | null;
    online: boolean;
};

export type PresencePingOut = {
    ok: boolean;
    ttl_seconds: number;
};

export type UserLookupOut = {
    id: number;
    username: string;
};

export type FriendRequestOut = {
    id: number;
    from_user_id: number;
    to_user_id: number;
    status: string;
    created_at?: string | null;
    updated_at?: string | null;
};

export type FriendOut = {
    friend_id: number;
    created_at?: string | null;
};

export type RoomOut = {
    id: number;
    name: string;
    is_private: boolean;
    owner_user_id: number;
    created_at?: string | null;
};

export type RoomCreate = {
    name: string;
    is_private: boolean;
};

export type MessageOut = {
    sender_user_id: number;
    room_id: number;
    content: string;
    created_at?: string | null;
};

export type PrivateMessageOut = {
    id: number;
    sender_user_id: number;
    receiver_user_id: number;
    content: string;
    created_at?: string | null;
};

export type MessageCreate = {
    content: string;
};

export type JoinRoomOut = {
    ok: boolean;
    room_id: number;
};

export type LeaveRoomOut = {
    ok: boolean;
    room_id: number;
};

export type DeleteRoomOut = {
    ok: boolean;
    room_id: number;
};