import { SCORE_DEFAULT, TIMER_DEFAULT } from "../game/engine/constants";
import { THEME_DEFAULT } from "../game/themes";

// Marker used to identify chat messages that are actually game invites.
// Format: __GAME_INVITE__|<match_id>|<from_user_id>|<from_name>|<from_nation>|<winning_score>|<duration>|<theme_id>
export const INVITE_PREFIX = "__GAME_INVITE__|";

export interface ParsedInvite {
    matchId: number;
    fromUserId: number;
    fromName: string;
    fromNation: string;
    winningScore: 3 | 5 | null;
    duration: 30 | 60 | null;
    themeId: string;
}

export function parseInviteContent(content: string): ParsedInvite | null {
    if (!content.startsWith(INVITE_PREFIX)) return null;
    const parts = content.slice(INVITE_PREFIX.length).split("|");
    if (parts.length < 4) return null;
    const matchId = Number(parts[0]);
    const fromUserId = Number(parts[1]);
    if (!Number.isFinite(matchId) || matchId <= 0) return null;
    if (!Number.isFinite(fromUserId) || fromUserId <= 0) return null;
    const rawScore = parts[4];
    const rawDuration = parts[5];
    const winningScore = rawScore === "null" ? null : ([3, 5] as const).includes(Number(rawScore) as 3 | 5) ? Number(rawScore) as 3 | 5 : SCORE_DEFAULT;
    const duration = rawDuration === "null" ? null : ([30, 60] as const).includes(Number(rawDuration) as 30 | 60) ? Number(rawDuration) as 30 | 60 : TIMER_DEFAULT;
    const themeId = parts[6] || THEME_DEFAULT.id;
    return { matchId, fromUserId, fromName: parts[2], fromNation: parts[3], winningScore, duration, themeId };
}

export const TYPING_TIMEOUT_MS = 3500;
