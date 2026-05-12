export interface MatchmakingResult {
  status: 'waiting' | 'matched' | 'idle'
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
