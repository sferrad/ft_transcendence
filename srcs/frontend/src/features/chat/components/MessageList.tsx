import { useTranslation } from "react-i18next";
import type { MessageOut, ProfileOut } from "../../profile/types";
import { parseInviteContent } from "../types";
import { THEMES, THEME_DEFAULT } from "../../game/themes";
import type { ParsedInvite } from "../types";

interface GroupedMessage {
    dateKey: string;
    dateLabel: string;
    messages: Array<{ msg: MessageOut; idx: number }>;
}

interface Props {
    selectedRoom: boolean;
    messages: MessageOut[];
    groupedMessages: GroupedMessage[];
    systemEvents: Array<{ id: string; text: string }>;
    profiles: Record<number, ProfileOut>;
    currentUserId: number;
    isSelectedRoomDm: boolean;
    partnerLastReadAt: string | null;
    isMember: boolean;
    typingUser: { userId: number; username?: string } | null;
    resolvedInviteIds: Set<number>;
    busyInviteId: number | null;
    messageEndRef: React.RefObject<HTMLDivElement | null>;
    formatMsgTime: (iso: string | null) => string;
    renderAvatar: (userId: number) => string;
    handleAvatarError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    openProfile: (userId: number) => void;
    handleAcceptInvite: (invite: ParsedInvite) => void;
    handleDeclineInvite: (invite: ParsedInvite) => void;
}

