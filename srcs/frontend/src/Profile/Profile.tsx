import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadImageToCloudinary } from "../utils/cloudinary";
import ProfilePicture from "./ProfilePicture";
import HandleBio from "./Bio";
import { useSearchParams } from "react-router-dom";
import { Handleadd } from "./Friends/AddFriends";
import type { FriendRequestOut, ProfileOut } from "./types";
import IncomingFriendRequests from "./components/IncomingFriendRequests";
import FriendsPanel from "./components/FriendsPanel";
import {
    acceptFriendRequest,
    getFriendsList,
    fetchIncomingFriendRequests,
    rejectFriendRequest,
    resolveRequesterNames,
    unblockFriend,
    blockFriend,
} from "./api/friends";
import { fetchMyProfile, fetchProfileByUserId, fetchUserByUsername, updateMyAvatar } from "./api/profile";

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileOut | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const user = searchParams.get("user");
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? Number(userIdParam) : null;
    const [searchUserId, setSearchUserId] = useState(user ?? "");
    const [incomingRequests, setIncomingRequests] = useState<FriendRequestOut[]>([]);
    const [requesterNames, setRequesterNames] = useState<Record<number, string>>({});
    const [showFriends, setShowFriends] = useState(false);
    const [friends, setFriends] = useState<Array<{ userId: number; displayName: string }>>([]);
    const myUsername = localStorage.getItem("username") ?? "";
    const myUserId = Number(localStorage.getItem("user_id") ?? "0");
    const isMe = (!user && !userIdParam) || user === myUsername || (!!userId && myUserId > 0 && userId === myUserId);

    const isAlreadyFriend = !isMe && !!profile?.user_id && friends.some((f) => f.userId === profile.user_id);

    useEffect(() => {
        if (isMe || !profile?.user_id) return;
        const key = `blocked:${profile.user_id}`;
        setIsBlocking(localStorage.getItem(key) === "1");
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
                    setProfilePicture(data.avatar_url ?? null);
                    return;
                }

                // si pas de username (ou si c'est le sien), on charge /me
                if (!username || username === myUsername) {
                    const data = await fetchMyProfile(token);
                    setProfile(data);
                    setProfilePicture(data.avatar_url ?? null);
                    return;
                }

                // sinon: username -> user_id -> profile
                const userData = await fetchUserByUsername(username);
                const data = await fetchProfileByUserId(token, userData.id);
                setProfile(data);
                setProfilePicture(data.avatar_url ?? null);
            } catch (error) {
                console.error("Error fetching profile picture:", error);
                const message = error instanceof Error ? error.message : "Erreur lors du chargement du profil";
                setError(message);
                setMessageVisible(true);
            }
        };

        fetchIncomingRequests();
        fetchProfile(user);
    }, [navigate, user, myUsername, isMe, userIdParam]);

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
                const list = await getFriendsList(token);
                const friendIds = list.map((f) => f.friend_id);

                const profiles = await Promise.all(
                    friendIds.map(async (id) => {
                        try {
                            const p = await fetchProfileByUserId(token, id);
                            return { userId: id, displayName: p.display_name || String(id) };
                        } catch {
                            return { userId: id, displayName: String(id) };
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
            const imageUrl = await uploadImageToCloudinary(file);
            setProfilePicture(imageUrl);

            await updateMyAvatar(token, imageUrl);

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

    return (
        <div className="relative min-h-screen w-full bg-[url('/assets/bgProfil.png')] bg-cover bg-center bg-no-repeat overflow-auto py-8 px-4 sm:px-6 md:px-8">

            {/* Container Principal */}
            <div className="flex items-center justify-center min-h-[calc(100vh-2rem)]">
                <div className="w-full max-w-md bg-white bg-opacity-90 p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl backdrop-blur-sm">
                    <form onSubmit={handleSearchProfile} className="mt-3 flex gap-2 ">
                        <input
                            value={searchUserId}
                            onChange={(e) => setSearchUserId(e.target.value)}
                            placeholder={t("Rechercher un profil")}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-semibold transition-colors text-sm sm:text-base"
                        >
                            {t("Rechercher")}
                        </button>
                    </form>
                  
                    {/* Profile Picture Component */}
                    <ProfilePicture
                        profilePicture={profilePicture}
                        isLoading={isLoading}
                        onImageUpload={isMe ? handleImageUpload : undefined}
                    />
                    <h1 className="text-5xl font-arcade text-center text-gray-800">
                        {profile?.display_name ?? myUsername}
                    </h1>

                    {isMe && (
                        <div className="mt-3 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setShowFriends((v) => !v)}
                                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-semibold transition-colors text-sm"
                            >
                                {t("Friends")}
                            </button>
                        </div>
                    )}
                    
                    {isMe && showFriends && (
                        <FriendsPanel
                            title={t("Mes amis")}
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
                            title={t("Demandes d'amis")}
                            subtitle={t("t'a envoyé une demande")}
                            acceptLabel={t("Accepter")}
                            rejectLabel={t("Refuser")}
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
                        <HandleBio />
                    ) : (
                        <div className="mt-4 text-sm sm:text-base text-gray-700">
                            <div className="whitespace-pre-wrap break-words">
                                {profile?.bio ?? t("Aucune bio")}
                                <button
                                    onClick={() => {
                                        if (isAlreadyFriend) {
                                            // Placeholder: remove friend will be wired later (no fetch here by request)
                                            setSuccess(false);
                                            setError("Suppression d'ami: à implémenter");
                                            setMessageVisible(true);
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
                                    className={
                                        "ml-4 px-3 py-1 text-white font-semibold rounded-lg transition-colors text-xs sm:text-sm " +
                                        (isAlreadyFriend ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600")
                                    }
                                >
                                    👥 {isAlreadyFriend ? t("Supprimer l'ami") : t("Add Friend")}
                                </button>
                              {/* Block / Unblock (toggle) */}
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
                                    const key = `blocked:${targetUserId}`;

                                    const action = isBlocking
                                        ? unblockFriend(token, targetUserId)
                                        : blockFriend(token, targetUserId);

                                    action
                                        .then(() => {
                                            const next = !isBlocking;
                                            setIsBlocking(next);
                                            if (next) localStorage.setItem(key, "1");
                                            else localStorage.removeItem(key);
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
                                className={
                                    "ml-2 px-3 py-1 rounded-lg text-white font-semibold transition-colors text-sm " +
                                    (isBlocking ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600")
                                }
                            >
                                {isBlocking ? t("Débloquer") : t("Bloquer")}
                            </button>
                    )}
                            </div>
                        </div>
                    )}
    
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                        <div className="rounded-lg bg-gray-100 px-3 py-2">
                            <div className="font-semibold">{t("Pays")}</div>
                            <div>{profile?.country ?? "-"}</div>
                        </div>
                        <div className="rounded-lg bg-gray-100 px-3 py-2">
                            <div className="font-semibold">{t("Langue")}</div>
                            <div>{profile?.language ?? "-"}</div>
                        </div>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-gray-300 mb-6 md:mb-8" />

                    {/* Messages */}
                    <div className="space-y-3 min-h-[70px]">
                        {messageVisible && error && (
                            <div className="w-full p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </div>
                        )}

                        {messageVisible && success && (
                            <div className="w-full p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium">✓ {t("Succès!")}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Bio Component */}
                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full mt-6 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                    >
                        {t("Logout")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Profile;