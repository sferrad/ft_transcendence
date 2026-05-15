import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { ChatButton } from "../features/chat/ChatButton";
import { useTranslation } from "react-i18next";
import { useChatNotifications } from "../hooks/useChatNotifications";

function ChatPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const roomIdParam = searchParams.get("roomId");
    const initialRoomId = roomIdParam ? Number(roomIdParam) : null;
    const dmUserIdParam = searchParams.get("dmUserId");
    const initialDmUserId = dmUserIdParam ? Number(dmUserIdParam) : null;
    const { hasUnread } = useChatNotifications({ enabled: Boolean(localStorage.getItem("access_token")) });

    // localStorage.setItem("access_token", "debug_token"); // TODO: Remove this line after implementing proper authentication

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
        }
    }, [navigate]);

    return (
        <div className="h-[100dvh] overflow-hidden bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat px-2 py-2 sm:px-4 sm:py-4">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-3">
                <div className="flex items-center justify-between rounded-2xl border-4 border-[#1f2937] bg-[#18212f] px-4 py-3 text-white shadow-[8px_8px_0_#1f2937]">
                    <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-white/70">{t("Chat")}</div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold sm:text-2xl">{t("Chat")}</h1>
                            {hasUnread && (
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(15,23,42,0.6)]" aria-hidden="true" />
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20 sm:px-4"
                    >
                        {t("Back home")}
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border-4 border-[#1f2937] bg-white/90 shadow-[10px_10px_0_#1f2937]">
                    <ChatButton
                        initialRoomId={Number.isFinite(initialRoomId) && (initialRoomId ?? 0) > 0 ? initialRoomId : null}
                        initialDmUserId={Number.isFinite(initialDmUserId) && (initialDmUserId ?? 0) > 0 ? initialDmUserId : null}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChatPage;
