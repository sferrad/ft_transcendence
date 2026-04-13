import { useState, useEffect } from "react";


const HandleBio = () => {
    const [bio, setBio] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getCurrentBio();
    }, []);

    const getCurrentBio = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                throw new Error("User not authenticated");
            }
            const response = await fetch("/api/profile/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setBio(data.bio || "");
            setError(null);
        } catch (error) {
            console.error("Error fetching bio:", error);
            setError("Erreur lors du chargement de la bio");
        }
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem("access_token");
            if (!token) {
                throw new Error("User not authenticated");
            }
            const response = await fetch("/api/profile/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ bio }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Erreur lors de la sauvegarde");
            }
            
            setIsEditing(false);
            await getCurrentBio();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
            console.error("Error saving bio:", error);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const arcadeButtonBase =
        "hb-tap font-arcade cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeSmallButton = `${arcadeButtonBase} px-4 py-2 text-sm min-[481px]:text-base`;

    return (
        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
            {error && (
                <div className="mb-4 px-4 py-3 bg-white/85 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] text-[#1f2937]">
                    {error}
                </div>
            )}
            {isEditing ? (
                <div className="flex flex-col gap-4">
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#2b2b2b] bg-white/90 text-[#1f2937] rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                        rows={4}
                        disabled={isLoading}
                    />
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={`${arcadeSmallButton} text-white bg-[#4AD95A] hover:bg-green-600 disabled:bg-gray-400`}
                        >
                            {isLoading ? "Sauvegarde..." : "Save"}
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            disabled={isLoading}
                            className={`${arcadeSmallButton} text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-4">
                    <p className="text-sm min-[481px]:text-base whitespace-pre-wrap break-words flex-1">{bio || "No bio set yet."}</p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className={`${arcadeSmallButton} text-white bg-blue-600 hover:bg-blue-700 flex-shrink-0`}
                    >
                        Edit
                    </button>
                </div>
            )}
        </div>
    );
}

export default HandleBio;