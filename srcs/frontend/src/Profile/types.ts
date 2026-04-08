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
