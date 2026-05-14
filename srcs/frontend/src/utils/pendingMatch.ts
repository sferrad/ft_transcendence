import type { MatchmakingResult } from '../Gameplay/api/matchmaking'

export type PendingMatchInfo = MatchmakingResult & { myNation?: string; themeId?: string }

const KEY_INFO = 'pending_match_info'
const KEY_EXPIRY = 'pending_match_expiry'

export function savePendingMatch(info: PendingMatchInfo, lifespanMs: number): void {
  localStorage.setItem(KEY_INFO, JSON.stringify(info))
  localStorage.setItem(KEY_EXPIRY, String(Date.now() + lifespanMs))
}

export function clearPendingMatch(): void {
  localStorage.removeItem(KEY_INFO)
  localStorage.removeItem(KEY_EXPIRY)
}

export function getPendingMatch(): { info: PendingMatchInfo; expiresAt: number } | null {
  const raw = localStorage.getItem(KEY_INFO)
  const expiry = localStorage.getItem(KEY_EXPIRY)
  if (!raw || !expiry) return null
  const expiresAt = Number(expiry)
  if (Date.now() >= expiresAt) {
    clearPendingMatch()
    return null
  }
  try {
    return { info: JSON.parse(raw) as PendingMatchInfo, expiresAt }
  } catch {
    clearPendingMatch()
    return null
  }
}
