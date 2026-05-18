import { useTranslation } from "react-i18next";
import { ChatProvider, useChatContext } from "./ChatContext";
import { ChannelsSidebar } from "./components/ChannelsSidebar";
import { DmList } from "./components/DmList";
import { ConversationHeader } from "./components/ConversationHeader";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { SendInviteModal } from "./components/SendInviteModal";
import { AcceptInviteModal } from "./components/AcceptInviteModal";

type ChatPanelProps = {
    initialRoomId?: number | null;
    initialDmUserId?: number | null;
    onBack?: () => void;
    hasUnread?: boolean;
};

export function ChatPanel({ initialRoomId = null, initialDmUserId = null, onBack, hasUnread }: ChatPanelProps) {
    return (
        <ChatProvider initialRoomId={initialRoomId} initialDmUserId={initialDmUserId}>
            <ChatLayout onBack={onBack} externalHasUnread={hasUnread} />
        </ChatProvider>
    );
}

function ChatLayout({ onBack, externalHasUnread }: { onBack?: () => void; externalHasUnread?: boolean }) {
    const { t } = useTranslation();
    const {
        isChannelsOpen,
        setIsChannelsOpen,
        selectedRoom,
        status,
        hasUnread: internalHasUnread,
    } = useChatContext();

    const hasUnread = externalHasUnread ?? internalHasUnread;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border-4 border-[#1f2937] bg-[#f5efe2] shadow-[10px_10px_0_#1f2937] min-[481px]:rounded-[1.5rem]">
            <div className="flex items-center justify-between border-b-4 border-[#1f2937] bg-[#18212f] px-4 py-3 landscape:py-1.5 text-white">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsChannelsOpen((v) => !v)}
                        aria-label="Toggle channels"
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition lg:hidden ${isChannelsOpen ? "border-white bg-white text-[#1f2937]" : "border-white/20 bg-white/10 text-white hover:bg-white/20"}`}
                    ># {t("Channels")}</button>
                    <h2 className="text-lg font-semibold">{t("Messages")}</h2>
                    {hasUnread && (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(15,23,42,0.6)]" aria-hidden="true" />
                    )}
                </div>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20"
                    >
                        {t("Back home")}
                    </button>
                )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[19rem_1fr]">
                {isChannelsOpen && (
                    <button
                        type="button"
                        aria-label="Close channels"
                        onClick={() => setIsChannelsOpen(false)}
                        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    />
                )}
                <ChannelsSidebar />

                <main className="flex min-h-0 flex-col bg-[#f7f3ea] lg:col-span-1">
                    {!selectedRoom && <DmList />}

                    <ConversationHeader />

                    {status && (
                        <div className="border-b-4 border-[#1f2937] bg-[#fff7d6] px-4 py-2.5 text-sm font-medium text-[#1f2937]">
                            {status}
                        </div>
                    )}

                    <MessageList />
                    <MessageInput />
                </main>
            </div>

            <SendInviteModal />
            <AcceptInviteModal />
        </div>
    );
}
