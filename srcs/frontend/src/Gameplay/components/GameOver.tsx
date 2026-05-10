import { useTranslation } from 'react-i18next'
import { faceSrc, flagSrc } from '../../characters'

interface GameOverProps {
  winner: string
  winnerNation: string
  winnerColor: string
  onReplay: () => void
  onBack: () => void
}

const KEYFRAMES = `
@keyframes go-bg {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes go-face {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.18) rotate(5deg); opacity: 1; }
  78%  { transform: scale(0.94) rotate(-2deg); }
  88%  { transform: scale(1.06) rotate(1deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes go-badge {
  0%   { transform: scale(0) rotate(-25deg); opacity: 0; }
  55%  { transform: scale(1.35) rotate(6deg); opacity: 1; }
  72%  { transform: scale(0.92) rotate(-3deg); }
  84%  { transform: scale(1.08) rotate(2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes go-name {
  from { transform: translateY(28px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@kayframes go-flag {
  0%   { transform: scale(0) rotate(360deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes go-flag {
  0%   { transform: scale(0) rotate(360deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes go-btn {
  from { transform: translateY(18px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes go-glow {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.95; transform: scale(1.18); }
}
@keyframes go-trophy {
  0%, 100% { transform: translateY(0) rotate(-6deg) scale(1); }
  50%      { transform: translateY(-12px) rotate(6deg) scale(1.08); }
}
@keyframes go-star {
  0%   { transform: translate(0, 0) scale(1.2); opacity: 1; }
  80%  { opacity: 0.6; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
@keyframes go-line {
  from { transform: translateX(-120%) skewX(-18deg); opacity: 0.35; }
  to   { transform: translateX(120%)  skewX(-18deg); opacity: 0; }
}
@keyframes go-ring {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
}
`

const STARS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 360
  const dist = 160 + (i % 6) * 50
  const tx = Math.round(Math.cos((angle * Math.PI) / 180) * dist)
  const ty = Math.round(Math.sin((angle * Math.PI) / 180) * dist)
  return {
    tx: `${tx}px`,
    ty: `${ty}px`,
    size: 4 + (i % 4) * 3,
    delay: `${(i * 0.09) % 1.2}s`,
    dur: `${0.9 + (i % 5) * 0.18}s`,
    color: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#ffffff' : '#fb923c',
  }
})

const LINES = Array.from({ length: 10 }, (_, i) => ({
  top:   `${4 + i * 10}%`,
  h:     `${2 + (i % 3) * 2}px`,
  w:     `${30 + (i % 6) * 9}%`,
  dur:   `${0.45 + (i % 4) * 0.14}s`,
  delay: `${(i * 0.11) % 0.9}s`,
  side:  i % 2 === 0 ? 'left' : 'right',
}))

