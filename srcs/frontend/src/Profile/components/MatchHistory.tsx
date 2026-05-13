import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchMyMatches,
  fetchMyStats,
  fetchUserMatches,
  fetchUserStats,
  type MatchResult,
  type UserStats,
} from '../../Gameplay/api/matches'

interface Props {
  // Owner of the displayed history. If `isSelf` is true, we use the
  // authenticated /me endpoints; otherwise we use the public /users/{id} ones.
  userId: number
  isSelf?: boolean
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const TIER_STYLES: Record<string, string> = {
  Iron:     'bg-gray-200 text-gray-700',
  Bronze:   'bg-amber-100 text-amber-800',
  Silver:   'bg-slate-200 text-slate-700',
  Gold:     'bg-yellow-100 text-yellow-700',
  Platinum: 'bg-teal-100 text-teal-700',
  Diamond:  'bg-blue-100 text-blue-700',
}

function XpBar({ xpInLevel, xpToNext }: { xpInLevel: number; xpToNext: number }) {
  const total = xpInLevel + xpToNext
  const pct = total > 0 ? Math.round((xpInLevel / total) * 100) : 0
  return (
    <div className="w-full h-3 rounded-full bg-[#2b2b2b]/20 overflow-hidden border border-[#2b2b2b]/30">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function MatchHistory({ userId, isSelf = true }: Props) {
  const { t } = useTranslation()
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const matchesPromise = isSelf
      ? fetchMyMatches({ gameMode: 'online' })
      : fetchUserMatches(userId, { gameMode: 'online' })
    const statsPromise = isSelf ? fetchMyStats() : fetchUserStats(userId)

    Promise.all([
      matchesPromise.then(data => data.filter(m => m.status === 'finished')),
      statsPromise,
    ]).then(([m, s]) => {
      setMatches(m)
      setStats(s)
    }).finally(() => setLoading(false))
  }, [userId, isSelf])

  if (loading) {
    return (
      <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937] text-center text-sm">
        {t('Chargement...')}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">

      {/* Niveau + XP + LP */}
      {stats && (
        <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-arcade tracking-wide text-base min-[481px]:text-lg">{t('stats.level')} {stats.level}</span>
            <div className="flex items-center gap-2">
              <span className={`font-arcade text-lg px-2 py-0.5 rounded border border-[#2b2b2b] ${TIER_STYLES[stats.tier] ?? 'bg-gray-100 text-gray-700'}`}>
                {t(`tier.${stats.tier}`)}
              </span>
              <span className="font-arcade text-lg text-blue-600">{stats.lp} LP</span>
            </div>
          </div>
          <XpBar xpInLevel={stats.xp_in_level} xpToNext={stats.xp_to_next} />
          <div className="text-xs text-[#6b7280] mt-1 text-right">{stats.xp_to_next} XP {t('stats.to_next_level')}</div>
        </div>
      )}

      {/* Stats victoires/défaites */}
      <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
        <div className="mb-3 font-arcade tracking-wide text-base min-[481px]:text-lg">{t('stats.title')}</div>

        <div className="grid grid-cols-2 min-[481px]:grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-green-100 border-2 border-[#2b2b2b] px-3 py-2 text-center">
            <div className="font-arcade text-lg text-green-700">{stats?.wins ?? 0}</div>
            <div className="text-xs mt-1">{t('stats.wins', { count: stats?.wins ?? 0 })}</div>
          </div>
          <div className="rounded-lg bg-red-100 border-2 border-[#2b2b2b] px-3 py-2 text-center">
            <div className="font-arcade text-lg text-red-700">{stats?.losses ?? 0}</div>
            <div className="text-xs mt-1">{t('stats.losses', { count: stats?.losses ?? 0 })}</div>
          </div>
          <div className="rounded-lg bg-yellow-100 border-2 border-[#2b2b2b] px-3 py-2 text-center">
            <div className="font-arcade text-lg text-yellow-700">{stats?.draws ?? 0}</div>
            <div className="text-xs mt-1">{t('stats.draws', { count: stats?.draws ?? 0 })}</div>
          </div>
          <div className="rounded-lg bg-blue-100 border-2 border-[#2b2b2b] px-3 py-2 text-center">
            <div className="font-arcade text-lg text-blue-700">{stats?.win_rate ?? 0}%</div>
            <div className="text-xs mt-1">{t('stats.winrate')}</div>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="text-sm text-center text-[#6b7280] py-2">{t('stats.no_matches')}</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {matches.map(m => {
              const effectiveId = userId > 0 ? userId : m.player1_id
              const isWin = m.winner_id === effectiveId
              const isDraw = m.winner_id === null
              const score = `${m.score_player1} - ${m.score_player2}`
              // All matches here are online (filtered server-side) → always show LP.
              const row = isDraw
                ? { label: t('stats.draw'), lp: '+5',  lpCls: 'text-yellow-700', rowCls: 'bg-yellow-100/80 border-yellow-300', labelCls: 'text-yellow-800', dateCls: 'text-yellow-700' }
                : isWin
                ? { label: t('stats.win'),  lp: '+20', lpCls: 'text-green-700',  rowCls: 'bg-green-100/80 border-green-300',  labelCls: 'text-green-800',  dateCls: 'text-green-700' }
                : { label: t('stats.loss'), lp: '-13', lpCls: 'text-red-700',    rowCls: 'bg-red-100/80 border-red-300',      labelCls: 'text-red-800',    dateCls: 'text-red-700' }

              return (
                <div
                  key={m.id}
                  className={`grid items-center rounded border px-3 py-1.5 text-sm gap-x-2 ${row.rowCls}`}
                  style={{ gridTemplateColumns: '2rem 1fr 4rem 4rem' }}
                >
                  <span className={`font-arcade text-lg text-center ${row.labelCls}`}>{row.label}</span>
                  <span className="font-arcade text-lg tracking-widest text-center text-[#1f2937]">{score}</span>
                  <span className={`font-arcade text-lg text-right whitespace-nowrap ${row.lpCls}`}>{row.lp} LP</span>
                  <span className={`text-sm text-right whitespace-nowrap ${row.dateCls}`}>{m.created_at ? formatDate(m.created_at) : '-'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Achievements (only on own profile) */}
      {isSelf && stats && stats.achievements.length > 0 && (
        <div className="rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
          <div className="mb-3 font-arcade tracking-wide text-base min-[481px]:text-lg">{t('stats.achievements')}</div>
          <div className="grid grid-cols-3 min-[481px]:grid-cols-6 gap-2">
            {stats.achievements.map(a => (
              <div
                key={a.id}
                title={t(`achievement.${a.id}`)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 border-[#2b2b2b] px-2 py-2 text-center transition-all ${
                  a.unlocked
                    ? 'bg-yellow-50 shadow-[2px_2px_0_#2b2b2b]'
                    : 'bg-white/40 opacity-35 grayscale'
                }`}
              >
                <span className="text-2xl leading-none">{a.emoji}</span>
                <span className="text-[9px] leading-tight text-[#4b5563] font-medium">{t(`achievement.${a.id}`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
