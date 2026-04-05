import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadImageToCloudinary } from "../utils/cloudinary";

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }
    
        const fetchProfilePicture = async () => {
            try {
                const response = await fetch("/api/profile/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                setProfilePicture(data.avatar_url ?? null);
            } catch (error) {
                console.error("Error fetching profile picture:", error);
                setError("Erreur lors du chargement du profil");
            }
        };

        fetchProfilePicture();
    }, [navigate]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Upload l'image vers Cloudinary
            const imageUrl = await uploadImageToCloudinary(file);
            setProfilePicture(imageUrl);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload";
            setError(errorMessage);
            console.error("Error uploading image:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("Token manquant. Veuillez vous reconnecter.");
            navigate("/login");
            return;
        }

        if (!profilePicture) {
            setError("Veuillez d'abord charger une image");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log("Token:", token); // DEBUG
            const response = await fetch("/api/profile/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatar_url: profilePicture }),
            });
            
            console.log("Response status:", response.status); // DEBUG
            console.log("Response status:", response.status); // DEBUG
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("API Error:", errorData); // DEBUG
                if (response.status === 401) {
                    setError("Session expirée. Veuillez vous reconnecter.");
                    navigate("/login");
                    return;
                }
                throw new Error(errorData.detail || "Erreur serveur");
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
            setError(errorMessage);
            console.error("Error updating profile picture:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgProfil.png')] bg-cover bg-center bg-no-repeat overflow-auto">
            <img 
                src={profilePicture || '/assets/default-profile.jpg'} 
                alt="Profile Picture"
                className="w-32 h-32 rounded-full object-cover mx-auto mt-8"
            />
            <form 
                onSubmit={handleSubmit} 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-75 p-6 rounded-lg shadow-lg w-96"
            >
                <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">
                        {t("Sélectionner une image")}
                    </label>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={isLoading}
                        className="w-full p-2 border border-gray-300 rounded"
                    />
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                        ✓ {t("Succès!")}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading || !profilePicture}
                    className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition"
                >
                    {isLoading ? "Chargement..." : t("Mettre à jour la photo")}
                </button>
            </form>
        </div>
    );
}

export default Profile;