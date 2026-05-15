import { useTranslation } from 'react-i18next'
import { ARCADE_BTN } from './constants'

interface AbandonModalProps {
  showAbandon: boolean
  onOpen: () => void
  onConfirm: () => void
  onCancel: () => void
  gameInProgress: boolean
  isFinished: boolean
  showVersus: boolean
  hasForfeit: boolean
}

export function AbandonModal({ showAbandon, onOpen, onConfirm, onCancel, gameInProgress, isFinished, showVersus, hasForfeit }: AbandonModalProps) {
  const { t } = useTranslation()

  if (!gameInProgress || hasForfeit || isFinished || showVersus) return null

  return (
    <>
      <button
        onClick={onOpen}
        title={t('Abandon')}
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 45,
          width: 42, height: 42,
          background: 'rgba(10, 15, 30, 0.85)',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 6,
          cursor: 'pointer',
          color: '#ef4444',
          fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        ✕
      </button>

      {showAbandon && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 55, backdropFilter: 'blur(3px)' }} />
          <div
            className="font-arcade"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 56,
              background: 'rgba(10, 15, 30, 0.97)',
              border: '2px solid rgba(239,68,68,0.4)',
              borderRadius: 8,
              padding: '40px 56px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              minWidth: 300,
            }}
          >
            <div style={{ color: '#ef4444', fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              {t('abandon.confirm_title')}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 13, letterSpacing: 1, textAlign: 'center', marginBottom: 8 }}>
              {t('abandon.confirm_desc')}
            </div>
            <button
              onClick={onConfirm}
              style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#ef4444', color: '#fff', boxShadow: ARCADE_BTN }}
            >
              {t('Abandon')}
            </button>
            <button
              onClick={onCancel}
              style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4b5563', color: '#fff', boxShadow: ARCADE_BTN }}
            >
              {t('Cancel')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
