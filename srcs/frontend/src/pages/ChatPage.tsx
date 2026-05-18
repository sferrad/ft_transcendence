import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { ChatPanel } from "../features/chat/ChatPanel";
import { useChatNotifications } from "../hooks/useChatNotifications";

function ChatPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const roomIdParam = searchParams.get("roomId");
    const initialRoomId = roomIdParam ? Number(roomIdParam) : null;
    const dmUserIdParam = searchParams.get("dmUserId");
    const initialDmUserId = dmUserIdParam ? Number(dmUserIdParam) : null;
    const { hasUnread } = useChatNotifications({ enabled: Boolean(localStorage.getItem("access_token")) });

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
        }
    }, [navigate]);

    return (
        <div className="h-[100dvh] overflow-hidden bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat px-2 pt-2 pb-10 sm:px-4 sm:pt-4 sm:pb-12">
            <div className="mx-auto h-full min-h-0 w-full max-w-7xl">
                <ChatPanel
                    initialRoomId={Number.isFinite(initialRoomId) && (initialRoomId ?? 0) > 0 ? initialRoomId : null}
                    initialDmUserId={Number.isFinite(initialDmUserId) && (initialDmUserId ?? 0) > 0 ? initialDmUserId : null}
                    onBack={() => navigate("/")}
                    hasUnread={hasUnread}
                />
            </div>
        </div>
    );
}

export default ChatPage;
