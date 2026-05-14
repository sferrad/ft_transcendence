import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchLeaderboard, type LeaderboardEntry } from '../../Gameplay/api/matches'
import { fetchProfileByUserId } from '../api/profile'
import { loadAvatarSrc } from '../api/avatar'

interface EntryWithName extends LeaderboardEntry {
  displayName: string
  avatarSrc: string | null
}

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-700']
const RANK_MEDALS = ['🥇', '🥈', '🥉']

const TIER_STYLES: Record<string, string> = {
  Iron:     'bg-gray-200 text-gray-700',
  Bronze:   'bg-amber-100 text-amber-800',
  Silver:   'bg-slate-200 text-slate-700',
  Gold:     'bg-yellow-100 text-yellow-700',
  Platinum: 'bg-teal-100 text-teal-700',
  Diamond:  'bg-blue-100 text-blue-700',
}

export function Leaderboard({ myUserId }: { myUserId: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<EntryWithName[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token') ?? ''
    fetchLeaderboard().then(async data => {
      const withNames = await Promise.all(
        data.map(async e => {
          try {
            const p = await fetchProfileByUserId(token, e.user_id)
            const avatarSrc = await loadAvatarSrc(token, p.avatar_url ?? null)
            return { ...e, displayName: p.display_name || `#${e.user_id}`, avatarSrc }
          } catch {
            return { ...e, displayName: `#${e.user_id}`, avatarSrc: null }
          }
        })
      )
      setEntries(withNames)
    }).finally(() => setLoading(false))
  }, [])

  // Clicking a row navigates to that user's profile page. Own row goes to /profile
  // (no userId param → Profile component shows the "me" view).
  const goToProfile = (userId: number) => {
    if (userId === myUserId) navigate('/profile')
    else navigate(`/profile?userId=${userId}`)
  }

  return (
    <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
      <div className="mb-3 font-arcade tracking-wide text-base min-[481px]:text-lg">{t('leaderboard.title')}</div>

      {loading ? (
        <div className="text-lg text-center text-[#6b7280] py-2">{t('Loading...')}</div>
      ) : entries.length === 0 ? (
        <div className="text-lg text-center text-[#6b7280] py-2">{t('leaderboard.empty')}</div>
      ) : (
        <div className="space-y-1">
          {entries.map(e => {
            const isMe = e.user_id === myUserId
            const medal = RANK_MEDALS[e.rank - 1]
            const rankCls = RANK_COLORS[e.rank - 1] ?? 'text-[#1f2937]'

            return (
              <button
                key={e.user_id}
                type="button"
                onClick={() => goToProfile(e.user_id)}
                className={`w-full grid items-center rounded border px-3 py-1.5 gap-x-2 cursor-pointer transition-colors ${
                  isMe
                    ? 'bg-blue-100/80 font-semibold border-blue-300 hover:bg-blue-200/80'
                    : 'bg-white/60 hover:bg-white/90 border-[#2b2b2b]'
                }`}
                style={{ gridTemplateColumns: '2.5rem 2rem 1fr 6.5rem 4.5rem' }}
              >
                <span className={`font-arcade text-lg text-center ${rankCls}`}>
                  {medal ?? `#${e.rank}`}
                </span>
                <span className="flex items-center justify-center">
                  <img src={e.avatarSrc ?? '/assets/default-profile.jpg'} alt="" className="w-7 h-7 rounded-full object-cover border border-[#2b2b2b]" />
                </span>
                <span className="truncate text-lg text-left min-w-0">
                  {e.displayName}{isMe && <span className="ml-1 text-base text-blue-600">({t('You')})</span>}
                </span>
                <span className={`font-arcade text-lg px-2 py-0.5 rounded border border-[#2b2b2b] text-center whitespace-nowrap ${TIER_STYLES[e.tier] ?? 'bg-gray-100 text-gray-700'}`}>
                  {t(`tier.${e.tier}`)}
                </span>
                <span className="font-arcade text-lg text-blue-600 text-right whitespace-nowrap">{e.lp} LP</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
