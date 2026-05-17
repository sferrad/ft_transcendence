import { useTranslation } from "react-i18next";
import { CHARACTERS } from "../../../utils/characters";
import { SCORE_OPTIONS, TIMER_OPTIONS } from "../../game/engine/constants";
import { THEMES } from "../../game/themes";
import { useChatContext } from "../ChatContext";

export function SendInviteModal() {
    const { t } = useTranslation();
    const { invite } = useChatContext();

    if (!invite.showInviteModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => invite.setShowInviteModal(false)}>
            <div className="w-[min(92vw,22rem)] rounded-3xl border-4 border-[#1f2937] bg-[#f5efe2] p-6 shadow-[8px_8px_0_#1f2937]" onClick={e => e.stopPropagation()}>
                <div className="mb-4 text-center text-base font-bold uppercase tracking-widest text-[#1f2937]">🎮 {t("Game invite")}</div>

                <div className="mb-4 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Your character")}</span>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => { const i = CHARACTERS.indexOf(invite.inviteNation as typeof CHARACTERS[number]); invite.setInviteNation(CHARACTERS[(i - 1 + CHARACTERS.length) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">◀</button>
                        <div className="flex flex-col items-center gap-1 w-24">
                            <img src={`/assets/perso/faces/${invite.inviteNation.toLowerCase()}-face.png`} alt={invite.inviteNation} className="w-14 h-14 object-contain" />
                            <span className="text-xs font-semibold text-[#1f2937]">{invite.inviteNation}</span>
                        </div>
                        <button type="button" onClick={() => { const i = CHARACTERS.indexOf(invite.inviteNation as typeof CHARACTERS[number]); invite.setInviteNation(CHARACTERS[(i + 1) % CHARACTERS.length]); }} className="rounded-xl border-2 border-[#1f2937] bg-white px-3 py-1.5 text-lg font-bold shadow-[2px_2px_0_#1f2937]">▶</button>
                    </div>
                </div>

                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Goals")}</span>
                    <div className="flex gap-1.5">
                        {SCORE_OPTIONS.map(opt => (
                            <button key={String(opt)} type="button" onClick={() => invite.setInviteScore(opt)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${invite.inviteScore === opt ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{opt === null ? "∞" : opt}</button>
                        ))}
                    </div>
                </div>

                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Time")}</span>
                    <div className="flex gap-1.5">
                        {TIMER_OPTIONS.map(opt => (
                            <button key={String(opt)} type="button" onClick={() => invite.setInviteDuration(opt)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${invite.inviteDuration === opt ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{opt === null ? "∞" : `${opt}s`}</button>
                        ))}
                    </div>
                </div>

                <div className="mb-5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">{t("Theme")}</span>
                    <div className="flex gap-1.5">
                        {THEMES.map(th => (
                            <button key={th.id} type="button" onClick={() => invite.setInviteThemeId(th.id)} className={`rounded-xl border-2 border-[#1f2937] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1f2937] transition ${invite.inviteThemeId === th.id ? "bg-[#facc15] text-[#1f2937]" : "bg-white text-[#1f2937]"}`}>{t(th.nameKey, th.id)}</button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={() => invite.setShowInviteModal(false)} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-white py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937]">{t("Cancel")}</button>
                    <button type="button" onClick={invite.handleConfirmInvite} disabled={invite.isInviting} className="flex-1 rounded-2xl border-2 border-[#1f2937] bg-[#4AD95A] py-2 text-sm font-semibold text-[#1f2937] shadow-[2px_2px_0_#1f2937] disabled:opacity-60">{t("Send invite")}</button>
                </div>
            </div>
        </div>
    );
}
