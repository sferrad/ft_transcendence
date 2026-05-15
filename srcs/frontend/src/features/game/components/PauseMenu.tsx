import { useTranslation } from 'react-i18next'

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

interface PauseMenuProps {
  isPaused: boolean
  onOpen: () => void
  onClose: () => void
  onRestart: () => void
  onLeave: () => void
  backLabel: string
}

export function PauseMenu({ isPaused, onOpen, onClose, onRestart, onLeave, backLabel: _backLabel }: PauseMenuProps) {
  const { t } = useTranslation()

  return (
    <>
      <button
        onClick={isPaused ? onClose : onOpen}
        title={isPaused ? t('Resume') : t('Pause')}
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 45,
          width: 42,
          height: 42,
          background: 'rgba(10, 15, 30, 0.85)',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 6,
          cursor: 'pointer',
          color: '#fff',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          letterSpacing: 0,
        }}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      {isPaused && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 48, backdropFilter: 'blur(3px)' }} />
          <div
            className="font-arcade"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 49,
              background: 'rgba(10, 15, 30, 0.97)',
              border: '2px solid rgba(255,255,255,0.18)',
              borderRadius: 8,
              padding: '40px 56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              minWidth: 280,
            }}
          >
            <div style={{ color: '#fff', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }}>
              ⏸ {t('Pause')}
            </div>

            <button
              onClick={onClose}
              style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', boxShadow: ARCADE_BTN }}
            >
              ▶ {t('Resume')}
            </button>

            <button
              onClick={onRestart}
              style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#2563eb', color: '#fff', boxShadow: ARCADE_BTN }}
            >
              ↺ {t('Replay')}
            </button>

            <button
              onClick={onLeave}
              style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4b5563', color: '#fff', boxShadow: ARCADE_BTN }}
            >
              ← {t('Leave')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
