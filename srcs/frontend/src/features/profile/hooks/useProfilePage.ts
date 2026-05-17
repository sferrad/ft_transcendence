import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { FriendRequestOut, FriendswithStatusOut, ProfileOut } from "../types";
import {
    acceptFriendRequest,
    fetchIncomingFriendRequests,
    rejectFriendRequest,
    resolveRequesterNames,
    unblockFriend,
    blockFriend,
    getBlockedIds,
    getFriendsWithStatus,
    removeFriend,
} from "../api/friends";
import { fetchMyProfile, fetchProfileByUserId, fetchUserByUsername, uploadMyAvatar, updateMyProfile } from "../api/profile";
import { createRoom, getRooms } from "../../chat/api";
import { closeSocket } from "../../../hooks/socketSingleton";
import { normalizeAvatarUrl, loadAvatarForImgSrc } from "../utils/avatarUtils";
import { Handleadd } from "../components/AddFriends";

export function useProfilePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const user = searchParams.get("user");
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? Number(userIdParam) : null;

    const myUsername = localStorage.getItem("username") ?? "";
    const myUserId = Number(localStorage.getItem("user_id") ?? "0");
    const hasAuthToken = Boolean(localStorage.getItem("access_token"));
    const isMe = hasAuthToken && ((!user && !userIdParam) || user === myUsername || (!!userId && myUserId > 0 && userId === myUserId));

    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const lastAvatarObjectUrlRef = useRef<string | null>(null);
    const [profile, setProfile] = useState<ProfileOut | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [viewedUserOnline, setViewedUserOnline] = useState<boolean | null>(null);
    const [searchUserId, setSearchUserId] = useState(user ?? "");
    const [incomingRequests, setIncomingRequests] = useState<FriendRequestOut[]>([]);
    const [requesterNames, setRequesterNames] = useState<Record<number, string>>({});
    const [showFriends, setShowFriends] = useState(false);
    const [friends, setFriends] = useState<Array<{ userId: number; displayName: string; online: boolean }>>([]);
    const [editableCountry, setEditableCountry] = useState("");
    const [editableLanguage, setEditableLanguage] = useState("");

    const isAlreadyFriend = !isMe && !!profile?.user_id && friends.some((f) => f.userId === profile.user_id);

    const showFeedback = (isSuccess: boolean, msg: string | null = null) => {
        setSuccess(isSuccess);
        setError(msg);
        setMessageVisible(true);
    };

    const applyAvatarSrc = async (token: string, avatarUrl: string | null) => {
        const { src, isObjectUrl } = await loadAvatarForImgSrc(token, normalizeAvatarUrl(avatarUrl));
        if (lastAvatarObjectUrlRef.current) {
            URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
            lastAvatarObjectUrlRef.current = null;
        }
        if (isObjectUrl && src) lastAvatarObjectUrlRef.current = src;
        setProfilePicture(src);
    };

    // Sync search input with URL param
    useEffect(() => { setSearchUserId(user ?? "") }, [user]);

    // Sync editable fields with profile
    useEffect(() => {
        if (profile) {
            setEditableCountry(profile.country ?? "");
            setEditableLanguage(profile.language ?? "");
        }
    }, [profile]);

    // Auto-hide feedback after 3s
    useEffect(() => {
        if (!messageVisible) return;
        const timer = setTimeout(() => setMessageVisible(false), 3000);
        return () => clearTimeout(timer);
    }, [messageVisible]);

    // Revoke blob URL on unmount
    useEffect(() => {
        return () => {
            if (lastAvatarObjectUrlRef.current) {
                URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                lastAvatarObjectUrlRef.current = null;
            }
        };
    }, []);

    // Load profile + incoming requests
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }

        const fetchIncoming = async () => {
            if (!isMe) { setIncomingRequests([]); return; }
            try {
                const data = await fetchIncomingFriendRequests(token);
                setIncomingRequests(data);
                const names = await resolveRequesterNames(token, data);
                setRequesterNames(names);
            } catch (e) {
                console.error("Error fetching incoming friend requests:", e);
            }
        };

        const fetchProfile = async () => {
            try {
                setError(null);
                setSuccess(false);
                let data: ProfileOut;

                if (userIdParam) {
                    const idNum = Number(userIdParam);
                    if (!Number.isFinite(idNum) || idNum <= 0) throw new Error("Invalid userId");
                    data = await fetchProfileByUserId(token, idNum);
                } else if (!user || user === myUsername) {
                    data = await fetchMyProfile(token);
                } else {
                    const userData = await fetchUserByUsername(user);
                    data = await fetchProfileByUserId(token, userData.id);
                }

                setProfile(data);
                await applyAvatarSrc(token, data.avatar_url ?? null);
            } catch (error) {
                console.error("Error fetching profile:", error);
                setProfile(null);
                setProfilePicture(null);
                setViewedUserOnline(null);
                setIsBlocking(false);
                showFeedback(false, error instanceof Error ? error.message : "Erreur lors du chargement du profil");
            }
        };

        fetchIncoming();
        fetchProfile();
    }, [navigate, user, myUsername, isMe, userIdParam]);

    // Fetch online status of viewed user
    useEffect(() => {
        if (isMe || !profile?.user_id) { setViewedUserOnline(null); return; }
        const token = localStorage.getItem("access_token");
        if (!token) { setViewedUserOnline(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const list: FriendswithStatusOut[] = await getFriendsWithStatus(token);
                const match = list.find((f) => f.friend_id === profile.user_id);
                if (!cancelled) setViewedUserOnline(match ? match.online : null);
            } catch { if (!cancelled) setViewedUserOnline(null); }
        })();
        return () => { cancelled = true; };
    }, [isMe, profile?.user_id]);

    // Fetch block status
    useEffect(() => {
        if (isMe || !profile?.user_id) { setIsBlocking(false); return; }
        const token = localStorage.getItem("access_token");
        if (!token) { setIsBlocking(false); return; }
        let cancelled = false;
        getBlockedIds(token)
            .then((ids) => { if (!cancelled) setIsBlocking(ids.includes(profile.user_id)); })
            .catch(() => { if (!cancelled) setIsBlocking(false); });
        return () => { cancelled = true; };
    }, [isMe, profile?.user_id]);

    // Fetch friends list when panel opens
    useEffect(() => {
        if (!isMe || !showFriends) return;
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        let cancelled = false;
        (async () => {
            try {
                const list: FriendswithStatusOut[] = await getFriendsWithStatus(token);
                const profiles = await Promise.all(
                    list.map(async (f) => {
                        try {
                            const p = await fetchProfileByUserId(token, f.friend_id);
                            return { userId: f.friend_id, displayName: p.display_name || String(f.friend_id), online: f.online };
                        } catch {
                            return { userId: f.friend_id, displayName: String(f.friend_id), online: f.online };
                        }
                    })
                );
                if (!cancelled) setFriends(profiles);
            } catch (e) { console.error("Error fetching friends:", e); }
        })();
        return () => { cancelled = true; };
    }, [isMe, showFriends, navigate]);

    const handleSearchProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = searchUserId.trim();
        if (!trimmed || trimmed === myUsername) { setSearchParams({}); return; }
        setSearchParams({ user: trimmed });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        try {
            const updatedProfile = await uploadMyAvatar(token, file);
            setProfile(updatedProfile);
            await applyAvatarSrc(token, updatedProfile.avatar_url ?? null);
            showFeedback(true);
        } catch (error) {
            showFeedback(false, error instanceof Error ? error.message : "Erreur lors de l'upload");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCountryLanguage = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        try {
            const updated = await updateMyProfile(token, {
                country: editableCountry || null,
                language: editableLanguage || null,
            });
            setProfile(updated);
            showFeedback(true);
        } catch (err) {
            showFeedback(false, err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
        }
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                closeSocket();
                localStorage.removeItem("access_token");
                localStorage.removeItem("username");
                localStorage.removeItem("email");
                localStorage.removeItem("user_id");
                navigate("/login");
            }
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleOpenPrivateChat = async () => {
        if (isMe || !profile?.user_id) return;
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        try {
            const myId = Number(localStorage.getItem("user_id") ?? "0");
            if (!Number.isFinite(myId) || myId <= 0) throw new Error("Session utilisateur invalide");
            const [a, b] = myId < profile.user_id ? [myId, profile.user_id] : [profile.user_id, myId];
            const dmRoomName = `dm-${a}-${b}`;
            const rooms = await getRooms(token);
            let room = rooms.find((r) => r.is_private && r.name === dmRoomName) ?? null;
            if (!room) room = await createRoom(token, { name: dmRoomName, is_private: true });
            navigate(`/chat?roomId=${encodeURIComponent(String(room.id))}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Impossible d'ouvrir le message privé";
            showFeedback(false, msg.toLowerCase().includes("blocked")
                ? "Impossible d'envoyer un message privé: cette personne vous a bloqué ou vous l'avez bloquée."
                : msg);
        }
    };

    const handleToggleFriend = () => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        const targetId = profile?.user_id ?? 0;
        const action = isAlreadyFriend
            ? removeFriend(token, targetId).then(() => setFriends((prev) => prev.filter((f) => f.userId !== targetId)))
            : (Handleadd(targetId) as Promise<void>);
        action.then(() => showFeedback(true))
              .catch((err) => showFeedback(false, err instanceof Error ? err.message : "Erreur"));
    };

    const handleToggleBlock = () => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        const targetId = profile?.user_id ?? 0;
        const action = isBlocking ? unblockFriend(token, targetId) : blockFriend(token, targetId);
        action.then(() => { setIsBlocking((v) => !v); showFeedback(true); })
              .catch((err) => showFeedback(false, err instanceof Error ? err.message : "Erreur"));
    };

    const handleAcceptRequest = (requestId: number) => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        acceptFriendRequest(token, requestId)
            .then(() => { setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId)); showFeedback(true); })
            .catch((err) => showFeedback(false, err instanceof Error ? err.message : "Erreur"));
    };

    const handleRejectRequest = (requestId: number) => {
        const token = localStorage.getItem("access_token");
        if (!token) { navigate("/login"); return; }
        rejectFriendRequest(token, requestId)
            .then(() => { setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId)); showFeedback(true); })
            .catch((err) => showFeedback(false, err instanceof Error ? err.message : "Erreur"));
    };

    return {
        profile, profilePicture, isLoading,
        error, success, messageVisible,
        isMe, isBlocking, viewedUserOnline, isAlreadyFriend,
        incomingRequests, requesterNames,
        showFriends, setShowFriends,
        friends,
        editableCountry, setEditableCountry,
        editableLanguage, setEditableLanguage,
        searchUserId, setSearchUserId,
        myUserId, myUsername,
        searchParams, setSearchParams,
        handleSearchProfile,
        handleImageUpload,
        handleSaveCountryLanguage,
        handleLogout,
        handleOpenPrivateChat,
        handleToggleFriend,
        handleToggleBlock,
        handleAcceptRequest,
        handleRejectRequest,
    };
}

