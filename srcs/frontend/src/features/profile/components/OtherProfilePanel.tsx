import { useTranslation } from "react-i18next";
import type { ProfileOut } from "../types";
import { MatchHistory } from "./MatchHistory";

interface OtherProfilePanelProps {
    profile: ProfileOut;
    isAlreadyFriend: boolean;
    isBlocking: boolean;
    onOpenChat: () => void;
    onToggleFriend: () => void;
    onToggleBlock: () => void;
    arcadeSmallButtonClass: string;
}

export function OtherProfilePanel({
    profile,
    isAlreadyFriend,
    isBlocking,
    onOpenChat,
    onToggleFriend,
    onToggleBlock,
    arcadeSmallButtonClass,
}: OtherProfilePanelProps) {
    const { t } = useTranslation();

    return (
        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
            <div className="mb-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={onOpenChat}
                    className={`${arcadeSmallButtonClass} text-white text-lg min-[481px]:text-xl bg-[#1f2937] hover:bg-black`}
                >
                    {t("Private Message")}
                </button>
            </div>

            <pre className="whitespace-pre-wrap break-words text-sm min-[481px]:text-base font-sans m-0">
                {profile.bio ?? t("Aucune bio")}
            </pre>

            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={onToggleFriend}
                    className={`${arcadeSmallButtonClass} ${
                        isAlreadyFriend
                            ? "text-white text-lg min-[481px]:text-xl bg-red-600 hover:bg-red-700"
                            : "text-white text-lg min-[481px]:text-xl bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    👥 {isAlreadyFriend ? t("Remove Friend") : t("Add Friend")}
                </button>

                {profile.user_id && (
                    <button
                        type="button"
                        onClick={onToggleBlock}
                        className={`${arcadeSmallButtonClass} ${
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
                    <div className="mt-1">{profile.country ?? "-"}</div>
                </div>
                <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-3">
                    <div className="font-arcade tracking-wide text-base min-[481px]:text-lg">{t("Language")}</div>
                    <div className="mt-1">{profile.language ?? "-"}</div>
                </div>
            </div>

            {profile.user_id && <MatchHistory userId={profile.user_id} isSelf={false} />}
        </div>
    );
}
