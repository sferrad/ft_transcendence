interface GoalFlashProps {
  scorerName: string
}

// Bandeau plein écran affiché ~2s à chaque but.
export function GoalFlash({ scorerName }: GoalFlashProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
      zIndex: 10,
    }}>
      <div style={{
        fontSize: 72,
        fontWeight: 900,
        color: '#facc15',
        letterSpacing: 4,
        textShadow: '0 0 30px #facc15, 0 0 60px #f97316',
      }}>
        BUUUUT !
      </div>
      <div style={{ fontSize: 28, color: '#fff', marginTop: 12, fontWeight: 600 }}>
        {scorerName} marque !
      </div>
    </div>
  )
}
