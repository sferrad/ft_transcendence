import { useMemo } from 'react'
import { flagSrc } from '../../characters'
import { GOAL_FLASH_DURATION_MS } from '../engine/constants'

interface GoalFlashProps {
  scorerName: string
  scorerNation: string
}

const DURATION = `${GOAL_FLASH_DURATION_MS / 1000}s`

const KEYFRAMES = `
@keyframes gf-bg {
  0%   { background: rgba(0,0,0,0); }
  5%   { background: rgba(250,204,21,0.25); }
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
@keyframes gf-flag {
  0%   { opacity: 0; transform: translateY(-28px) scale(0.6); }
  15%  { opacity: 1; transform: translateY(4px)   scale(1.05); }
  22%  { transform: translateY(0) scale(1); }
  70%  { transform: translateY(0) scale(1); opacity: 1; }
  100% { opacity: 0; transform: translateY(-28px) scale(0.6); }
}
@keyframes gf-sub {
  0%   { opacity: 0; transform: translateY(22px); }
  28%  { opacity: 1; transform: translateY(0); }
  70%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(22px); }
}
@keyframes gf-particle {
  0%   { transform: translate(0,0)              scale(1.2); opacity: 1; }
  25%  { transform: translate(var(--tx),var(--ty)) scale(0.2); opacity: 0; }
  70%  { transform: translate(var(--tx),var(--ty)) scale(0.2); opacity: 0; }
  95%  { transform: translate(0,0)              scale(1.2); opacity: 0.9; }
  100% { transform: translate(0,0)              scale(0);   opacity: 0; }
}
@keyframes gf-ring {
  0%   { transform: scale(0.3); opacity: 0.8; }
  35%  { transform: scale(2.4); opacity: 0; }
  100% { opacity: 0; }
}
`

const anim = (name: string, delay = '0s', easing = 'ease') =>
  `${name} ${DURATION} ${easing} ${delay} 1 both`

export function GoalFlash({ scorerName, scorerNation }: GoalFlashProps) {
  const particles = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360
      const dist = 90 + Math.random() * 80
      return {
        tx: Math.cos(angle * Math.PI / 180) * dist,
        ty: Math.sin(angle * Math.PI / 180) * dist,
        color: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#f97316' : '#fff',
        size: 8 + Math.random() * 8,
        delay: `${i * 0.03}s`,
      }
    }), [])

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: anim('gf-bg'),
        zIndex: 10, overflow: 'hidden',
      }}>

        {/* Anneaux d'explosion */}
        {[0, 0.12, 0.24].map((d, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 160, height: 160, borderRadius: '50%',
            border: `3px solid ${i === 0 ? '#facc15' : i === 1 ? '#f97316' : '#fff'}`,
            animation: anim('gf-ring', `${d}s`),
          }} />
        ))}

        {/* Particules qui explosent puis reviennent */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.color,
            top: '50%', left: '50%',
            marginTop: -p.size / 2, marginLeft: -p.size / 2,
            '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
            animation: anim('gf-particle', p.delay),
          } as React.CSSProperties} />
        ))}

        {/* Drapeau */}
        <img
          src={flagSrc(scorerNation)}
          alt={scorerNation}
          style={{
            width: 72, height: 'auto', marginBottom: 12,
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.6))',
            animation: anim('gf-flag', '0s', 'cubic-bezier(0.34,1.56,0.64,1)'),
          }}
        />

        {/* BUUUUT! */}
        <div style={{
          fontSize: 'clamp(64px, 12vw, 100px)',
          fontWeight: 900,
          color: '#facc15',
          letterSpacing: 6,
          lineHeight: 1,
          textShadow: '0 0 30px #facc15, 0 0 60px #f97316, 0 0 100px #ef4444',
          animation: anim('gf-text', '0s', 'cubic-bezier(0.34,1.56,0.64,1)'),
        }}>
          BUUUUT !
        </div>

        {/* Nom du scoreur */}
        <div style={{
          marginTop: 18,
          fontSize: 'clamp(20px, 4vw, 30px)',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: 3,
          textShadow: '0 2px 20px rgba(0,0,0,0.9)',
          animation: anim('gf-sub', '0s', 'ease'),
        }}>
          ⚽ {scorerName} marque !
        </div>

      </div>
    </>
  )
}
