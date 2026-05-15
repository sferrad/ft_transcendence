import type { MatchmakingResult } from '../features/game/api/matchmaking'

export type PendingInviteInfo = MatchmakingResult & { myNation?: string; themeId?: string }

const KEY = 'pending_invite_info'
const TTL_MS = 5 * 60 * 1000

export function savePendingInvite(info: PendingInviteInfo): void {
  localStorage.setItem(KEY, JSON.stringify({ info, savedAt: Date.now() }))
}

export function clearPendingInvite(): void {
  localStorage.removeItem(KEY)
}

export function getPendingInvite(): PendingInviteInfo | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const { info, savedAt } = JSON.parse(raw) as { info: PendingInviteInfo; savedAt: number }
    if (Date.now() - savedAt > TTL_MS) { clearPendingInvite(); return null }
    return info
  } catch {
    clearPendingInvite()
    return null
  }
}
