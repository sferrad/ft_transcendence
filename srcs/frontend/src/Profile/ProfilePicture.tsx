import { useEffect, useState } from "react";

interface ProfilePictureProps {
    profilePicture: string | null;
    isLoading: boolean;
    onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

function ProfilePicture({ profilePicture, isLoading, onImageUpload }: ProfilePictureProps) {
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [profilePicture]);

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="flex flex-col items-center gap-4 mb-6 md:mb-8">
            {/* Profile Picture */}
            <div className="relative mt-4">
                <img
                    src={imageError ? '/assets/default-profile.jpg' : (profilePicture || '/assets/default-profile.jpg')}
                    alt="Profile Picture"
                    onError={handleImageError}
                    className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <div className="absolute inset-0 rounded-full bg-black opacity-0 hover:opacity-10 transition-opacity" />
            </div>

            {/* File Upload Input */}
            {onImageUpload && (
                <div className="w-full max-w-xs">
                    <label 
                        htmlFor="image-upload" 
                        className="flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer transition-colors disabled:bg-gray-400"
                    >
                        Modifier la photo
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={onImageUpload}
                        disabled={isLoading}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}

export default ProfilePicture;
