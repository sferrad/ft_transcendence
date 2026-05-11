import { useTranslation } from 'react-i18next'

interface GameOverProps {
  isDraw: boolean
  winner: string
  winnerColor: string
  score1: number
  score2: number
  onReplay: () => void
  onBack: () => void
}

const KEYFRAMES = `
@keyframes go-bg {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes go-slide {
  from { transform: translateY(32px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes go-btn {
  from { transform: translateY(18px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

export function GameOver({ isDraw, winner, winnerColor, score1, score2, onReplay, onBack }: GameOverProps) {
  const { t } = useTranslation()

  const accentColor = isDraw ? '#ffffff' : winnerColor

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 40%, ${accentColor}22 0%, #050e1a 70%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24,
        animation: 'go-bg 0.4s ease both',
      }}>

        {/* Nom du gagnant ou ÉGALITÉ */}
        <div
          className="font-arcade"
          style={{
            fontSize: 'clamp(36px, 6vw, 80px)',
            color: accentColor,
            letterSpacing: 6,
            textTransform: 'uppercase',
            textShadow: `0 0 28px ${accentColor}99, 5px 5px 0 #000, -3px -3px 0 #000`,
            animation: 'go-slide 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            position: 'relative', zIndex: 2,
          }}
        >
          {isDraw ? t('Draw') : t('winner_text', { name: winner })}
        </div>

        {/* Score final */}
        <div
          className="font-arcade"
          style={{
            fontSize: 'clamp(28px, 4.5vw, 60px)',
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 8,
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            animation: 'go-slide 0.5s ease 0.35s both',
            position: 'relative', zIndex: 2,
          }}
        >
          {score1} - {score2}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 24, animation: 'go-btn 0.5s ease 0.6s both', position: 'relative', zIndex: 2 }}>
          <button
            className="font-arcade"
            onClick={onReplay}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4AD95A', color: '#000', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN, transition: 'transform 0.1s' }}
          >
            {t('Replay')}
          </button>
          <button
            className="font-arcade"
            onClick={onBack}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#2563EB', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN, transition: 'transform 0.1s' }}
          >
            {t('Back')}
          </button>
        </div>
      </div>
    </>
  )
}
