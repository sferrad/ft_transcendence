export interface Achievement {
  id: string
  emoji: string
  unlocked: boolean
}

export interface UserStats {
  wins: number
  losses: number
  draws: number
  total: number
  xp: number
  level: number
  xp_in_level: number
  xp_to_next: number
  win_rate: number
  lp: number
  tier: string
  achievements: Achievement[]
}

export interface LeaderboardEntry {
  user_id: number
  rank: number
  wins: number
  losses: number
  draws: number
  xp: number
  level: number
  win_rate: number
  lp: number
  tier: string
}

export interface MatchResult {
  id: number
  player1_id: number
  player2_id: number
  winner_id: number | null
  score_player1: number
  score_player2: number
  status: string
  game_mode: string
  created_at: string
  finished_at: string | null
}

export interface MatchStats {
  wins: number
  losses: number
  draws: number
  total: number
  winRate: number
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function getUserId(): number {
  const stored = Number(localStorage.getItem('user_id') ?? '0')
  if (stored > 0) return stored
  // Fallback: extract sub from JWT if user_id wasn't stored
  const token = localStorage.getItem('access_token')
  if (!token) return 0
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Number(payload.sub) || 0
  } catch {
    return 0
  }
}

export async function saveMatchResult(opts: {
  score_player1: number
  score_player2: number
  winner: 'player1' | 'player2' | null
  gameMode?: string
}): Promise<void> {
  const userId = getUserId()
  if (!userId) return

  const headers = authHeaders()

  const createRes = await fetch('/api/game/me/matches/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ player2_id: 0, game_mode: opts.gameMode ?? 'solo' }),
  })
  if (!createRes.ok) return

  const match: MatchResult = await createRes.json()

  const winner_id =
    opts.winner === 'player1' ? userId :
    opts.winner === 'player2' ? 0 : null

  await fetch(`/api/game/matches/${match.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      score_player1: opts.score_player1,
      score_player2: opts.score_player2,
      status: 'finished',
      winner_id,
      finished_at: new Date().toISOString(),
    }),
  })
}

export async function fetchMyMatches(opts?: { gameMode?: string }): Promise<MatchResult[]> {
  const qs = new URLSearchParams({ limit: '50' })
  if (opts?.gameMode) qs.set('game_mode', opts.gameMode)
  const res = await fetch(`/api/game/me/matches/?${qs.toString()}`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function fetchMyStats(): Promise<UserStats | null> {
  const res = await fetch('/api/game/me/stats/', { headers: authHeaders() })
  if (!res.ok) return null
  return res.json()
}

export async function fetchUserMatches(userId: number, opts?: { gameMode?: string }): Promise<MatchResult[]> {
  if (!userId || userId <= 0) return []
  const qs = new URLSearchParams({ limit: '50' })
  if (opts?.gameMode) qs.set('game_mode', opts.gameMode)
  const res = await fetch(`/api/game/users/${userId}/matches/?${qs.toString()}`, { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export async function fetchUserStats(userId: number): Promise<UserStats | null> {
  if (!userId || userId <= 0) return null
  const res = await fetch(`/api/game/users/${userId}/stats/`, { headers: authHeaders() })
  if (!res.ok) return null
  return res.json()
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/game/leaderboard/', { headers: authHeaders() })
  if (!res.ok) return []
  return res.json()
}

export function computeStats(matches: MatchResult[], userId: number): MatchStats {
  let wins = 0, losses = 0, draws = 0
  for (const m of matches) {
    if (m.status !== 'finished') continue
    if (m.winner_id === null) { draws++; continue }
    // If userId is unknown (0), fall back to player1_id since the user is always player1
    const effectiveId = userId > 0 ? userId : m.player1_id
    if (m.winner_id === effectiveId) wins++
    else losses++
  }
  const total = wins + losses + draws
  return { wins, losses, draws, total, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 }
}
