import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ProfileOut } from "../../profile/types";
import { acceptInvite, cancelInvite, createDmInvite } from "../../game/api/matchmaking";
import { savePendingInvite } from "../../../utils/pendingInvite";
import { markInviteResolved, getResolvedIds, onResolvedUpdated } from "../../../utils/resolvedInvites";
import { CHARACTERS } from "../../../utils/characters";
import { SCORE_DEFAULT, TIMER_DEFAULT } from "../../game/engine/constants";
import { THEME_DEFAULT } from "../../game/themes";
import { INVITE_PREFIX } from "../types";
import type { ParsedInvite } from "../types";
import { useEffect } from "react";

interface UseChatInviteParams {
    token: string | null;
    currentUserId: number;
    isSelectedRoomDm: boolean;
    selectedDmUserId: number | null;
    profiles: Record<number, ProfileOut>;
    sendWsMessage: (content: string) => void;
}

export function useChatInvite({
    token,
    currentUserId,
    isSelectedRoomDm,
    selectedDmUserId,
    profiles,
    sendWsMessage,
}: UseChatInviteParams) {
    const navigate = useNavigate();

    const [isInviting, setIsInviting] = useState(false);
    const [busyInviteId, setBusyInviteId] = useState<number | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteNation, setInviteNation] = useState<string>("Algeria");
    const [inviteScore, setInviteScore] = useState<3 | 5 | null>(SCORE_DEFAULT);
    const [inviteDuration, setInviteDuration] = useState<30 | 60 | null>(TIMER_DEFAULT);
    const [inviteThemeId, setInviteThemeId] = useState<string>(THEME_DEFAULT.id);
    const [pendingAccept, setPendingAccept] = useState<ParsedInvite | null>(null);
    const [acceptNation, setAcceptNation] = useState<string>("Algeria");
    const [resolvedInviteIds, setResolvedInviteIds] = useState<Set<number>>(() => getResolvedIds());

    useEffect(() => onResolvedUpdated(setResolvedInviteIds), []);

    const handleSendInvite = () => {
        if (!isSelectedRoomDm || !selectedDmUserId || !token) return;
        const me = profiles[currentUserId];
        setInviteNation(me?.country?.trim() || "Algeria");
        setInviteScore(SCORE_DEFAULT);
        setInviteDuration(TIMER_DEFAULT);
        setInviteThemeId(THEME_DEFAULT.id);
        setShowInviteModal(true);
    };

    const handleConfirmInvite = async () => {
        if (!isSelectedRoomDm || !selectedDmUserId || !token) return;
        const myName = localStorage.getItem("username") || "Player";
        try {
            setIsInviting(true);
            setShowInviteModal(false);
            const result = await createDmInvite({
                targetUserId: selectedDmUserId,
                playerName: myName,
                playerNation: inviteNation,
                winningScore: inviteScore,
                duration: inviteDuration,
            });
            if (result.status !== "matched" || !result.match_id) {
                return;
            }
            const inviteContent = `${INVITE_PREFIX}${result.match_id}|${currentUserId}|${myName}|${inviteNation}|${inviteScore}|${inviteDuration}|${inviteThemeId}`;
            sendWsMessage(inviteContent);
            savePendingInvite({ ...result, myNation: inviteNation, themeId: inviteThemeId });
        } catch {
            // handled externally via status
        } finally {
            setIsInviting(false);
        }
    };

    const handleAcceptInvite = (invite: ParsedInvite) => {
        const me = profiles[currentUserId];
        setAcceptNation(me?.country?.trim() || "Algeria");
        setPendingAccept(invite);
    };

    const handleConfirmAccept = async () => {
        if (!pendingAccept || !token) return;
        const invite = pendingAccept;
        const myName = localStorage.getItem("username") || "Player";
        try {
            setBusyInviteId(invite.matchId);
            setPendingAccept(null);
            const result = await acceptInvite({
                matchId: invite.matchId,
                playerName: myName,
                playerNation: acceptNation,
            });
            if (result.status !== "matched" || !result.match_id) {
                markInviteResolved(invite.matchId);
                return;
            }
            markInviteResolved(invite.matchId);
            navigate("/online-gameplay", { state: { ...result, myNation: acceptNation, themeId: invite.themeId, backRoute: '/chat' } });
        } catch {
            markInviteResolved(invite.matchId);
        } finally {
            setBusyInviteId(null);
        }
    };

    const handleDeclineInvite = async (invite: ParsedInvite) => {
        try {
            setBusyInviteId(invite.matchId);
            await cancelInvite(invite.matchId);
        } catch {
            // best-effort
        } finally {
            markInviteResolved(invite.matchId);
            setBusyInviteId(null);
        }
    };

    return {
        showInviteModal,
        setShowInviteModal,
        inviteNation,
        setInviteNation,
        inviteScore,
        setInviteScore,
        inviteDuration,
        setInviteDuration,
        inviteThemeId,
        setInviteThemeId,
        pendingAccept,
        setPendingAccept,
        acceptNation,
        setAcceptNation,
        resolvedInviteIds,
        isInviting,
        busyInviteId,
        handleSendInvite,
        handleConfirmInvite,
        handleAcceptInvite,
        handleConfirmAccept,
        handleDeclineInvite,
        CHARACTERS,
    };
}
