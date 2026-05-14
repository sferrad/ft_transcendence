export interface MatchmakingResult {
  status: 'waiting' | 'matched' | 'idle' | 'declined'
  match_id?: number
  game_room_id?: string
  role?: 'player1' | 'player2'
  seed?: number
  opponent_name?: string
  opponent_nation?: string
  winning_score?: number | null
  duration?: number | null
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function joinMatchmaking(opts: {
  playerName: string
  playerNation: string
  winningScore?: number | null
  duration?: number | null
}): Promise<MatchmakingResult> {
  const res = await fetch('/api/game/me/matchmaking/join', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      player_name: opts.playerName,
      player_nation: opts.playerNation,
      winning_score: opts.winningScore ?? 3,
      duration: opts.duration ?? null,
    }),
  })
  if (!res.ok) throw new Error(`Matchmaking join failed: ${res.status}`)
  return res.json()
}

export async function getMatchmakingStatus(): Promise<MatchmakingResult> {
  const res = await fetch('/api/game/me/matchmaking/status', { headers: authHeaders() })
  if (!res.ok) throw new Error(`Matchmaking status failed: ${res.status}`)
  return res.json()
}

export async function leaveMatchmaking(): Promise<void> {
  await fetch('/api/game/me/matchmaking/leave', {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

// ── DM invites: bypass the matchmaking queue and pair two known users. ──
export async function createDmInvite(opts: {
  targetUserId: number
  playerName: string
  playerNation: string
  winningScore?: number | null
  duration?: number | null
}): Promise<MatchmakingResult> {
  const res = await fetch(`/api/game/me/invites/dm/${opts.targetUserId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      player_name: opts.playerName,
      player_nation: opts.playerNation,
      winning_score: opts.winningScore ?? 3,
      duration: opts.duration ?? null,
    }),
  })
  if (!res.ok) throw new Error(`Invite failed: ${res.status}`)
  return res.json()
}

export async function acceptInvite(opts: {
  matchId: number
  playerName: string
  playerNation: string
}): Promise<MatchmakingResult> {
  const res = await fetch(`/api/game/me/invites/${opts.matchId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      player_name: opts.playerName,
      player_nation: opts.playerNation,
    }),
  })
  if (!res.ok) throw new Error(`Accept failed: ${res.status}`)
  return res.json()
}

export async function pollPendingInviteResult(): Promise<MatchmakingResult> {
  const res = await fetch('/api/game/me/invites/pending', { headers: authHeaders() })
  if (!res.ok) throw new Error(`Poll invite failed: ${res.status}`)
  return res.json()
}

export async function cancelInvite(matchId: number): Promise<void> {
  await fetch(`/api/game/me/invites/${matchId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export async function updateOnlineMatch(opts: {
  matchId: number
  score_player1: number
  score_player2: number
  winner_id: number | null
}): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) return
  await fetch(`/api/game/matches/${opts.matchId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      score_player1: opts.score_player1,
      score_player2: opts.score_player2,
      status: 'finished',
      winner_id: opts.winner_id,
      finished_at: new Date().toISOString(),
    }),
  })
}
