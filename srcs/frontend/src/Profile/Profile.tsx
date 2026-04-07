import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadImageToCloudinary } from "../utils/cloudinary";
import ProfilePicture from "./ProfilePicture";
import HandleBio from "./Bio";
import { useSearchParams } from "react-router-dom";

type ProfileOut = {
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

type UserLookupOut = {
    id: number;
    username: string;
};

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileOut | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const user = searchParams.get("user");
    const [searchUserId, setSearchUserId] = useState(user ?? "");

    const myUsername = localStorage.getItem("username") ?? "";
    const isMe = !user || user === myUsername;

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
    
        const fetchProfile = async (username: string | null) => {
            try {
                setError(null);
                setSuccess(false);

                // si pas de username (ou si c'est le sien), on charge /me
                if (!username || username === myUsername) {
                    const response = await fetch("/api/profile/me", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!response.ok) {
                        if (response.status === 401) {
                            navigate("/login");
                            return;
                        }
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const data: ProfileOut = await response.json();
                    setProfile(data);
                    setProfilePicture(data.avatar_url ?? null);
                    return;
                }

                // sinon: username -> user_id -> profile
                const lookupResponse = await fetch(`/api/users/by-username/${encodeURIComponent(username)}`);
                if (!lookupResponse.ok) {
                    if (lookupResponse.status === 404) {
                        setError("Utilisateur introuvable");
                        setMessageVisible(true);
                        return;
                    }
                    throw new Error(`HTTP ${lookupResponse.status}`);
                }
                const userData: UserLookupOut = await lookupResponse.json();

                const response = await fetch(`/api/profile/profiles/${encodeURIComponent(String(userData.id))}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        navigate("/login");
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                const data: ProfileOut = await response.json();
                setProfile(data);
                setProfilePicture(data.avatar_url ?? null);
            } catch (error) {
                console.error("Error fetching profile picture:", error);
                setError("Erreur lors du chargement du profil");
                setMessageVisible(true);
            }
        };

        fetchProfile(user);
    }, [navigate, user, myUsername]);

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

            // Mise à jour directe de l'API
            const response = await fetch("/api/profile/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatar_url: imageUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    setError("Session expirée. Veuillez vous reconnecter.");
                    setMessageVisible(true);
                    navigate("/login");
                    return;
                }
                throw new Error(errorData.detail || "Erreur serveur");
            }

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


                    {isMe ? (
                        <HandleBio />
                    ) : (
                        <div className="mt-4 text-sm sm:text-base text-gray-700">
                            <div className="whitespace-pre-wrap break-words">
                                {profile?.bio ?? t("Aucune bio")}
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