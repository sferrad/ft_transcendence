import { type CSSProperties } from 'react'

interface ScoreProps {
  leftScore: number
  rightScore: number
  leftName: string
  rightName: string
  timeLeft?: number | null
  winningScore?: number | null
  style?: CSSProperties
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const P1 = '#3b82f6'
const P2 = '#ef4444'

function Pips({ filled, total, color, align }: { filled: number; total: number; color: string; align: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: 20, height: 20,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
          background: i < filled ? color : 'rgba(255,255,255,0.12)',
          filter: i < filled ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color}66)` : 'none',
        }} />
      ))}
    </div>
  )
}

export function Score({ leftScore, rightScore, leftName, rightName, timeLeft, winningScore, style }: ScoreProps) {
  const p1Leads = leftScore > rightScore
  const p2Leads = rightScore > leftScore
  const urgent  = timeLeft !== null && timeLeft !== undefined && timeLeft <= 10

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px',
      position: 'relative',
      ...style,
    }}>

      {/* Filets colorés en haut du bandeau */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: '50%', height: 3,
        background: `linear-gradient(90deg, ${P1}, transparent)`,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: '50%', right: 0, height: 3,
        background: `linear-gradient(270deg, ${P2}, transparent)`,
      }} />

      {/* ── Joueur 1 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
        <div
          className="font-arcade"
          style={{
            color: P1, fontSize: 50, letterSpacing: 2, textTransform: 'uppercase',
            textShadow: `0 0 14px ${P1}99`,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 420,
          }}
        >
          {leftName}
        </div>
        {winningScore != null && <Pips filled={leftScore} total={winningScore} color={P1} align="left" />}
      </div>

      {/* ── Score central ── */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        {/* Score P1 */}
        <div
          className="font-arcade"
          style={{
            fontSize: 62, lineHeight: 1, minWidth: 64, textAlign: 'right',
            color: p1Leads ? P1 : 'rgba(255,255,255,0.75)',
            textShadow: p1Leads
              ? `0 0 18px ${P1}, 0 0 40px ${P1}88`
              : '0 2px 8px rgba(0,0,0,0.6)',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {leftScore}
        </div>

        {/* Séparateur */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
        </div>

        {/* Score P2 */}
        <div
          className="font-arcade"
          style={{
            fontSize: 62, lineHeight: 1, minWidth: 64, textAlign: 'left',
            color: p2Leads ? P2 : 'rgba(255,255,255,0.75)',
            textShadow: p2Leads
              ? `0 0 18px ${P2}, 0 0 40px ${P2}88`
              : '0 2px 8px rgba(0,0,0,0.6)',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {rightScore}
        </div>
      </div>

      {/* ── Timer ── */}
      {timeLeft != null && (
        <div
          className="font-arcade"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 10,
            fontSize: 28,
            letterSpacing: 2,
            color: urgent ? '#ef4444' : 'rgba(255,255,255,0.7)',
            textShadow: urgent
              ? '0 0 12px #ef4444, 0 0 24px #ef444488'
              : '0 2px 6px rgba(0,0,0,0.5)',
            transition: 'color 0.2s, text-shadow 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(timeLeft)}
        </div>
      )}

      {/* ── Joueur 2 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', minWidth: 0, flex: 1 }}>
        <div
          className="font-arcade"
          style={{
            color: P2, fontSize: 50, letterSpacing: 2, textTransform: 'uppercase',
            textShadow: `0 0 14px ${P2}99`,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 420,
          }}
        >
          {rightName}
        </div>
        {winningScore != null && <Pips filled={rightScore} total={winningScore} color={P2} align="right" />}
      </div>
    </div>
  )
}
