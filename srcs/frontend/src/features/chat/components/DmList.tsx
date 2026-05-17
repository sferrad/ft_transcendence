import { useTranslation } from "react-i18next";
import { useChatContext } from "../ChatContext";

export function DmList() {
    const { t } = useTranslation();
    const {
        isNewDmOpen,
        setIsNewDmOpen,
        friendsWithoutDm,
        profiles,
        onlineIds,
        handleStartDm,
        dmRooms,
        getDmOtherUserId,
        getRoomDisplayName,
        unreadRoomIds,
        lastMessageByRoomId,
        setSelectedRoomId,
        renderAvatar,
        handleAvatarError,
    } = useChatContext();

    return (
        <div className="flex min-h-0 flex-col flex-1">
            <div className="border-b-2 border-[#1f2937]/15 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">{t("Direct Messages")}</span>
                <button
                    type="button"
                    onClick={() => setIsNewDmOpen(v => !v)}
                    title={t("New conversation")}
                    className="rounded-full border-2 border-[#1f2937] bg-[#4AD95A] w-7 h-7 flex items-center justify-center text-sm font-bold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                >+</button>
            </div>
            {isNewDmOpen && (
                <div className="border-b-2 border-[#1f2937]/15 bg-[#ece3d0] px-3 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#374151] mb-2">{t("Start a conversation")}</div>
                    {friendsWithoutDm.length === 0 ? (
                        <p className="text-xs text-[#6b7280] px-1">{t("All friends already have a conversation.")}</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {friendsWithoutDm.map(friendId => {
                                const profile = profiles[friendId];
                                const name = profile?.display_name || `User ${friendId}`;
                                const isOnline = onlineIds.has(friendId);
                                return (
                                    <button
                                        key={friendId}
                                        type="button"
                                        onClick={() => handleStartDm(friendId)}
                                        className="flex items-center gap-2 rounded-2xl border-2 border-[#1f2937]/20 bg-white/80 px-3 py-2 text-left text-sm font-semibold text-[#1f2937] transition hover:bg-white hover:border-[#1f2937]"
                                    >
                                        <div className="relative shrink-0">
                                            <img
                                                src={renderAvatar(friendId)}
                                                alt={name}
                                                onError={handleAvatarError}
                                                className="h-8 w-8 rounded-full border-2 border-[#1f2937] object-cover"
                                            />
                                            {isOnline && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white" />}
                                        </div>
                                        <span className="truncate max-w-[8rem]">{name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
                <div className="space-y-2">
                    {dmRooms.length === 0 && (
                        <p className="px-2 py-6 text-center text-sm text-[#6b7280]">{t("No direct messages yet.")}</p>
                    )}
                    {dmRooms.map((room) => {
                        const dmUserId = getDmOtherUserId(room)!;
                        const hasUnreadRoom = unreadRoomIds.includes(room.id);
                        const isOnline = onlineIds.has(dmUserId);
                        const lastTs = lastMessageByRoomId[room.id];
                        const relativeTime = lastTs ? (() => {
                            const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                            if (diffMin < 1) return t("just now", "just now");
                            if (diffMin < 60) return `${diffMin} ${t("min ago", "min ago")}`;
                            const diffH = Math.floor(diffMin / 60);
                            if (diffH < 24) return `${diffH}h ${t("ago", "ago")}`;
                            return `${Math.floor(diffH / 24)}d ${t("ago", "ago")}`;
                        })() : null;
                        return (
                            <button
                                key={room.id}
                                onClick={() => setSelectedRoomId(room.id)}
                                className="w-full rounded-2xl border-2 border-[#1f2937]/20 bg-white/70 px-3 py-3 text-left transition hover:bg-white"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <img
                                            src={renderAvatar(dmUserId)}
                                            alt={getRoomDisplayName(room)}
                                            onError={handleAvatarError}
                                            className="h-11 w-11 rounded-full border-2 border-[#1f2937] object-cover"
                                        />
                                        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="truncate text-sm font-semibold text-[#1f2937]">{getRoomDisplayName(room)}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {hasUnreadRoom && <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />}
                                                {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                            </div>
                                        </div>
                                        <span className={`text-xs font-medium ${isOnline ? "text-green-600" : "text-[#9ca3af]"}`}>
                                            {isOnline ? t("Online") : t("Offline")}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
