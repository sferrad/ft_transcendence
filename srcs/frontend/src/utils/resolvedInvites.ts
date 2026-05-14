const EVENT = 'resolved-invite-updated'

const _resolved = new Set<number>()

export function markInviteResolved(matchId: number | null | undefined): void {
  if (!matchId) return
  _resolved.add(matchId)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: Array.from(_resolved) }))
}

export function getResolvedIds(): Set<number> {
  return new Set(_resolved)
}

export function onResolvedUpdated(cb: (ids: Set<number>) => void): () => void {
  const handler = (e: Event) => cb(new Set((e as CustomEvent<number[]>).detail))
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