export function GameOver({ winner, winnerNation, winnerColor, onReplay, onBack }: GameOverProps) {
  const { t } = useTranslation()

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 40%, ${winnerColor}33 0%, #050e1a 65%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'go-bg 0.5s ease both',
      }}>

        {/* Lignes de vitesse */}
        {LINES.map((l, i) => (
          <div key={i} style={{
            position: 'absolute', top: l.top,
            [l.side]: 0,
            height: l.h, width: l.w,
            background: `linear-gradient(${l.side === 'left' ? '90deg' : '270deg'}, transparent, ${winnerColor}55, transparent)`,
            borderRadius: 2,
            animation: `go-line ${l.dur} linear ${l.delay} infinite`,
          }} />
        ))}

        {/* Anneaux d'expansion */}
        {[0, 0.35, 0.7].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute', top: '42%', left: '50%',
            width: 280, height: 280, borderRadius: '12%',
            border: `2px solid ${winnerColor}88`,
            animation: `go-ring 2s ease-out ${delay}s infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Particules étoiles */}
        {STARS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: '42%', left: '50%',
            width: s.size, height: s.size, borderRadius: 2,
            background: s.color,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
            '--tx': s.tx, '--ty': s.ty,
            animation: `go-star ${s.dur} ease-out ${s.delay} infinite`,
          } as React.CSSProperties} />
        ))}

        {/* Trophée */}
        <div style={{
          fontSize: 'clamp(38px, 5vw, 64px)',
          animation: 'go-trophy 2.2s ease-in-out 0.6s infinite',
          filter: 'drop-shadow(0 0 18px #facc15)',
          marginBottom: 6,
          position: 'relative', zIndex: 2,
        }}>🏆</div>

        {/* VICTOIRE badge */}
        <div className="font-arcade" style={{
          fontSize: 'clamp(32px, 5.5vw, 72px)',
          color: '#facc15', letterSpacing: 6,
          textShadow: '0 0 30px #facc15, 0 0 70px #f97316, 5px 5px 0 #000, -5px -5px 0 #000',
          animation: 'go-badge 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.25s both',
          marginBottom: 28, position: 'relative', zIndex: 2,
        }}>
          TERMINÉ !
        </div>

        {/* Cercle avec le visage du gagnant */}
        <div style={{ position: 'relative', marginBottom: 14, zIndex: 2 }}>
          <div style={{
            position: 'absolute', width: 260, height: 260, borderRadius: '50%',
            background: `${winnerColor}99`, filter: 'blur(45px)',
            animation: 'go-glow 2s ease infinite',
            top: -50, left: '50%', transform: 'translateX(-50%)',
          }} />
          <div style={{
            width: 190, height: 190,
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
            filter: `drop-shadow(0 0 30px ${winnerColor}aa)`,
            animation: 'go-face 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
          }}>
            <div style={{
              width: 178, height: 178,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
              background: `radial-gradient(circle at 30% 30%, ${winnerColor}cc, ${winnerColor}88, #0f172a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={faceSrc(winnerNation)} alt={winnerNation} style={{ width: '76%', height: 'auto' }} />
            </div>
          </div>
        </div>

        {/* Drapeau */}
        <img
          src={flagSrc(winnerNation)}
          alt={winnerNation}
          style={{
            width: 68, height: 'auto',
            filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.8))',
            animation: 'go-flag 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.65s both',
            marginBottom: 10, position: 'relative', zIndex: 2,
          }}
        />

        {/* Nom du gagnant */}
        <div className="font-arcade" style={{
          fontSize: 'clamp(18px, 2.8vw, 38px)', color: '#fff',
          letterSpacing: 4, textTransform: 'uppercase',
          textShadow: `0 0 22px ${winnerColor}, 0 3px 10px rgba(0,0,0,0.9)`,
          animation: 'go-name 0.5s ease 0.85s both',
          marginBottom: 36, position: 'relative', zIndex: 2,
        }}>
          {winner}
        </div>

        {/* Boutons pixel art */}
        <div style={{
          display: 'flex', gap: 24,
          animation: 'go-btn 0.5s ease 1.1s both',
          position: 'relative', zIndex: 2,
        }}>
          <button
            className="font-arcade"
            onClick={onReplay}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={{
              padding: '14px 38px',
              fontSize: 'clamp(12px, 1.6vw, 20px)',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 0,
              background: '#4AD95A',
              color: '#000',
              letterSpacing: 2,
              textTransform: 'uppercase',
              boxShadow: '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)',
              transition: 'transform 0.1s',
            }}
          >
            {t('Replay')}
          </button>
          <button
            className="font-arcade"
            onClick={onBack}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            style={{
              padding: '14px 38px',
              fontSize: 'clamp(12px, 1.6vw, 20px)',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 0,
              background: '#2563EB',
              color: '#fff',
              letterSpacing: 2,
              textTransform: 'uppercase',
              boxShadow: '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)',
              transition: 'transform 0.1s',
            }}
          >
            {t('Back')}
          </button>
        </div>
      </div>
    </>
  )
}
