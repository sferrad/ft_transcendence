import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSocket } from '../../hooks/socketSingleton'
import { emitForfeit } from '../../utils/gameSocket'

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

interface ServerActiveMatch { game_room_id: string; role: string; time_remaining: number }

async function ackForfeitNotification(): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) return
  try {
    await fetch('/api/ws/forfeit-notification', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  } catch { /* best-effort */ }
}

export function RejoinOverlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverMatch, setServerMatch] = useState<ServerActiveMatch | null>(null)
  const [secsLeft, setSecsLeft] = useState(0)
  const [forfeitNotif, setForfeitNotif] = useState(false)
  const forfeitingRef = useRef(false)

  const onGamePage = location.pathname === '/online-gameplay'
  const onLoginPage = location.pathname === '/login'
  const hidden = onGamePage || onLoginPage

  useEffect(() => {
    if (onLoginPage) return
    const sock = getSocket()
    if (!sock) return

    const onActiveMatch = (data: { active: boolean; game_room_id?: string; role?: string; time_remaining?: number }) => {
      if (hidden) { setServerMatch(null); return }
      if (data.active && data.game_room_id && data.role) {
        setServerMatch({ game_room_id: data.game_room_id, role: data.role, time_remaining: data.time_remaining ?? 0 })
      } else {
        setServerMatch(null)
      }
    }

    const onForfeitNotif = (data: { forfeited: boolean }) => {
      if (data.forfeited) setForfeitNotif(true)
    }

    sock.on('ws.active_match', onActiveMatch)
    sock.on('ws.forfeit_notification', onForfeitNotif)
    return () => {
      sock.off('ws.active_match', onActiveMatch)
      sock.off('ws.forfeit_notification', onForfeitNotif)
    }
  }, [onLoginPage, hidden])

  useEffect(() => {
    if (!serverMatch) { setSecsLeft(0); return }
    setSecsLeft(Math.ceil(serverMatch.time_remaining))
    const id = window.setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [serverMatch])

  if (hidden) return null

  if (forfeitNotif) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0a0f1a', border: '2px solid rgba(239,68,68,0.6)', borderRadius: 16, padding: '40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 400, textAlign: 'center' }}>
        <div className="font-arcade text-red-400 text-2xl" style={{ letterSpacing: 2 }}>{t('forfeit.loss_title')}</div>
        <div className="font-arcade text-white text-base">{t('forfeit.loss_desc', { name: '' })}</div>
        <button className="font-arcade" onClick={() => { ackForfeitNotification(); setForfeitNotif(false) }}
          style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4b5563', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
          {t('OK')}
        </button>
      </div>
    </div>
  )

  if (!serverMatch) return null

  const handleResume = () => {
    setServerMatch(null)
    navigate('/online-gameplay', { state: { game_room_id: serverMatch.game_room_id, role: serverMatch.role, isRejoin: true } })
  }

  const handleForfeit = () => {
    if (forfeitingRef.current) return
    forfeitingRef.current = true
    emitForfeit(serverMatch.game_room_id, serverMatch.role)
    setServerMatch(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0a0f1a', border: '2px solid rgba(234,179,8,0.6)', borderRadius: 16, padding: '40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 400, textAlign: 'center' }}>
        <div className="font-arcade text-yellow-300 text-2xl" style={{ letterSpacing: 2 }}>{t('rejoin.title')}</div>
        <div className="font-arcade text-white text-base">{t('rejoin.desc')}</div>
        <div className="font-arcade text-gray-400 text-sm">{secsLeft}s {t('remaining')}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="font-arcade" onClick={handleResume}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
            {t('rejoin.button')}
          </button>
          <button className="font-arcade" onClick={handleForfeit}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#dc2626', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
            {t('rejoin.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
