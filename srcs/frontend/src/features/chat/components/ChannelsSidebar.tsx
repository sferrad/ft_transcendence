import { useTranslation } from "react-i18next";
import { useChatContext } from "../ChatContext.tsx";

export function ChannelsSidebar() {
    const { t } = useTranslation();
    const {
        isChannelsOpen,
        setIsChannelsOpen,
        isCreateFormOpen,
        setIsCreateFormOpen,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        roomName,
        setRoomName,
        isCreatingRoom,
        handleCreateRoom,
        publicChannels,
        privateGroups,
        selectedRoomId,
        setSelectedRoomId,
        unreadRoomIds,
        lastMessageByRoomId,
        allFriendIds,
        profiles,
        groupName,
        setGroupName,
        groupSelectedFriends,
        setGroupSelectedFriends,
        isCreatingGroup,
        handleCreateGroup,
        renderAvatar,
        handleAvatarError,
    } = useChatContext();

    return (
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(86vw,19rem)] flex-col border-r-4 border-[#1f2937] bg-[#ece3d0] shadow-[10px_0_0_#1f2937] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${isChannelsOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            {/* Sidebar header */}
            <div className="border-b-2 border-[#1f2937]/15 px-3 py-3 landscape:py-1.5 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#374151]">{t("Rooms")}</span>
                <button
                    type="button"
                    onClick={() => setIsChannelsOpen(false)}
                    className="rounded-full border-2 border-[#1f2937] bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1f2937] lg:hidden"
                >{t("Close")}</button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-3 py-3 landscape:py-2 flex flex-col gap-4 landscape:gap-2">

                {/* ── Public channels ── */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]"># {t("Public channels")}</span>
                        <button
                            type="button"
                            onClick={() => { setIsCreateFormOpen(v => !v); setIsCreateGroupOpen(() => false); }}
                            title={t("Create channel")}
                            className="rounded-full border-2 border-[#1f2937] bg-[#4AD95A] w-6 h-6 flex items-center justify-center text-xs font-bold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                        >+</button>
                    </div>
                    {isCreateFormOpen && (
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder={t("Channel name")}
                                maxLength={15}
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateRoom(); } }}
                                className="min-w-0 flex-1 rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500"
                            />
                            <button
                                onClick={handleCreateRoom}
                                disabled={isCreatingRoom}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-1.5 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                            >{isCreatingRoom ? "..." : t("Create")}</button>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        {publicChannels.length === 0 && (
                            <p className="px-2 py-2 text-xs text-[#9ca3af]">{t("No public channels yet.")}</p>
                        )}
                        {publicChannels.map((room) => {
                            const isSelected = room.id === selectedRoomId;
                            const hasUnreadRoom = unreadRoomIds.includes(room.id);
                            const lastTs = lastMessageByRoomId[room.id];
                            const relativeTime = lastTs ? (() => {
                                const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                                if (diffMin < 1) return t("just now");
                                if (diffMin < 60) return `${diffMin}${t("m")}`;
                                const diffH = Math.floor(diffMin / 60);
                                if (diffH < 24) return `${diffH}h`;
                                return `${Math.floor(diffH / 24)}j`;
                            })() : null;
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => { setSelectedRoomId(room.id); setIsChannelsOpen(false); }}
                                    className={`w-full rounded-2xl border-2 px-3 py-2.5 landscape:py-1.5 text-left transition ${isSelected ? "border-[#1f2937] bg-white shadow-[3px_3px_0_#1f2937]" : "border-[#1f2937]/20 bg-white/60 hover:bg-white/85"}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="shrink-0 h-8 w-8 rounded-full border-2 border-[#1f2937] bg-[#1f2937] flex items-center justify-center text-white text-xs font-bold">#</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="truncate text-sm font-semibold text-[#1f2937]">{room.name}</div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {hasUnreadRoom && !isSelected && <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />}
                                                    {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Private groups ── */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">👥 {t("Groups")}</span>
                        <button
                            type="button"
                            onClick={() => { setIsCreateGroupOpen(v => !v); setIsCreateFormOpen(() => false); }}
                            title={t("Create group")}
                            className="rounded-full border-2 border-[#1f2937] bg-[#818cf8] w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px]"
                        >+</button>
                    </div>
                    {isCreateGroupOpen && (
                        <div className="mb-2 rounded-2xl border-2 border-[#1f2937]/20 bg-white/60 p-3 flex flex-col gap-2">
                            <input
                                type="text"
                                placeholder={t("Group name")}
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 w-full"
                            />
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#374151]">{t("Invite friends")}</div>
                            <div className="flex flex-wrap gap-1.5">
                                {allFriendIds.length === 0 && (
                                    <p className="text-xs text-[#9ca3af]">{t("No friends yet.")}</p>
                                )}
                                {allFriendIds.map(fid => {
                                    const name = profiles[fid]?.display_name || `User ${fid}`;
                                    const sel = groupSelectedFriends.has(fid);
                                    return (
                                        <button
                                            key={fid}
                                            type="button"
                                            onClick={() => setGroupSelectedFriends(prev => {
                                                const next = new Set(prev);
                                                if (sel) next.delete(fid); else next.add(fid);
                                                return next;
                                            })}
                                            className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition ${sel ? "border-[#818cf8] bg-[#818cf8] text-white" : "border-[#1f2937]/20 bg-white text-[#1f2937] hover:border-[#818cf8]"}`}
                                        >
                                            <img src={renderAvatar(fid)} alt={name} onError={handleAvatarError} className="h-4 w-4 rounded-full border border-[#1f2937]/20 object-cover" />
                                            {name}
                                            {sel && <span className="ml-0.5">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={handleCreateGroup}
                                disabled={isCreatingGroup || !groupName.trim()}
                                className="rounded-xl border-2 border-[#1f2937] bg-[#818cf8] px-3 py-1.5 text-sm font-semibold text-white shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60 w-full"
                            >{isCreatingGroup ? "..." : t("Create group")}</button>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        {privateGroups.length === 0 && (
                            <p className="px-2 py-2 text-xs text-[#9ca3af]">{t("No groups yet.")}</p>
                        )}
                        {privateGroups.map((room) => {
                            const isSelected = room.id === selectedRoomId;
                            const hasUnreadRoom = unreadRoomIds.includes(room.id);
                            const lastTs = lastMessageByRoomId[room.id];
                            const relativeTime = lastTs ? (() => {
                                const diffMin = Math.floor((Date.now() - lastTs) / 60000);
                                if (diffMin < 1) return t("just now");
                                if (diffMin < 60) return `${diffMin}${t("m")}`;
                                const diffH = Math.floor(diffMin / 60);
                                if (diffH < 24) return `${diffH}h`;
                                return `${Math.floor(diffH / 24)}j`;
                            })() : null;
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => { setSelectedRoomId(room.id); setIsChannelsOpen(false); }}
                                    className={`w-full rounded-2xl border-2 px-3 py-2.5 landscape:py-1.5 text-left transition ${isSelected ? "border-[#1f2937] bg-white shadow-[3px_3px_0_#1f2937]" : "border-[#1f2937]/20 bg-white/60 hover:bg-white/85"}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="shrink-0 h-8 w-8 rounded-full border-2 border-[#818cf8] bg-[#818cf8] flex items-center justify-center text-white text-xs font-bold">👥</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="truncate text-sm font-semibold text-[#1f2937]">{room.name}</div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {hasUnreadRoom && !isSelected && <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />}
                                                    {relativeTime && <span className="text-[10px] text-[#9ca3af]">{relativeTime}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </aside>
    );
}
