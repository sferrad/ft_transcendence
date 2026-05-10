import { useTranslation } from 'react-i18next'

interface GameOverProps {
  winner: string
  onReplay: () => void
  onBack: () => void
}

export function GameOver({ winner, onReplay, onBack }: GameOverProps) {
  const { t } = useTranslation()

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{ fontSize: 32, fontWeight: 'bold' }}>{winner} {t('wins')}!</div>
      <div style={{ fontSize: 16, opacity: 0.7 }}>{t('First to 5 goals')}</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={onReplay} style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer', borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>
          {t('Replay')}
        </button>
        <button onClick={onBack} style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer', borderRadius: 8, border: 'none', backgroundColor: '#f97316', color: 'white' }}>
          {t('Back')}
        </button>
      </div>
    </div>
  )
}