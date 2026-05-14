import { faceSrc, flagSrc } from '../../characters'
import { VERSUS_SCREEN_DURATION_MS } from '../engine/constants'
import { useTranslation } from 'react-i18next'

interface VersusScreenProps {
  player1Name: string
  player2Name: string
  player1Nation: string
  player2Nation: string
  themeId?: string
  themeNameKey?: string
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
@keyframes vs-map {
  0%, 30% { opacity: 0; transform: translateY(14px) scale(0.85); }
  45%     { opacity: 1; transform: translateY(0) scale(1.05); }
  55%     { transform: scale(1); }
  82%     { opacity: 1; }
  96%     { opacity: 0; transform: translateY(-10px); }
  100%    { opacity: 0; }
}
`

const LINES = Array.from({ length: 9 }, (_, i) => ({
  top:   `${8 + i * 10}%`,
  h:     `${2 + (i % 3) * 3}px`,
  w:     `${35 + (i % 5) * 8}%`,
  dur:   `${0.45 + (i % 4) * 0.12}s`,
  delay: `${(i * 0.11) % 0.7}s`,
}))


export function VersusScreen({ player1Name, player2Name, player1Nation, player2Nation, themeId, themeNameKey }: VersusScreenProps) {
  const { t } = useTranslation()
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
          clipPath: 'polygon(0 0, 97% 0, 85% 100%, 0 100%)',
          WebkitClipPath: 'polygon(0 0, 97% 0, 85% 100%, 0 100%)',
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
              width: 168, height: 168,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
              WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
              filter: 'drop-shadow(0 0 25px rgba(59,130,246,0.7))',
            }}>
              <div style={{
                width: 158, height: 158,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
                WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
                background: 'radial-gradient(circle at 30% 30%, #60a5fa, #1d4ed8, #1e3a8a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={faceSrc(player1Nation)} alt={player1Nation} style={{ width: '76%', height: 'auto' }} />
              </div>
            </div>
            <img src={flagSrc(player1Nation)} alt={player1Nation}
              style={{ width: 60, height: 'auto', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))', zIndex: 1 }} />
            <div className="font-arcade" style={{
              fontSize: 'clamp(18px, 2.5vw, 34px)', color: '#fff',
              letterSpacing: 3, textShadow: '0 0 20px rgba(59,130,246,0.7), 0 3px 10px rgba(0,0,0,0.8)',
              textTransform: 'uppercase', zIndex: 1,
            }}>{player1Name}</div>
          </div>
        </div>

        {/* Rideau droit (rouge) */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '55%',
          background: 'linear-gradient(225deg, #0f172a 0%, #7f1d1d 60%, #dc2626 100%)',
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 3% 100%)',
          WebkitClipPath: 'polygon(15% 0, 100% 0, 100% 100%, 3% 100%)',
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
              width: 168, height: 168,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
              WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
              filter: 'drop-shadow(0 0 25px rgba(239,68,68,0.7))',
              transform: 'scaleX(-1)',
            }}>
              <div style={{
                width: 158, height: 158,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
                WebkitClipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
                background: 'radial-gradient(circle at 30% 30%, #f87171, #dc2626, #7f1d1d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={faceSrc(player2Nation)} alt={player2Nation} style={{ width: '76%', height: 'auto' }} />
              </div>
            </div>
            <img src={flagSrc(player2Nation)} alt={player2Nation}
              style={{ width: 60, height: 'auto', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.6))', zIndex: 1 }} />
            <div className="font-arcade" style={{
              fontSize: 'clamp(18px, 2.5vw, 34px)', color: '#fff',
              letterSpacing: 3, textShadow: '0 0 20px rgba(239,68,68,0.7), 0 3px 10px rgba(0,0,0,0.8)',
              textTransform: 'uppercase', zIndex: 1,
            }}>{player2Name}</div>
          </div>
        </div>

        {/* VS + badge terrain — par-dessus les deux rideaux */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, zIndex: 3,
        }}>
          <img
            src="/assets/perso/VS.png"
            alt="VS"
            style={{
              width: 'clamp(120px, 18vw, 220px)', height: 'auto',
              filter: 'drop-shadow(0 0 30px #facc15aa) drop-shadow(0 0 60px #f97316aa)',
              animation: `vs-badge ${DUR} cubic-bezier(0.34,1.56,0.64,1) both`,
              imageRendering: 'pixelated',
            }}
          />
          {themeNameKey && (
            <div
              className="font-arcade"
              style={{
                animation: `vs-map ${DUR} ease both`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{
                fontSize: 'clamp(9px, 1.1vw, 13px)', color: '#facc15',
                letterSpacing: 4, textTransform: 'uppercase', opacity: 0.8,
              }}>
                {t('vs.map_label', 'MAP')}
              </span>
              <span style={{
                fontSize: 'clamp(14px, 2vw, 24px)', color: '#fff',
                letterSpacing: 3, textTransform: 'uppercase',
                textShadow: themeId === 'neon'
                  ? '0 0 12px #00ffe0, 0 0 28px #00ffe066'
                  : '0 0 12px #facc15aa, 0 3px 8px rgba(0,0,0,0.8)',
                padding: '4px 16px',
                background: themeId === 'neon' ? 'rgba(0,255,224,0.08)' : 'rgba(250,204,21,0.08)',
                border: `1px solid ${themeId === 'neon' ? '#00ffe044' : '#facc1544'}`,
                borderRadius: 2,
              }}>
                {t(themeNameKey)}
              </span>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
