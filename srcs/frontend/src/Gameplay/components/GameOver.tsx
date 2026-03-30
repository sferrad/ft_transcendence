interface GameOverProps {
  winner: string
  onReplay: () => void
  onBack: () => void
}

export function GameOver({ winner, onReplay, onBack }: GameOverProps) {
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
      <div style={{ fontSize: 32, fontWeight: 'bold' }}>{winner} gagne !</div>
      <div style={{ fontSize: 16, opacity: 0.7 }}>Première à 5 buts</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={onReplay} style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer', borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>
          Rejouer
        </button>
        <button onClick={onBack} style={{ padding: '10px 24px', fontSize: 16, cursor: 'pointer', borderRadius: 8, border: 'none', backgroundColor: '#f97316', color: 'white' }}>
          Retour
        </button>
      </div>
    </div>
  )
}