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

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}
            {isEditing ? (
                <div className="flex flex-col gap-4">
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        disabled={isLoading}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                        >
                            {isLoading ? "Sauvegarde..." : "Save"}
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className="text-gray-700">{bio || "No bio set yet."}</p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Edit
                    </button>
                </div>
            )}
        </div>
    );
}

export default HandleBio;