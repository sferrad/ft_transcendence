import { useTranslation } from "react-i18next";
import { useChatContext } from "../ChatContext";

export function ConversationHeader() {
    const { t } = useTranslation();
    const {
        selectedRoom,
        isSelectedRoomDm,
        selectedDmUserId,
        onlineIds,
        memberIds,
        roomMemberIds,
        allFriendIds,
        profiles,
        isMember,
        isOwner,
        isInviteMemberOpen,
        setIsInviteMemberOpen,
        isInvitingMember,
        getRoomDisplayName,
        renderAvatar,
        handleAvatarError,
        handleJoinRoom,
        handleLeaveRoom,
        handleDeleteRoom,
        handleInviteMember,
        setSelectedRoomId,
        invite,
    } = useChatContext();

    return (
        <div className={`border-b-4 border-[#1f2937] bg-white/70 px-3 py-3 landscape:py-1.5 backdrop-blur-sm min-[481px]:px-4 ${!selectedRoom ? "hidden" : ""}`}>
            {selectedRoom ? (
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Back button on mobile */}
                        <button
                            type="button"
                            onClick={() => setSelectedRoomId(null)}
                            className="shrink-0 lg:hidden rounded-full border-2 border-[#1f2937] bg-white w-8 h-8 flex items-center justify-center text-[#1f2937] font-bold shadow-[2px_2px_0_#1f2937]"
                            aria-label="Back"
                        >←</button>
                        {isSelectedRoomDm && selectedDmUserId ? (
                            <div className="relative shrink-0">
                                <img
                                    src={renderAvatar(selectedDmUserId)}
                                    alt={getRoomDisplayName(selectedRoom)}
                                    onError={handleAvatarError}
                                    className="h-10 w-10 landscape:h-8 landscape:w-8 rounded-full border-2 border-[#1f2937] object-cover"
                                />
                                {onlineIds.has(selectedDmUserId) && (
                                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                                )}
                            </div>
                        ) : selectedRoom?.is_private ? (
                            <div className="shrink-0 h-10 w-10 rounded-full border-2 border-[#818cf8] bg-[#818cf8] flex items-center justify-center text-white font-bold text-base">
                                👥
                            </div>
                        ) : (
                            <div className="shrink-0 h-10 w-10 rounded-full border-2 border-[#1f2937] bg-[#1f2937] flex items-center justify-center text-white font-bold text-base">
                                #
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="truncate text-base font-bold text-[#1f2937]">{getRoomDisplayName(selectedRoom)}</div>
                            {isSelectedRoomDm && selectedDmUserId ? (
                                <div className={`text-xs font-medium ${onlineIds.has(selectedDmUserId) ? "text-green-600" : "text-[#9ca3af]"}`}>
                                    {onlineIds.has(selectedDmUserId) ? t("Online") : t("Offline")}
                                </div>
                            ) : (
                                <div className="text-xs text-[#6b7280]">
                                    {memberIds.length} {t("member")}{memberIds.length > 1 ? t("s") : ""}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Invite member button — private groups only */}
                        {selectedRoom?.is_private && !isSelectedRoomDm && isMember && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteMemberOpen(v => !v)}
                                    title={t("Invite a friend")}
                                    className="rounded-xl border-2 border-[#1f2937] bg-[#818cf8] px-2.5 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                                >+ 👤</button>
                                {isInviteMemberOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border-2 border-[#1f2937] bg-white shadow-[4px_4px_0_#1f2937] p-3 flex flex-col gap-2">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#374151]">{t("Invite a friend")}</div>
                                        {allFriendIds.filter(id => !roomMemberIds.includes(id)).length === 0 ? (
                                            <p className="text-xs text-[#9ca3af]">{t("All friends are already in this group.")}</p>
                                        ) : (
                                            allFriendIds.filter(id => !roomMemberIds.includes(id)).map(fid => {
                                                const name = profiles[fid]?.display_name || `User ${fid}`;
                                                return (
                                                    <button
                                                        key={fid}
                                                        type="button"
                                                        disabled={isInvitingMember}
                                                        onClick={() => handleInviteMember(fid)}
                                                        className="flex items-center gap-2 rounded-xl border-2 border-[#1f2937]/20 bg-[#f5efe2] px-3 py-1.5 text-sm font-semibold text-[#1f2937] transition hover:bg-[#ece3d0] text-left"
                                                    >
                                                        <img src={renderAvatar(fid)} alt={name} onError={handleAvatarError} className="h-6 w-6 rounded-full border border-[#1f2937]/20 object-cover shrink-0" />
                                                        <span className="truncate">{name}</span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {isSelectedRoomDm && (
                            <button
                                type="button"
                                onClick={invite.handleSendInvite}
                                disabled={invite.isInviting}
                                title={invite.isInviting ? t("Sending...") : t("Invite to game")}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#facc15] px-2.5 py-2 text-base font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                🎮
                            </button>
                        )}
                        {!isSelectedRoomDm && !isMember && (
                            <button
                                onClick={handleJoinRoom}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-2.5 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                            >
                                {t("Join")}
                            </button>
                        )}
                        {!isSelectedRoomDm && isMember && (
                            <button
                                onClick={handleLeaveRoom}
                                className="rounded-xl border-2 border-[#1f2937] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                            >
                                {t("Leave")}
                            </button>
                        )}
                        {isOwner && !isSelectedRoomDm && (
                            <button
                                onClick={handleDeleteRoom}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#ef4444] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                            >
                                {t("Delete")}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-1 hidden lg:block">
                    <div className="text-lg font-bold text-[#1f2937]">{t("Select a conversation")}</div>
                </div>
            )}
        </div>
    );
}
