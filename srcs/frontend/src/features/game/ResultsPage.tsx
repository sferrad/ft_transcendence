import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { UserStats } from './api/matches'
import { AnimatedBar } from './components/AnimatedBar'

interface ResultsState {
  stats: UserStats
  lpDelta: number
  xpDelta: number
  backRoute: string
  gameRoute: string
  gameMode?: string
}

const KEYFRAMES = `
@keyframes go-bg { from { opacity: 0; } to { opacity: 1; } }
@keyframes go-slide { from { transform: translateY(32px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes go-btn { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

const TIER_THRESHOLDS = [
  { name: 'Iron',     min: 0,   max: 50   },
  { name: 'Bronze',   min: 50,  max: 150  },
  { name: 'Silver',   min: 150, max: 300  },
  { name: 'Gold',     min: 300, max: 500  },
  { name: 'Platinum', min: 500, max: 750  },
  { name: 'Diamond',  min: 750, max: 1000 },
]

const TIER_GLOW: Record<string, string> = {
  Iron: '#94a3b8', Bronze: '#f59e0b', Silver: '#cbd5e1',
  Gold: '#eab308', Platinum: '#2dd4bf', Diamond: '#60a5fa',
}

export default function ResultsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ResultsState | null

  if (!state?.stats) { navigate('/'); return null }

  const { stats, lpDelta, xpDelta, backRoute, gameRoute, gameMode } = state
  const isRanked = gameMode === 'online'

  const tier = TIER_THRESHOLDS.find(th => th.name === stats.tier) ?? TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1]
  const nextTier = TIER_THRESHOLDS[TIER_THRESHOLDS.indexOf(tier) + 1]
  const lpRange = tier.max - tier.min
  const glowColor = TIER_GLOW[stats.tier] ?? '#94a3b8'

  const beforeLP    = Math.max(tier.min, stats.lp - lpDelta)
  const beforeLPPct = Math.min(100, Math.max(0, Math.round(((beforeLP - tier.min) / lpRange) * 100)))
  const afterLPPct  = Math.min(100, Math.max(0, Math.round(((stats.lp  - tier.min) / lpRange) * 100)))

  const xpTotal = stats.xp_in_level + stats.xp_to_next
  const xpPct   = xpTotal > 0 ? Math.round((stats.xp_in_level / xpTotal) * 100) : 0
  const lpSign  = lpDelta >= 0 ? '+' : ''
  const lpColor = lpDelta >= 0 ? '#4ade80' : '#f87171'

  const arcadeBtn = (bg: string, color = '#fff') => ({
    padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer',
    border: 'none', borderRadius: 0, background: bg, color,
    letterSpacing: 2, textTransform: 'uppercase' as const,
    boxShadow: ARCADE_BTN, transition: 'transform 0.1s',
  })

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${glowColor}1a 0%, #050e1a 60%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, animation: 'go-bg 0.35s ease both' }}>

        <div className="font-arcade" style={{ fontSize: 'clamp(20px, 3vw, 36px)', color: 'rgba(255,255,255,0.75)', letterSpacing: 8, textTransform: 'uppercase', textShadow: '0 0 24px rgba(255,255,255,0.12)', animation: 'go-slide 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.05s both' }}>
          {t('Results')}
        </div>

        <div style={{ width: 'min(700px, 92vw)', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 40, animation: 'go-slide 0.5s ease 0.12s both', boxShadow: '0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>

          {isRanked && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span className="font-arcade" style={{ fontSize: 'clamp(18px, 2.2vw, 28px)', letterSpacing: 4, padding: '8px 22px', borderRadius: 8, border: `1px solid ${glowColor}55`, background: `${glowColor}18`, color: glowColor, boxShadow: `0 0 16px ${glowColor}44` }}>
                  {t(`tier.${stats.tier}`)}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span className="font-arcade" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: 2 }}>{stats.lp} LP</span>
                  <span className="font-arcade" style={{ color: lpColor, fontSize: 'clamp(20px, 2.5vw, 32px)', letterSpacing: 1 }}>{lpSign}{lpDelta}</span>
                </div>
              </div>
              <AnimatedBar fromPct={beforeLPPct} toPct={afterLPPct} color={glowColor} glowColor={glowColor} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>{tier.min} LP</span>
                {nextTier
                  ? <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>{t(`tier.${nextTier.name}`)} → {nextTier.min} LP</span>
                  : <span style={{ fontSize: 14, color: glowColor, fontFamily: 'monospace', opacity: 0.6 }}>MAX</span>
                }
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span className="font-arcade" style={{ fontSize: 'clamp(18px, 2.2vw, 28px)', letterSpacing: 4, padding: '8px 22px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.12)', color: '#93c5fd', boxShadow: '0 0 16px rgba(96,165,250,0.25)' }}>
                {t('stats.level')} {stats.level}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span className="font-arcade" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: 2 }}>
                  {stats.xp_in_level} <span style={{ fontSize: '0.55em', opacity: 0.45 }}>/ {xpTotal} XP</span>
                </span>
                <span className="font-arcade" style={{ color: '#60a5fa', fontSize: 'clamp(20px, 2.5vw, 32px)', letterSpacing: 1 }}>+{xpDelta}</span>
              </div>
            </div>
            <AnimatedBar fromPct={0} toPct={xpPct} color="#3b82f6" glowColor="#60a5fa" />
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>{stats.xp_to_next} XP {t('stats.to_next_level')}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, animation: 'go-btn 0.5s ease 0.45s both', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="font-arcade" onClick={() => navigate(gameRoute)}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={arcadeBtn('#4AD95A', '#000')}>
            {t('Replay')}
          </button>
          <button className="font-arcade" onClick={() => navigate(backRoute)}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={arcadeBtn('#2563EB')}>
            {t('Back')}
          </button>
        </div>
      </div>
    </>
  )
}