export function MessageList({
    selectedRoom,
    messages,
    groupedMessages,
    systemEvents,
    profiles,
    currentUserId,
    isSelectedRoomDm,
    partnerLastReadAt,
    isMember,
    typingUser,
    resolvedInviteIds,
    busyInviteId,
    messageEndRef,
    formatMsgTime,
    renderAvatar,
    handleAvatarError,
    openProfile,
    handleAcceptInvite,
    handleDeclineInvite,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className={`min-h-0 flex-1 overflow-auto px-3 py-3 min-[481px]:px-4 min-[481px]:py-4 ${!selectedRoom ? "hidden" : ""}`}>
            <div className="flex min-h-full flex-col justify-end gap-3">
                {messages.length === 0 && systemEvents.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-[#1f2937]/20 bg-white/60 px-4 py-6 text-center text-sm text-[#6b7280]">
                        {t("No messages yet in this room.")}
                    </div>
                )}

                {groupedMessages.map((group) => (
                    <div key={group.dateKey} className="flex flex-col gap-3">
                        {/* Date separator */}
                        {group.dateLabel && (
                            <div className="flex items-center gap-2 my-1">
                                <div className="flex-1 h-px bg-[#1f2937]/10" />
                                <span className="rounded-full border border-[#1f2937]/15 bg-white/80 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                                    {group.dateLabel}
                                </span>
                                <div className="flex-1 h-px bg-[#1f2937]/10" />
                            </div>
                        )}

                        {group.messages.map(({ msg: message, idx: index }, posInGroup) => {
                            const profile = profiles[message.sender_user_id];
                            const displayName = profile?.display_name || `User ${message.sender_user_id}`;
                            const avatarUrl = renderAvatar(message.sender_user_id);
                            const isMine = currentUserId > 0 && message.sender_user_id === currentUserId;
                            const invite = parseInviteContent(message.content);
                            const isLastMine = isMine && index === messages.length - 1;
                            const seenByPartner = Boolean(
                                isLastMine && isSelectedRoomDm && partnerLastReadAt && message.created_at &&
                                Date.parse(partnerLastReadAt) >= Date.parse(message.created_at)
                            );
                            const nextItem = group.messages[posInGroup + 1];
                            const isLastInRun = !nextItem || nextItem.msg.sender_user_id !== message.sender_user_id;
                            const showAvatar = isLastInRun;

                            return (
                                <article
                                    key={`${message.room_id}-${message.sender_user_id}-${message.created_at ?? index}`}
                                    className={`flex items-end gap-2 sm:gap-3 ${isMine ? "justify-end" : "justify-start"}`}
                                >
                                    {!isMine && (
                                        <div className="shrink-0 w-9 sm:w-10">
                                            {showAvatar ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openProfile(message.sender_user_id)}
                                                    aria-label={`Open ${displayName}'s profile`}
                                                >
                                                    <img
                                                        src={avatarUrl}
                                                        alt={displayName}
                                                        onError={handleAvatarError}
                                                        className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                    />
                                                </button>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="flex max-w-[86%] flex-col gap-1 sm:max-w-[80%]">
                                        {invite ? (
                                            <div
                                                className={`rounded-3xl border-2 border-[#1f2937] px-3 py-3 shadow-[4px_4px_0_#1f2937] sm:px-4 sm:py-4 ${
                                                    isMine ? "bg-blue-700 text-white" : "bg-white text-[#1f2937]"
                                                }`}
                                            >
                                                <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                    {isMine ? t("You") : displayName}
                                                </div>
                                                <div className="font-semibold text-sm sm:text-base mb-1">
                                                    🎮 {t("Game invite")}
                                                </div>
                                                <div className={`flex gap-2 text-[11px] mb-2 ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                    <span>{invite.winningScore !== null ? `${invite.winningScore} ${t("goals")}` : "∞ " + t("goals")}</span>
                                                    <span>·</span>
                                                    <span>{invite.duration !== null ? `${invite.duration}s` : "∞"}</span>
                                                    <span>·</span>
                                                    <span>{t(THEMES.find(th => th.id === invite.themeId)?.nameKey ?? THEME_DEFAULT.nameKey, invite.themeId)}</span>
                                                </div>
                                                {resolvedInviteIds.has(invite.matchId) ? (
                                                    <div className="text-xs text-gray-400 italic mt-1">{t("Invite expired", "Invitation expirée")}</div>
                                                ) : isMine ? (
                                                    <div className="text-xs text-white/80">{t("Waiting for opponent...")}</div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            disabled={busyInviteId === invite.matchId}
                                                            onClick={() => handleAcceptInvite(invite)}
                                                            className="rounded-xl border-2 border-[#1f2937] bg-[#4AD95A] px-3 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                                                        >
                                                            {t("Accept")}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busyInviteId === invite.matchId}
                                                            onClick={() => handleDeclineInvite(invite)}
                                                            className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
                                                        >
                                                            {t("Reject")}
                                                        </button>
                                                    </div>
                                                )}
                                                {message.created_at && (
                                                    <div className={`mt-1 text-[10px] ${isMine ? "text-white/50 text-right" : "text-[#9ca3af]"}`}>
                                                        {formatMsgTime(message.created_at)}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                className={`rounded-3xl border-2 border-[#1f2937] px-3 py-2.5 shadow-[4px_4px_0_#1f2937] sm:px-4 sm:py-3 ${
                                                    isMine ? "bg-[#1f2937] text-white" : "bg-white text-[#1f2937]"
                                                }`}
                                            >
                                                <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isMine ? "text-white/70" : "text-[#6b7280]"}`}>
                                                    {isMine ? t("You") : displayName}
                                                </div>
                                                <div className="break-words text-sm leading-6 sm:text-[0.95rem]">{message.content}</div>
                                                {message.created_at && (
                                                    <div className={`mt-1 text-[10px] ${isMine ? "text-white/50 text-right" : "text-[#9ca3af]"}`}>
                                                        {formatMsgTime(message.created_at)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {seenByPartner && (
                                            <div className="text-[10px] text-blue-600 self-end font-semibold uppercase tracking-wider">
                                                ✓✓ {t("Seen")}
                                            </div>
                                        )}
                                    </div>

                                    {isMine && (
                                        <div className="shrink-0 w-9 sm:w-10">
                                            {showAvatar ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openProfile(message.sender_user_id)}
                                                    aria-label="Open your profile"
                                                >
                                                    <img
                                                        src={avatarUrl}
                                                        alt={displayName}
                                                        onError={handleAvatarError}
                                                        className="h-9 w-9 rounded-full border-2 border-[#1f2937] object-cover sm:h-10 sm:w-10"
                                                    />
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ))}

                {/* Typing indicator */}
                {typingUser && isMember && (
                    <div className="flex items-center gap-2 text-xs text-[#6b7280] pl-2">
                        <span className="inline-flex gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                        <span>{(profiles[typingUser.userId]?.display_name || typingUser.username || "Someone")} {t("is typing...")}</span>
                    </div>
                )}

                {systemEvents.map((event) => (
                    <div
                        key={event.id}
                        className="mx-auto max-w-[92%] rounded-2xl border-2 border-dashed border-[#1f2937]/25 bg-white/70 px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#6b7280]"
                    >
                        {event.text}
                    </div>
                ))}

                <div ref={messageEndRef} />
            </div>
        </div>
    );
}
