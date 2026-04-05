// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "your_cloud_name";

interface UploadResponse {
    url: string;
    public_id: string;
    secure_url: string;
}

/**
 * Upload une image vers Cloudinary (unsigned - mode public)
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
        if (!file) {
            throw new Error("Aucun fichier sélectionné");
        }

        const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!validImageTypes.includes(file.type)) {
            throw new Error("Format d'image non supporté. Utilisez JPG, PNG, WebP ou GIF");
        }

        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxFileSize) {
            throw new Error("L'image est trop grande (max 5MB)");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset");
        formData.append("folder", "ft_transcendence/profiles");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(`Erreur Cloudinary: ${response.statusText}`);
        }

        const data: UploadResponse = await response.json();
        return data.secure_url;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur d'upload";
        console.error("Erreur upload Cloudinary:", errorMessage);
        throw error;
    }
};