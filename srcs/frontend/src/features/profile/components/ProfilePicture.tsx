import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_AVATAR } from "../../../utils/defaultAvatar";

interface ProfilePictureProps {
    profilePicture: string | null;
    isLoading: boolean;
    onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    presenceOnline?: boolean | null;
}

function ProfilePicture({ profilePicture, isLoading, onImageUpload, presenceOnline }: ProfilePictureProps) {
    const { t } = useTranslation();
    const [imageError, setImageError] = useState(false);

    const resolvedProfileSrc =
        profilePicture && profilePicture.startsWith("/profile/") ? `/api${profilePicture}` : profilePicture;

    useEffect(() => {
        setImageError(false);
    }, [profilePicture]);

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="flex flex-col items-center gap-4 mb-6 md:mb-8 mt-4">
            {/* Profile Picture */}
            <div className="relative">
                <img
                    src={
                        imageError
                            ? DEFAULT_AVATAR
                            : (resolvedProfileSrc || DEFAULT_AVATAR)
                    }
                    alt={t("Profile Picture")}
                    onError={handleImageError}
                    className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#2b2b2b] shadow-[4px_4px_0_#2b2b2b]"
                />
                <div className="absolute inset-0 rounded-full bg-black opacity-0 hover:opacity-10 transition-opacity" />

                {typeof presenceOnline === "boolean" && (
                    <span
                        className={[
                            "absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-[#2b2b2b]",
                            presenceOnline ? "bg-green-500" : "bg-red-700",
                        ].join(" ")}
                        aria-label={presenceOnline ? t("Online") : t("Offline")}
                    />
                )}
            </div>

            {/* File Upload Input */}
            {onImageUpload && (
                <div className="w-full max-w-xs">
                    <label 
                        htmlFor="image-upload" 
                        className="hb-tap text-lg font-arcade cursor-pointer flex items-center justify-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] transition-transform duration-100 active:translate-y-0.5 disabled:bg-gray-400"
                    >
                        {t("Change Profile Picture")}
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
