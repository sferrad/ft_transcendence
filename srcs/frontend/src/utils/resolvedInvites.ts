const RESOLVED_KEY = 'resolved_invite_ids'
const EVENT = 'resolved-invite-updated'

function readIds(): number[] {
  try { return JSON.parse(localStorage.getItem(RESOLVED_KEY) ?? '[]') as number[] } catch { return [] }
}

export function markInviteResolved(matchId: number | null | undefined): void {
  if (!matchId) return
  const ids = readIds()
  if (!ids.includes(matchId)) {
    ids.push(matchId)
    try { localStorage.setItem(RESOLVED_KEY, JSON.stringify(ids)) } catch { /* quota */ }
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: ids }))
}

export function getResolvedIds(): Set<number> {
  return new Set(readIds())
}

export function onResolvedUpdated(cb: (ids: Set<number>) => void): () => void {
  const handler = (e: Event) => cb(new Set((e as CustomEvent<number[]>).detail))
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
