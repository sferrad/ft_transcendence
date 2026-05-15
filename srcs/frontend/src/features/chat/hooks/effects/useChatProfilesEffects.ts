import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { MessageOut, ProfileOut, RoomOut } from "../../../profile/types";
import { fetchProfileByUserId } from "../../../profile/api/profile";

interface UseChatProfilesEffectsParams {
    token: string | null;
    currentUserId: number;
    rooms: RoomOut[];
    allFriendIds: number[];
    messages: MessageOut[];
    profiles: Record<number, ProfileOut>;
    getDmOtherUserId: (room: RoomOut) => number | null;
    resolveAvatarUrl: (avatarUrl: string | null | undefined) => string | null;
    avatarBlobsRef: MutableRefObject<Record<number, string>>;
    setProfiles: Dispatch<SetStateAction<Record<number, ProfileOut>>>;
    setAvatarBlobs: Dispatch<SetStateAction<Record<number, string>>>;
}

export function useChatProfilesEffects({
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
}: UseChatProfilesEffectsParams) {
    const hydrateProfilesByUserIds = useCallback(async (userIds: number[]) => {
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
    }, [profiles, setProfiles, token]);

    const hydrateProfiles = useCallback(async (nextMessages: MessageOut[]) => {
        const uniqueUserIds = Array.from(new Set(nextMessages.map((m) => m.sender_user_id)));
        await hydrateProfilesByUserIds(uniqueUserIds);
    }, [hydrateProfilesByUserIds]);

    const fetchAvatarBlob = useCallback(async (userId: number, avatarUrl: string) => {
        if (!token) return;
        const response = await fetch(avatarUrl, { headers: { Authorization: `Bearer ${token}` } });
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
    }, [avatarBlobsRef, setAvatarBlobs, token]);

    useEffect(() => {
        if (allFriendIds.length === 0) return;
        hydrateProfilesByUserIds(allFriendIds).catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allFriendIds]);

    useEffect(() => {
        if (!messages.length) return;
        hydrateProfiles(messages).catch(() => undefined);
    }, [messages, hydrateProfiles]);

    useEffect(() => {
        if (!token || currentUserId <= 0 || rooms.length === 0) return;
        const partnerIds = Array.from(
            new Set(rooms.map((room) => getDmOtherUserId(room)).filter((id): id is number => typeof id === "number" && id > 0))
        );
        if (partnerIds.length === 0) return;
        hydrateProfilesByUserIds(partnerIds).catch(() => undefined);
    }, [token, currentUserId, rooms, getDmOtherUserId, hydrateProfilesByUserIds]);

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
    }, [profiles, resolveAvatarUrl, fetchAvatarBlob, avatarBlobsRef]);

    useEffect(() => {
        return () => {
            Object.values(avatarBlobsRef.current).forEach((url) => URL.revokeObjectURL(url));
        };
    }, [avatarBlobsRef]);

    return { hydrateProfilesByUserIds };
}
