import { faceSrc, flagSrc } from '../../characters'
import { VERSUS_SCREEN_DURATION_MS } from '../engine/constants'

interface VersusScreenProps {
  player1Name: string
  player2Name: string
  player1Nation: string
  player2Nation: string
}

const DUR = `${VERSUS_SCREEN_DURATION_MS / 1000}s`

// 0–8 %   : rideau se ferme (glisse depuis l'extérieur)
// 8–82 %  : tenu — contenu VS visible
// 82–100% : rideau s'ouvre (repart vers l'extérieur, révèle le jeu)
const KEYFRAMES = `
@keyframes vs-curtain-l {
  0%   { transform: translateX(-100%); }
  8%   { transform: translateX(0); }
  82%  { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
@keyframes vs-curtain-r {
  0%   { transform: translateX(100%); }
  8%   { transform: translateX(0); }
  82%  { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes vs-badge {
  0%, 8%  { transform: scale(0) rotate(-25deg); opacity: 0; }
  22%     { transform: scale(1.32) rotate(6deg);  opacity: 1; }
  30%     { transform: scale(0.9)  rotate(-2deg); }
  36%     { transform: scale(1)    rotate(0deg);  }
  82%     { transform: scale(1)    rotate(0deg);  opacity: 1; }
  96%     { transform: scale(0)    rotate(20deg); opacity: 0; }
  100%    { opacity: 0; }
}
@keyframes vs-p1 {
  0%, 8%  { opacity: 0; transform: translateX(-28px); }
  22%     { opacity: 1; transform: translateX(0); }
  82%     { opacity: 1; transform: translateX(0); }
  100%    { opacity: 0; }
}
@keyframes vs-p2 {
  0%, 8%  { opacity: 0; transform: translateX(28px); }
  22%     { opacity: 1; transform: translateX(0); }
  82%     { opacity: 1; transform: translateX(0); }
  100%    { opacity: 0; }
}
@keyframes vs-line-l {
  from { transform: translateX(-110%) skewX(-18deg); opacity: 0.5; }
  to   { transform: translateX(110%)  skewX(-18deg); opacity: 0;   }
}
@keyframes vs-line-r {
  from { transform: translateX(110%)  skewX(18deg);  opacity: 0.5; }
  to   { transform: translateX(-110%) skewX(18deg);  opacity: 0;   }
}
@keyframes vs-glow {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50%      { opacity: 0.8;  transform: scale(1.1); }
}
`

const LINES = Array.from({ length: 9 }, (_, i) => ({
  top:   `${8 + i * 10}%`,
  h:     `${2 + (i % 3) * 3}px`,
  w:     `${35 + (i % 5) * 8}%`,
  dur:   `${0.45 + (i % 4) * 0.12}s`,
  delay: `${(i * 0.11) % 0.7}s`,
}))


export function VersusScreen({ player1Name, player2Name, player1Nation, player2Nation }: VersusScreenProps) {
  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Container transparent — le jeu est visible derrière quand le rideau s'ouvre */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        overflow: 'hidden', pointerEvents: 'none',
      }}>

        {/* Rideau gauche (bleu) */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '55%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)',
          clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)',
          animation: `vs-curtain-l ${DUR} ease-in-out both`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {LINES.map((l, i) => (
            <div key={i} style={{
              position: 'absolute', top: l.top, left: 0,
              height: l.h, width: l.w,
              background: 'rgba(255,255,255,0.2)', borderRadius: 2,
              animation: `vs-line-l ${l.dur} linear ${l.delay} infinite`,
            }} />
          ))}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            animation: `vs-p1 ${DUR} ease both`,
            position: 'relative', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', width: 220, height: 220, borderRadius: '50%',
              background: 'rgba(59,130,246,0.7)', filter: 'blur(40px)',
              animation: 'vs-glow 2s ease infinite',
              top: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 0,
            }} />
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #60a5fa, #1d4ed8, #1e3a8a)',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.15), 0 0 50px rgba(59,130,246,0.7), inset 0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
            }}>
              <img src={faceSrc(player1Nation)} alt={player1Nation} style={{ width: '76%', height: 'auto' }} />
            </div>
            <img src={flagSrc(player1Nation)} alt={player1Nation}
              style={{ width: 60, height: 'auto', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))', zIndex: 1 }} />
            <div style={{
              fontSize: 'clamp(18px, 2.5vw, 34px)', fontWeight: 900, color: '#fff',
              letterSpacing: 3, textShadow: '0 0 20px rgba(59,130,246,0.7), 0 3px 10px rgba(0,0,0,0.8)',
              textTransform: 'uppercase', zIndex: 1,
            }}>{player1Name}</div>
          </div>
        </div>

        {/* Rideau droit (rouge) */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '55%',
          background: 'linear-gradient(225deg, #0f172a 0%, #7f1d1d 60%, #dc2626 100%)',
          clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)',
          animation: `vs-curtain-r ${DUR} ease-in-out both`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {LINES.map((l, i) => (
            <div key={i} style={{
              position: 'absolute', top: l.top, right: 0,
              height: l.h, width: l.w,
              background: 'rgba(255,255,255,0.2)', borderRadius: 2,
              animation: `vs-line-r ${l.dur} linear ${l.delay} infinite`,
            }} />
          ))}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            animation: `vs-p2 ${DUR} ease both`,
            position: 'relative', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', width: 220, height: 220, borderRadius: '50%',
              background: 'rgba(239,68,68,0.7)', filter: 'blur(40px)',
              animation: 'vs-glow 2s ease infinite',
              top: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 0,
            }} />
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #f87171, #dc2626, #7f1d1d)',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.15), 0 0 50px rgba(239,68,68,0.7), inset 0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
              transform: 'scaleX(-1)',
            }}>
              <img src={faceSrc(player2Nation)} alt={player2Nation} style={{ width: '76%', height: 'auto' }} />
            </div>
            <img src={flagSrc(player2Nation)} alt={player2Nation}
              style={{ width: 60, height: 'auto', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))', zIndex: 1 }} />
            <div style={{
              fontSize: 'clamp(18px, 2.5vw, 34px)', fontWeight: 900, color: '#fff',
              letterSpacing: 3, textShadow: '0 0 20px rgba(239,68,68,0.7), 0 3px 10px rgba(0,0,0,0.8)',
              textTransform: 'uppercase', zIndex: 1,
            }}>{player2Name}</div>
          </div>
        </div>

        {/* VS — par-dessus les deux rideaux */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3,
        }}>
          <div style={{
            fontSize: 'clamp(72px, 12vw, 140px)', fontWeight: 900,
            color: '#facc15', letterSpacing: 6,
            textShadow: '0 0 40px #facc15, 0 0 80px #f97316, 6px 6px 0 #000, -6px -6px 0 #000',
            animation: `vs-badge ${DUR} cubic-bezier(0.34,1.56,0.64,1) both`,
          }}>
            VS
          </div>
        </div>

      </div>
    </>
  )
}
