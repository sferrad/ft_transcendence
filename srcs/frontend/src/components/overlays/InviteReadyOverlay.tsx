import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPendingInvite, clearPendingInvite } from '../../utils/pendingInvite'
import { pollPendingInviteResult } from '../../features/game/api/matchmaking'
import { markInviteResolved } from '../../utils/resolvedInvites'
import { emitForfeit } from '../../utils/gameSocket'

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

export function InviteReadyOverlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location.pathname)
  locationRef.current = location.pathname
  const [ready, setReady] = useState<{ info: ReturnType<typeof getPendingInvite> } | null>(null)
  const [declined, setDeclined] = useState(false)
  const pollRef = useRef<number>(0)

  useEffect(() => {
    const tick = async () => {
      if (locationRef.current === '/online-gameplay') return
      const invite = getPendingInvite()
      if (!invite) return
      try {
        const result = await pollPendingInviteResult()
        if (result.status === 'matched' && result.match_id) {
          clearPendingInvite()
          setReady({ info: { ...invite, ...result } })
        } else if (result.status === 'declined') {
          markInviteResolved(invite.match_id)
          clearPendingInvite()
          setDeclined(true)
          setTimeout(() => setDeclined(false), 5000)
        }
      } catch { /* network blip */ }
    }
    pollRef.current = window.setInterval(tick, 1500)
    return () => clearInterval(pollRef.current)
  }, [])

  if (declined) return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 8900, background: '#7f1d1d', border: '2px solid rgba(239,68,68,0.6)', borderRadius: 12, padding: '16px 32px', textAlign: 'center' }}>
      <div className="font-arcade text-red-300 text-sm" style={{ letterSpacing: 1 }}>{t('invite.declined')}</div>
    </div>
  )

  if (!ready?.info) return null

  const handleJoin = () => {
    const info = ready.info!
    markInviteResolved(info.match_id)
    setReady(null)
    navigate('/online-gameplay', { state: { ...info, myNation: info.myNation, themeId: info.themeId, backRoute: '/chat' } })
  }

  const handleDecline = () => {
    const info = ready.info!
    markInviteResolved(info.match_id)
    clearPendingInvite()
    setReady(null)
    if (!info.match_id || !info.game_room_id) return
    emitForfeit(info.game_room_id, info.role ?? 'player1')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8900, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0a0f1a', border: '2px solid rgba(34,197,94,0.6)', borderRadius: 16, padding: '40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 400, textAlign: 'center' }}>
        <div className="font-arcade text-green-400 text-2xl" style={{ letterSpacing: 2 }}>{t('invite.ready_title')}</div>
        <div className="font-arcade text-white text-base">{t('invite.ready_body')}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="font-arcade" onClick={handleJoin}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
            {t('Join')}
          </button>
          <button className="font-arcade" onClick={handleDecline}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#6b7280', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
            {t('Decline')}
          </button>
        </div>
      </div>
    </div>
  )
}
