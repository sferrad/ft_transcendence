import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ProfilePicture from "../features/profile/components/ProfilePicture";
import HandleBio from "../features/profile/components/Bio";
import { useSearchParams } from "react-router-dom";
import { Handleadd } from "../features/profile/components/AddFriends";
import type { FriendRequestOut, FriendswithStatusOut, ProfileOut } from "../features/profile/types";
import IncomingFriendRequests from "../features/profile/components/IncomingFriendRequests";
import FriendsPanel from "../features/profile/components/FriendsPanel";
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
} from "../features/profile/api/friends";
import { fetchMyProfile, fetchProfileByUserId, fetchUserByUsername, uploadMyAvatar, updateMyProfile } from "../features/profile/api/profile";
import { createRoom, getRooms } from "../features/chat/api";
import { MatchHistory } from "../features/profile/components/MatchHistory";
import { Leaderboard } from "../features/profile/components/Leaderboard";
import { closeSocket } from "../hooks/socketSingleton";

function normalizeAvatarUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith("/profile/avatars/")) {
        return `/api/profile/avatars/${url.slice("/profile/avatars/".length)}`;
    }
    return url;
}

async function loadAvatarForImgSrc(
    token: string,
    normalizedUrl: string | null
): Promise<{ src: string | null; isObjectUrl: boolean }> {
    if (!normalizedUrl) return { src: null, isObjectUrl: false };

    // If the avatar is behind /api/ (protected), <img> won't send Authorization.
    // So we fetch it ourselves and convert it to a blob: URL.
    if (normalizedUrl.startsWith("/api/profile/avatars/")) {
        const response = await fetch(normalizedUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Avatar HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        return { src: objectUrl, isObjectUrl: true };
    }

    // Public URL (Cloudinary, etc.)
    return { src: normalizedUrl, isObjectUrl: false };
}

const COUNTRY_OPTIONS = [
    { value: "France", label: "France" },
    { value: "Belgium", label: "Belgium" },
    { value: "Canada", label: "Canada" },
    { value: "Italy", label: "Italy" },
    { value: "Morocco", label: "Morocco" },
    { value: "Algeria", label: "Algeria" },
    { value: "Tunisia", label: "Tunisia" },
] as const;

const LANGUAGE_OPTIONS = [
    { value: "French", label: "French" },
    { value: "English", label: "English" },
    { value: "Spanish", label: "Spanish" },
] as const;

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const lastAvatarObjectUrlRef = useRef<string | null>(null);
    const [profile, setProfile] = useState<ProfileOut | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewedUserOnline, setViewedUserOnline] = useState<boolean | null>(null);
    const user = searchParams.get("user");
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? Number(userIdParam) : null;
    const [searchUserId, setSearchUserId] = useState(user ?? "");
    const [incomingRequests, setIncomingRequests] = useState<FriendRequestOut[]>([]);
    const [requesterNames, setRequesterNames] = useState<Record<number, string>>({});
    const [showFriends, setShowFriends] = useState(false);
    const [friends, setFriends] = useState<Array<{ userId: number; displayName: string; online: boolean }>>([]);
    const [editableCountry, setEditableCountry] = useState<string>("");
    const [editableLanguage, setEditableLanguage] = useState<string>("");
    const myUsername = localStorage.getItem("username") ?? "";
    const myUserId = Number(localStorage.getItem("user_id") ?? "0");
    const hasAuthToken = Boolean(localStorage.getItem("access_token"));
    const isMe = hasAuthToken && ((!user && !userIdParam) || user === myUsername || (!!userId && myUserId > 0 && userId === myUserId));

    const isAlreadyFriend = !isMe && !!profile?.user_id && friends.some((f) => f.userId === profile.user_id);

    useEffect(() => {
        if (isMe || !profile?.user_id) {
            setViewedUserOnline(null);
            return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) {
            setViewedUserOnline(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const list: FriendswithStatusOut[] = await getFriendsWithStatus(token);
                const match = list.find((f: FriendswithStatusOut) => f.friend_id === profile.user_id);
                if (!cancelled) setViewedUserOnline(match ? match.online : null);
            } catch (e) {
                console.error("Error fetching presence for viewed profile:", e);
                if (!cancelled) setViewedUserOnline(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isMe, profile?.user_id]);

    useEffect(() => {
        if (isMe || !profile?.user_id) {
            setIsBlocking(false);
            return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) {
            setIsBlocking(false);
            return;
        }

        let cancelled = false;

        getBlockedIds(token)
            .then((ids) => {
                if (cancelled) return;
                setIsBlocking(ids.includes(profile.user_id));
            })
            .catch(() => {
                if (cancelled) return;
                setIsBlocking(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isMe, profile?.user_id]);

    useEffect(() => {
        setSearchUserId(user ?? "");
    }, [user]);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        // const token = "demo_token"; // --- IGNORE ---
        // localStorage.setItem("username", "demo_user"); // --- IGNORE ---
        const fetchIncomingRequests = async () => {
            if (!isMe) {
                setIncomingRequests([]);
                return;
            }
            try {
                const data = await fetchIncomingFriendRequests(token);
                setIncomingRequests(data);
                const names = await resolveRequesterNames(token, data);
                setRequesterNames(names);
            } catch (error) {
                console.error("Error fetching incoming friend requests:", error);
            }
        };

        const fetchProfile = async (username: string | null) => {
            try {
                setError(null);
                setSuccess(false);

                // If userId is provided, fetch profile directly by id.
                if (userIdParam) {
                    const idNum = Number(userIdParam);
                    if (!Number.isFinite(idNum) || idNum <= 0) {
                        throw new Error("Invalid userId");
                    }
                    const data = await fetchProfileByUserId(token, idNum);
                    setProfile(data);
                    const { src, isObjectUrl } = await loadAvatarForImgSrc(token, normalizeAvatarUrl(data.avatar_url ?? null));
                    if (lastAvatarObjectUrlRef.current) {
                        URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                        lastAvatarObjectUrlRef.current = null;
                    }
                    if (isObjectUrl && src) lastAvatarObjectUrlRef.current = src;
                    setProfilePicture(src);
                    return;
                }

                // si pas de username (ou si c'est le sien), on charge /me
                if (!username || username === myUsername) {
                    const data = await fetchMyProfile(token);
                    setProfile(data);
                    const { src, isObjectUrl } = await loadAvatarForImgSrc(token, normalizeAvatarUrl(data.avatar_url ?? null));
                    if (lastAvatarObjectUrlRef.current) {
                        URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                        lastAvatarObjectUrlRef.current = null;
                    }
                    if (isObjectUrl && src) lastAvatarObjectUrlRef.current = src;
                    setProfilePicture(src);
                    return;
                }

                // sinon: username -> user_id -> profile
                const userData = await fetchUserByUsername(username);
                const data = await fetchProfileByUserId(token, userData.id);
                setProfile(data);
                const { src, isObjectUrl } = await loadAvatarForImgSrc(token, normalizeAvatarUrl(data.avatar_url ?? null));
                if (lastAvatarObjectUrlRef.current) {
                    URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                    lastAvatarObjectUrlRef.current = null;
                }
                if (isObjectUrl && src) lastAvatarObjectUrlRef.current = src;
                setProfilePicture(src);
            } catch (error) {
                console.error("Error fetching profile picture:", error);
                const message = error instanceof Error ? error.message : "Erreur lors du chargement du profil";
                setError(message);
                
                setProfile(null);
                setProfilePicture(null);
                setViewedUserOnline(null);
                setIsBlocking(false);
                setMessageVisible(true);
            }
        };

        fetchIncomingRequests();
        fetchProfile(user);
    }, [navigate, user, myUsername, isMe, userIdParam]);

    useEffect(() => {
        return () => {
            if (lastAvatarObjectUrlRef.current) {
                URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                lastAvatarObjectUrlRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!isMe || !showFriends) return;

        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const list: FriendswithStatusOut[] = await getFriendsWithStatus(token);

                const profiles = await Promise.all(
                    list.map(async (f: FriendswithStatusOut) => {
                        const id = f.friend_id;
                        try {
                            const p = await fetchProfileByUserId(token, id);
                            return { userId: id, displayName: p.display_name || String(id), online: f.online };
                        } catch {
                            return { userId: id, displayName: String(id), online: f.online };
                        }
                    })
                );

                if (!cancelled) setFriends(profiles);
            } catch (e) {
                console.error("Error fetching friends list:", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isMe, showFriends, navigate]);

    const handleSearchProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = searchUserId.trim();

        if (!trimmed) {
            setSearchParams({});
            return;
        }

        if (trimmed === myUsername) {
            setSearchParams({});
            return;
        }
        setSearchParams({ user: trimmed });
    };

    useEffect(() => {
        if (profile) {
            setEditableCountry(profile.country ?? "");
            setEditableLanguage(profile.language ?? "");
        }
    }, [profile]);

    useEffect(() => {
        if (messageVisible) {
            const timer = setTimeout(() => setMessageVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [messageVisible]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("Token manquant. Veuillez vous reconnecter.");
            setMessageVisible(true);
            setIsLoading(false);
            navigate("/login");
            return;
        }

        try {
            const updatedProfile = await uploadMyAvatar(token, file);
            setProfile(updatedProfile);
            const { src, isObjectUrl } = await loadAvatarForImgSrc(
                token,
                normalizeAvatarUrl(updatedProfile.avatar_url ?? null)
            );
            if (lastAvatarObjectUrlRef.current) {
                URL.revokeObjectURL(lastAvatarObjectUrlRef.current);
                lastAvatarObjectUrlRef.current = null;
            }
            if (isObjectUrl && src) lastAvatarObjectUrlRef.current = src;
            setProfilePicture(src);

            setSuccess(true);
            setMessageVisible(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload";
            setError(errorMessage);
            setMessageVisible(true);
            console.error("Error uploading image:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCountryLanguage = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("Token manquant. Veuillez vous reconnecter.");
            setMessageVisible(true);
            navigate("/login");
            return;
        }

        try {
            const updated = await updateMyProfile(token, {
                country: editableCountry === "" ? null : editableCountry,
                language: editableLanguage === "" ? null : editableLanguage,
            });
            setProfile(updated);
            setSuccess(true);
            setMessageVisible(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
            setSuccess(false);
            setError(msg);
            setMessageVisible(true);
        }
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

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
            } else {
                console.error("Failed to log out:", response.statusText);
            }
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const arcadeButtonBase =
        "hb-tap font-arcade cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadePrimaryButton = `${arcadeButtonBase} px-4 py-2`;
    const arcadeSmallButton = `${arcadeButtonBase} px-3 py-2 text-lg min-[481px]:text-xl`;

    const handleOpenPrivateChat = async () => {
        if (isMe || !profile?.user_id) return;

        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const myId = Number(localStorage.getItem("user_id") ?? "0");
            if (!Number.isFinite(myId) || myId <= 0) {
                throw new Error("Session utilisateur invalide");
            }

            const targetId = profile.user_id;
            const [a, b] = myId < targetId ? [myId, targetId] : [targetId, myId];
            const dmRoomName = `dm-${a}-${b}`;

            const rooms = await getRooms(token);
            let room = rooms.find((r) => r.is_private && r.name === dmRoomName) ?? null;

            if (!room) {
                room = await createRoom(token, { name: dmRoomName, is_private: true });
            }

            navigate(`/chat?roomId=${encodeURIComponent(String(room.id))}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Impossible d'ouvrir le message privé";
            if (msg.toLowerCase().includes("blocked")) {
                setError("Impossible d'envoyer un message privé: cette personne vous a bloqué ou vous l'avez bloquée.");
            } else {
                setError(msg);
            }
            setSuccess(false);
            setMessageVisible(true);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div
                className="fixed inset-0 bg-[url('/assets/bgProfil.jpg')] bg-cover bg-center bg-no-repeat blur-sm"
                aria-hidden="true"
            ></div>

            <div className="relative z-10 min-h-[100dvh] px-4 py-8">
                <button
                    onClick={() => navigate("/")}
                    className={`${arcadePrimaryButton} absolute left-4 top-4 text-2xl min-[481px]:text-3xl text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Home")}
                </button>

                <div className="min-h-[100dvh] flex items-center justify-center">
                    <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-10 shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,46rem)]">
                    <form onSubmit={handleSearchProfile} className="flex flex-col min-[481px]:flex-row gap-3">
                        <input
                            value={searchUserId}
                            onChange={(e) => setSearchUserId(e.target.value)}
                            placeholder={t("Search by username")}
                            className="hb-tap flex-1 px-4 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white/90 text-[#1f2937] text-base focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                        <button
                            type="submit"
                            className={`${arcadePrimaryButton} text-white bg-blue-600 hover:bg-blue-700`}
                        >
                            {t("Search")}
                        </button>
                    </form>

                    <ProfilePicture
                        profilePicture={profilePicture}
                        isLoading={isLoading}
                        onImageUpload={isMe ? handleImageUpload : undefined}
                        presenceOnline={!isMe ? viewedUserOnline : null}
                    />

                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] text-center">
                        {profile?.display_name ?? myUsername}
                    </h1>

                    {isMe && (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setShowFriends((v) => !v)}
                                className={`${arcadePrimaryButton} text-2xl min-[481px]:text-3xl text-white bg-blue-600 hover:bg-blue-700`}
                            >
                                {t("Friends")}
                            </button>
                        </div>
                    )}

                    {isMe && showFriends && (
                        <FriendsPanel
                            title={t("My Friends")}
                            friends={friends}
                            onSelectUserId={(friendUserId) => {
                                setShowFriends(false);
                                if (myUserId > 0 && friendUserId === myUserId) {
                                    setSearchParams({});
                                    return;
                                }
                                setSearchParams({ userId: String(friendUserId) });
                            }}
                        />
                    )}

                    {isMe && (
                        <IncomingFriendRequests
                            title={t("Friend Requests")}
                            subtitle={t("has sent you a request")}
                            acceptLabel={t("Accept")}
                            rejectLabel={t("Reject")}
                            requests={incomingRequests}
                            requesterNames={requesterNames}
                            onAccept={(requestId) => {
                                const token = localStorage.getItem("access_token");
                                if (!token) {
                                    setSuccess(false);
                                    setError("Token manquant. Veuillez vous reconnecter.");
                                    setMessageVisible(true);
                                    navigate("/login");
                                    return;
                                }
                                acceptFriendRequest(token, requestId)
                                    .then(() => {
                                        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
                                        setSuccess(true);
                                        setMessageVisible(true);
                                    })
                                    .catch((err) => {
                                        const msg = err instanceof Error ? err.message : "Erreur lors de l'acceptation";
                                        setSuccess(false);
                                        setError(msg);
                                        setMessageVisible(true);
                                    });
                            }}
                            onReject={(requestId) => {
                                const token = localStorage.getItem("access_token");
                                if (!token) {
                                    setSuccess(false);
                                    setError("Token manquant. Veuillez vous reconnecter.");
                                    setMessageVisible(true);
                                    navigate("/login");
                                    return;
                                }
                                rejectFriendRequest(token, requestId)
                                    .then(() => {
                                        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
                                        setSuccess(true);
                                        setMessageVisible(true);
                                    })
                                    .catch((err) => {
                                        const msg = err instanceof Error ? err.message : "Erreur lors du refus";
                                        setSuccess(false);
                                        setError(msg);
                                        setMessageVisible(true);
                                    });
                            }}
                        />
                    )}

                    {isMe ? (
                        <>
                            <HandleBio />

                            <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
                                <div className="mb-3 font-arcade tracking-wide text-base min-[481px]:text-lg">{t("Country and language")}</div>
                                <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
                                    <div className="flex flex-col gap-2">
                                        <label className="font-medium">{t("Country")}</label>
                                        <select
                                            value={editableCountry}
                                            onChange={(e) => setEditableCountry(e.target.value)}
                                            className="hb-tap min-w-[12rem] px-3 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white text-[#1f2937]"
                                        >
                                            <option value="">-</option>
                                            {COUNTRY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="font-medium">{t("Language")}</label>
                                        <select
                                            value={editableLanguage}
                                            onChange={(e) => setEditableLanguage(e.target.value)}
                                            className="hb-tap min-w-[12rem] px-3 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white text-[#1f2937]"
                                        >
                                            <option value="">-</option>
                                            {LANGUAGE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {t(option.label)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSaveCountryLanguage}
                                        className={`${arcadePrimaryButton} text-white bg-blue-600 hover:bg-blue-700 w-full min-[900px]:w-auto`}
                                    >
                                        {t("Save")}
                                    </button>
                                </div>
                            </div>

                            <MatchHistory userId={myUserId} />
                            <Leaderboard myUserId={myUserId} />
                        </>
                    ) : profile ? (
                        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
                            <div className="mb-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleOpenPrivateChat}
                                    className={`${arcadeSmallButton} text-white text-lg min-[481px]:text-xl bg-[#1f2937] hover:bg-black`}
                                >
                                    {t("Private Message")}
                                </button>
                            </div>

                            <pre className="whitespace-pre-wrap break-words text-sm min-[481px]:text-base font-sans m-0">
                                {profile?.bio ?? t("Aucune bio")}
                            </pre>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isAlreadyFriend) {
                                            const token = localStorage.getItem("access_token");
                                            if (!token) {
                                                setSuccess(false);
                                                setError("Token manquant. Veuillez vous reconnecter.");
                                                setMessageVisible(true);
                                                navigate("/login");
                                                return;
                                            }
                                            removeFriend(token, profile?.user_id ?? 0)
                                                .then(() => {
                                                    setSuccess(true);
                                                    setMessageVisible(true);
                                                    setFriends((prev) => prev.filter((f) => f.userId !== profile?.user_id));
                                                })
                                                .catch((err) => {
                                                    const msg = err instanceof Error ? err.message : "Erreur lors de la suppression d'ami";
                                                    setSuccess(false);
                                                    setError(msg);
                                                    setMessageVisible(true);
                                                });
                                            return;
                                        }

                                        Handleadd(profile?.user_id ?? 0)
                                            .then(() => {
                                                setSuccess(true);
                                                setMessageVisible(true);
                                            })
                                            .catch((err) => {
                                                const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout d'ami";
                                                setSuccess(false);
                                                setError(msg);
                                                setMessageVisible(true);
                                            });
                                    }}
                                    className={`${arcadeSmallButton} ${
                                        isAlreadyFriend
                                            ? "text-white text-lg min-[481px]:text-xl bg-red-600 hover:bg-red-700"
                                            : "text-white text-lg min-[481px]:text-xl bg-blue-600 hover:bg-blue-700"
                                    }`}
                                >
                                    👥 {isAlreadyFriend ? t("Remove Friend") : t("Add Friend")}
                                </button>

                                {!isMe && profile?.user_id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const token = localStorage.getItem("access_token");
                                            if (!token) {
                                                navigate("/login");
                                                return;
                                            }

                                            const targetUserId = profile.user_id;

                                            const action = isBlocking
                                                ? unblockFriend(token, targetUserId)
                                                : blockFriend(token, targetUserId);

                                            action
                                                .then(() => {
                                                    const next = !isBlocking;
                                                    setIsBlocking(next);
                                                    setSuccess(true);
                                                    setMessageVisible(true);
                                                })
                                                .catch((err) => {
                                                    const msg = err instanceof Error ? err.message : "Erreur";
                                                    setSuccess(false);
                                                    setError(msg);
                                                    setMessageVisible(true);
                                                });
                                        }}
                                        className={`${arcadeSmallButton} ${
                                            isBlocking
                                                ? "text-white text-lg min-[481px]:text-xl bg-[#4AD95A] hover:bg-green-600"
                                                : "text-white text-lg min-[481px]:text-xl bg-red-600 hover:bg-red-700"
                                        }`}
                                    >
                                        {isBlocking ? t("Unblock") : t("Block")}
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 min-[481px]:grid-cols-2 gap-3 text-sm text-[#1f2937]">
                                <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-3">
                                    <div className="font-arcade tracking-wide text-base min-[481px]:text-lg">{t("Country")}</div>
                                    <div className="mt-1">{profile?.country ?? "-"}</div>
                                </div>
                                <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-3">
                                    <div className="font-arcade tracking-wide text-base min-[481px]:text-lg">{t("Language")}</div>
                                    <div className="mt-1">{profile?.language ?? "-"}</div>
                                </div>
                            </div>

                            {profile?.user_id && (
                                <MatchHistory userId={profile.user_id} isSelf={false} />
                            )}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
                            <div className="whitespace-pre-wrap break-words text-sm min-[481px]:text-base">{t('User not found')}</div>
                        </div>
                    )}

                    <div className="border-t-2 border-[#2b2b2b] my-6" />

                    <div className="space-y-3 min-h-[70px]">
                        {messageVisible && error && (
                            <div className="w-full px-4 py-3 bg-white/85 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] text-[#1f2937]">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-sm min-[481px]:text-base font-medium">{t(error)}</span>
                                </div>
                            </div>
                        )}

                        {messageVisible && success && (
                            <div className="w-full px-4 py-3 bg-white/85 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] text-[#1f2937]">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-sm min-[481px]:text-base font-medium">✓ {t("Success!")}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className={`w-full mt-6 ${arcadePrimaryButton} text-4xl text-white bg-red-600 hover:bg-red-700`}
                    >
                        {t("Logout")}
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;