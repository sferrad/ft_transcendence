import { useTranslation } from 'react-i18next'
import { faceSrc } from '../../characters'

interface GameOverProps {
  isDraw: boolean
  winner: string
  winnerColor: string
  winnerNation: string
  player1Nation: string
  player1Color: string
  player2Nation: string
  player2Color: string
  mirrorWinner?: boolean
  score1: number
  score2: number
  onReplay: () => void
  onBack: () => void
  onShowResults?: () => void
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
@keyframes go-face {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.18) rotate(5deg); opacity: 1; }
  78%  { transform: scale(0.94) rotate(-2deg); }
  88%  { transform: scale(1.06) rotate(1deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes go-glow {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%       { opacity: 0.95; transform: scale(1.18); }
}
@keyframes go-btn {
  from { transform: translateY(18px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

function HexFace({ nation, color, size = 160 }: { nation: string; color: string; size?: number }) {
  const inner = Math.round(size * 0.937)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        position: 'absolute',
        width: size * 1.4, height: size * 1.4, borderRadius: '50%',
        background: `${color}99`, filter: 'blur(40px)',
        animation: 'go-glow 2s ease infinite',
        top: -size * 0.2, left: '50%', transform: 'translateX(-50%)',
      }} />
      <div style={{
        width: size, height: size,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
        WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
        filter: `drop-shadow(0 0 24px ${color}aa)`,
        animation: 'go-face 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
      }}>
        <div style={{
          width: inner, height: inner,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
          WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
          background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}88, #0f172a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={faceSrc(nation)} alt={nation} style={{ width: '76%', height: 'auto' }} />
        </div>
      </div>
    </div>
  )
}

export function GameOver({
  isDraw, winner, winnerColor, winnerNation,
  player1Nation, player1Color, player2Nation, player2Color,
  mirrorWinner = false, score1, score2, onReplay, onBack, onShowResults,
}: GameOverProps) {
  const { t } = useTranslation()
  const accentColor = isDraw ? '#ffffff' : winnerColor

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 40%, ${accentColor}22 0%, #050e1a 70%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20,
        animation: 'go-bg 0.4s ease both',
      }}>

        <div className="font-arcade" style={{
          fontSize: 'clamp(32px, 5.5vw, 72px)',
          color: accentColor,
          letterSpacing: 6,
          textTransform: 'uppercase',
          textShadow: `0 0 28px ${accentColor}99, 5px 5px 0 #000, -3px -3px 0 #000`,
          animation: 'go-slide 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
          position: 'relative', zIndex: 2,
        }}>
          {isDraw ? t('Draw') : t('winner_text', { name: winner })}
        </div>

        {isDraw ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, position: 'relative', zIndex: 2 }}>
            <HexFace nation={player1Nation} color={player1Color} size={140} />
            <div className="font-arcade" style={{ fontSize: 'clamp(20px, 3vw, 40px)', color: '#64748b', letterSpacing: 4 }}>VS</div>
            <div style={{ transform: 'scaleX(-1)' }}>
              <HexFace nation={player2Nation} color={player2Color} size={140} />
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 2, transform: mirrorWinner ? 'scaleX(-1)' : 'none' }}>
            <HexFace nation={winnerNation} color={winnerColor} size={180} />
          </div>
        )}

        <div className="font-arcade" style={{
          fontSize: 'clamp(24px, 4vw, 52px)',
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 8,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          animation: 'go-slide 0.5s ease 0.35s both',
          position: 'relative', zIndex: 2,
        }}>
          {score1} - {score2}
        </div>

        <div style={{ display: 'flex', gap: 16, animation: 'go-btn 0.5s ease 0.6s both', position: 'relative', zIndex: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
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
          {onShowResults && (
            <button
              className="font-arcade"
              onClick={onShowResults}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#7c3aed', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN, transition: 'transform 0.1s' }}
            >
              {t('Results')} ›
            </button>
          )}
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
