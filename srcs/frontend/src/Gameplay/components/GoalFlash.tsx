import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { flagSrc } from '../../characters'
import { GOAL_FLASH_DURATION_MS } from '../engine/constants'

interface GoalFlashProps {
  scorerName: string
  scorerNation: string
  scorerColor: string
}

const DURATION = `${GOAL_FLASH_DURATION_MS / 1000}s`

// Le flash de fond utilise la couleur du scoreur.
function makeKeyframes(color: string) {
  return `
@keyframes gf-bg {
  0%   { background: rgba(0,0,0,0); }
  5%   { background: ${color}55; }
  15%  { background: rgba(0,0,0,0.78); }
  70%  { background: rgba(0,0,0,0.78); }
  100% { background: rgba(0,0,0,0); }
}
@keyframes gf-text {
  0%   { transform: scale(0.1) rotate(-10deg); opacity: 0; }
  15%  { transform: scale(1.2)  rotate(3deg);  opacity: 1; }
  22%  { transform: scale(0.93) rotate(-1deg); }
  28%  { transform: scale(1)    rotate(0deg); }
  70%  { transform: scale(1)    rotate(0deg);  opacity: 1; }
  100% { transform: scale(0.1)  rotate(10deg); opacity: 0; }
}
@keyframes gf-sub {
  0%   { opacity: 0; transform: translateY(22px); }
  28%  { opacity: 1; transform: translateY(0); }
  70%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(22px); }
}
@keyframes gf-particle {
  0%   { transform: translate(0,0)               scale(1.2); opacity: 1; }
  25%  { transform: translate(var(--tx),var(--ty)) scale(0.2); opacity: 0; }
  70%  { transform: translate(var(--tx),var(--ty)) scale(0.2); opacity: 0; }
  95%  { transform: translate(0,0)               scale(1.2); opacity: 0.9; }
  100% { transform: translate(0,0)               scale(0);   opacity: 0; }
}
@keyframes gf-ring {
  0%   { transform: scale(0.3); opacity: 0.9; }
  35%  { transform: scale(2.4); opacity: 0; }
  100% { opacity: 0; }
}
`
}

const anim = (name: string, delay = '0s', easing = 'ease') =>
  `${name} ${DURATION} ${easing} ${delay} 1 both`

export function GoalFlash({ scorerName, scorerNation, scorerColor }: GoalFlashProps) {
  const { t } = useTranslation()
  const particles = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360
      const dist = 90 + Math.random() * 80
      return {
        tx: Math.cos(angle * Math.PI / 180) * dist,
        ty: Math.sin(angle * Math.PI / 180) * dist,
        color: i % 3 === 0 ? scorerColor : i % 3 === 1 ? '#ffffff' : `${scorerColor}aa`,
        size: 8 + Math.random() * 8,
        delay: `${i * 0.03}s`,
      }
    }), [scorerColor])

  return (
    <>
      <style>{makeKeyframes(scorerColor)}</style>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: anim('gf-bg'),
        zIndex: 35, overflow: 'hidden',
      }}>

        {/* Anneaux dans la couleur du scoreur */}
        {[
          { color: scorerColor, delay: 0 },
          { color: scorerColor, delay: 0.12 },
          { color: '#ffffff', delay: 0.24 },
        ].map((r, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 160, height: 160, borderRadius: '12%',
            border: `3px solid ${r.color}`,
            animation: anim('gf-ring', `${r.delay}s`),
          }} />
        ))}

        {/* Particules */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: 2,
            background: p.color,
            top: '50%', left: '50%',
            marginTop: -p.size / 2, marginLeft: -p.size / 2,
            '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
            animation: anim('gf-particle', p.delay),
          } as React.CSSProperties} />
        ))}

        {/* BUUUUT! */}
        <div className="font-arcade" style={{
          fontSize: 'clamp(64px, 12vw, 100px)',
          color: scorerColor,
          letterSpacing: 6,
          lineHeight: 1,
          textShadow: `0 0 30px ${scorerColor}, 0 0 60px ${scorerColor}88, 0 0 100px ${scorerColor}66`,
          animation: anim('gf-text', '0s', 'cubic-bezier(0.34,1.56,0.64,1)'),
        }}>
          {t('GOAAAAL !')}
        </div>

        {/* Nom du scoreur avec drapeau à la place du ballon */}
        <div className="font-arcade" style={{
          marginTop: 18,
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 'clamp(20px, 4vw, 30px)',
          color: scorerColor,
          letterSpacing: 3,
          textShadow: `0 0 20px ${scorerColor}88, 0 2px 20px rgba(0,0,0,0.9)`,
          animation: anim('gf-sub', '0s', 'ease'),
        }}>
          <img
            src={flagSrc(scorerNation)}
            alt={scorerNation}
            style={{
              width: 44, height: 'auto',
              filter: `drop-shadow(0 2px 8px ${scorerColor}88)`,
            }}
          />
          {t('scorer_text', { name: scorerName })}
        </div>

      </div>
    </>
  )
}
