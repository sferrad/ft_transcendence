import { useTranslation } from "react-i18next";
import { useChatContext } from "../ChatContext";

export function MessageInput() {
    const { t } = useTranslation();
    const {
        selectedRoom,
        isMember,
        selectedRoomId,
        isSelectedRoomDm,
        messageText,
        setMessageText,
        isSubmittingMessage,
        currentUserId,
        invite,
        renderAvatar,
        handleAvatarError,
        handleSendMessage,
        handleTypingPing,
    } = useChatContext();

    return (
        <div className={`border-t-4 border-[#1f2937] bg-white/80 px-3 py-3 backdrop-blur-sm min-[481px]:px-4 ${!selectedRoom ? "hidden" : ""}`}>
            <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!isMember) return;
                    handleSendMessage();
                }}
            >
                {currentUserId > 0 && (
                    <img
                        src={renderAvatar(currentUserId)}
                        alt="You"
                        onError={handleAvatarError}
                        className="shrink-0 h-8 w-8 rounded-full border-2 border-[#1f2937] object-cover"
                    />
                )}
                <input
                    type="text"
                    placeholder={isMember ? t("Write a message...") : t("Join the channel to chat")}
                    value={messageText}
                    onChange={(e) => {
                        setMessageText(e.target.value);
                        if (isMember && e.target.value.length > 0) handleTypingPing();
                    }}
                    disabled={!isMember}
                    className="min-w-0 flex-1 rounded-2xl border-2 border-[#1f2937] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {isSelectedRoomDm && (
                    <button
                        type="button"
                        onClick={invite.handleSendInvite}
                        disabled={invite.isInviting}
                        title={invite.isInviting ? t("Sending...") : t("Invite to game")}
                        className="shrink-0 rounded-2xl border-2 border-[#1f2937] bg-[#facc15] px-2.5 py-2.5 text-base font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        🎮
                    </button>
                )}
                <button
                    type="submit"
                    disabled={selectedRoomId == null || isSubmittingMessage || !isMember}
                    className="shrink-0 rounded-2xl border-2 border-[#1f2937] bg-[#1f2937] px-3 py-2.5 text-sm font-semibold text-white shadow-[3px_3px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmittingMessage ? "..." : "→"}
                </button>
            </form>
        </div>
    );
}
