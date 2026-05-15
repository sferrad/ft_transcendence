import { useTranslation } from "react-i18next";
import { CHARACTERS } from "../../../utils/characters";
import { THEMES, THEME_DEFAULT } from "../../game/themes";
import type { ParsedInvite } from "../types";

interface Props {
    pendingAccept: ParsedInvite | null;
    setPendingAccept: (v: ParsedInvite | null) => void;
    acceptNation: string;
    setAcceptNation: (v: string) => void;
    busyInviteId: number | null;
    handleConfirmAccept: () => void;
    handleDeclineInvite: (invite: ParsedInvite) => void;
}

export function AcceptInviteModal({
    pendingAccept,
    setPendingAccept,
    acceptNation,
    setAcceptNation,
    busyInviteId,
    handleConfirmAccept,
    handleDeclineInvite,
}: Props) {
    const { t } = useTranslation();

    if (!pendingAccept) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPendingAccept(null)}>
            <div className="w-[min(92vw,22rem)] rounded-3xl border-4 border-[#1f2937] bg-[#f5efe2] p-6 shadow-[8px_8px_0_#1f2937]" onClick={e => e.stopPropagation()}>
                <div className="mb-4 text-center text-base font-bold uppercase tracking-widest text-[#1f2937]">🎮 {t("Game invite")}</div>

                {/* Nation picker */}
                <div className="mb-3 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Your character")}</span>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => { const i = CHARACTERS.indexOf(acceptNation as typeof CHARACTERS[number]); setAcceptNation(CHARACTERS[(i - 1 + CHARACTERS.length) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">◀</button>
                        <div className="flex flex-col items-center gap-1 w-24">
                            <img src={`/assets/perso/faces/${acceptNation.toLowerCase()}-face.png`} alt={acceptNation} className="w-14 h-14 object-contain" />
                            <span className="text-xs font-semibold text-[#1f2937]">{acceptNation}</span>
                        </div>
                        <button type="button" onClick={() => { const i = CHARACTERS.indexOf(acceptNation as typeof CHARACTERS[number]); setAcceptNation(CHARACTERS[(i + 1) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">▶</button>
                    </div>
                </div>

                {/* Paramètres imposés par l'inviteur (lecture seule) */}
                <div className="mb-5 flex items-center justify-between gap-2 text-xs text-[#6b7280]">
                    <span>{pendingAccept.winningScore !== null ? `${pendingAccept.winningScore} ${t("goals")}` : "∞ " + t("goals")}</span>
                    <span>{pendingAccept.duration !== null ? `${pendingAccept.duration}s` : "∞"}</span>
                    <span>{t(THEMES.find(th => th.id === pendingAccept.themeId)?.nameKey ?? THEME_DEFAULT.nameKey, pendingAccept.themeId)}</span>
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={() => { handleDeclineInvite(pendingAccept); setPendingAccept(null); }} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-white py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937]">{t("Decline")}</button>
                    <button type="button" onClick={handleConfirmAccept} disabled={busyInviteId === pendingAccept.matchId} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-[#4AD95A] py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] disabled:opacity-60">{t("Accept")}</button>
                </div>
            </div>
        </div>
    );
}
