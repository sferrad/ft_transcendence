import { useTranslation } from 'react-i18next'
import type { ForfeitState } from './types'
import { ARCADE_BTN } from './constants'

interface ForfeitOverlayProps {
  forfeit: ForfeitState
  myName: string
  onShowResults?: () => void
  onBack: () => void
}

export function ForfeitOverlay({ forfeit, myName, onShowResults, onBack }: ForfeitOverlayProps) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden',
        background: forfeit.isWin
          ? 'radial-gradient(ellipse at 50% 40%, #22c55e22 0%, #050e1a 70%)'
          : 'radial-gradient(ellipse at 50% 40%, #ef444422 0%, #050e1a 70%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}
    >
      <div
        className="font-arcade"
        style={{
          display: 'flex', alignItems: 'center', gap: 24,
          fontSize: 'clamp(32px, 5vw, 72px)',
          color: '#fff',
          letterSpacing: 6,
          marginBottom: 8,
        }}
      >
        <span style={{ color: forfeit.winnerRole === 'player1' ? '#22c55e' : '#ef4444' }}>{forfeit.score1}</span>
        <span style={{ color: '#4b5563', fontSize: '0.6em' }}>–</span>
        <span style={{ color: forfeit.winnerRole === 'player2' ? '#22c55e' : '#ef4444' }}>{forfeit.score2}</span>
      </div>

      <div
        className="font-arcade"
        style={{
          fontSize: 'clamp(20px, 3vw, 42px)',
          color: forfeit.isWin ? '#22c55e' : '#ef4444',
          letterSpacing: 4, textTransform: 'uppercase',
          textShadow: forfeit.isWin
            ? '0 0 28px #22c55e99, 4px 4px 0 #000'
            : '0 0 28px #ef444499, 4px 4px 0 #000',
        }}
      >
        {forfeit.isWin
          ? (forfeit.voluntary ? t('forfeit.win_abandon_title') : t('forfeit.win_title'))
          : (forfeit.voluntary ? t('forfeit.abandon_title') : t('forfeit.loss_title'))}
      </div>

      <div className="font-arcade text-gray-300 text-lg text-center px-8">
        {forfeit.isWin
          ? (forfeit.voluntary
              ? t('forfeit.win_abandon_desc', { name: forfeit.opponentName })
              : t('forfeit.win_desc', { name: forfeit.opponentName }))
          : (forfeit.voluntary
              ? t('forfeit.abandon_desc')
              : t('forfeit.loss_desc', { name: myName }))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {onShowResults && (
          <button
            className="font-arcade"
            onClick={onShowResults}
            style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#7c3aed', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
          >
            {t('Results')}
          </button>
        )}
        <button
          className="font-arcade"
          onClick={onBack}
          style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#2563EB', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
        >
          {t('Back')}
        </button>
      </div>
    </div>
  )
}
