import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSocket } from '../hooks/socketSingleton'
import { clearPendingMatch } from '../utils/pendingMatch'
import { getPendingInvite, clearPendingInvite } from '../utils/pendingInvite'
import { pollPendingInviteResult } from '../features/game/api/matchmaking'
import { onToast, onRemoveToast, type Toast } from '../utils/toastBus'
import { markInviteResolved } from '../utils/resolvedInvites'

/**
 * Émet un forfait via le SOCKET PARTAGÉ : on rejoint la room puis on envoie
 * l'action `forfeit`. Pas de socket éphémère — un seul socket par user, sinon
 * le backend voit deux connexions et le tracking de match devient ambigu.
 */
function emitForfeit(gameRoomId: string, role: string): void {
  const sock = getSocket()
  if (!sock) return
  const fire = () => {
    sock.emit('game.join', { game_room_id: gameRoomId, role })
    setTimeout(() => sock.emit('game.action', { type: 'forfeit' }), 300)
  }
  if (sock.connected) fire()
  else sock.once('connect', fire)
}

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

// ── Rejoin Overlay ────────────────────────────────────────────────────────────

interface ServerActiveMatch { game_room_id: string; role: string; time_remaining: number }

async function ackForfeitNotification(): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) return
  try {
    await fetch('/api/ws/forfeit-notification', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  } catch { /* best-effort */ }
}

function RejoinOverlay() {
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

  // Écoute les events WebSocket au lieu de poller en HTTP.
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

  // Countdown: reset when server gives us a fresh time_remaining
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
        <div className="font-arcade text-red-400 text-2xl" style={{ letterSpacing: 2 }}>{t('forfeit.loss_title', 'MATCH FORFEITED')}</div>
        <div className="font-arcade text-white text-base">{t('forfeit.loss_desc', 'You did not reconnect in time. The match was forfeited.')}</div>
        <button className="font-arcade" onClick={() => { ackForfeitNotification(); setForfeitNotif(false) }}
          style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4b5563', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}>
          {t('OK', 'OK')}
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a0f1a', border: '2px solid rgba(234,179,8,0.6)',
        borderRadius: 16, padding: '40px 48px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, maxWidth: 400, textAlign: 'center',
      }}>
        <div className="font-arcade text-yellow-300 text-2xl" style={{ letterSpacing: 2 }}>
          {t('rejoin.title', 'GAME IN PROGRESS')}
        </div>
        <div className="font-arcade text-white text-base">
          {t('rejoin.desc', 'You left a match. Resume or forfeit?')}
        </div>
        <div className="font-arcade text-gray-400 text-sm">{secsLeft}s {t('remaining', 'remaining')}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            className="font-arcade"
            onClick={handleResume}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('rejoin.button', 'RESUME')}
          </button>
          <button
            className="font-arcade"
            onClick={handleForfeit}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#dc2626', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('rejoin.dismiss', 'FORFEIT')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invite Ready Overlay ──────────────────────────────────────────────────────

function InviteReadyOverlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location.pathname)
  locationRef.current = location.pathname
  const [ready, setReady] = useState<{ info: ReturnType<typeof getPendingInvite>; opponentName?: string } | null>(null)
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
      <div className="font-arcade text-red-300 text-sm" style={{ letterSpacing: 1 }}>{t('invite.declined', 'INVITE DECLINED')}</div>
    </div>
  )

  if (!ready || !ready.info) return null

  const handleJoin = () => {
    const info = ready.info!
    markInviteResolved(info.match_id)
    setReady(null)
    navigate('/online-gameplay', { state: { ...info, myNation: info.myNation, themeId: info.themeId } })
  }

  const handleDecline = () => {
    const info = ready.info!
    markInviteResolved(info.match_id)
    clearPendingInvite()
    setReady(null)
    // Forfait pour ne pas laisser l'adversaire attendre indéfiniment.
    if (!info.match_id || !info.game_room_id) return
    emitForfeit(info.game_room_id, info.role ?? 'player1')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8900,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0a0f1a', border: '2px solid rgba(34,197,94,0.6)',
        borderRadius: 16, padding: '40px 48px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, maxWidth: 400, textAlign: 'center',
      }}>
        <div className="font-arcade text-green-400 text-2xl" style={{ letterSpacing: 2 }}>
          {t('invite.ready_title', 'OPPONENT READY!')}
        </div>
        <div className="font-arcade text-white text-base">
          {t('invite.ready_body', 'Your opponent has joined. Start the match?')}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            className="font-arcade"
            onClick={handleJoin}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('Join', 'JOIN')}
          </button>
          <button
            className="font-arcade"
            onClick={handleDecline}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#6b7280', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('Decline', 'DECLINE')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast Container ───────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const id = setTimeout(onRemove, toast.duration ?? 5000)
    return () => clearTimeout(id)
  }, [toast.duration, onRemove])

  const bg =
    toast.type === 'invite' ? '#7c3aed' :
    toast.type === 'friend_request' ? '#0369a1' :
    toast.type === 'message' ? '#374151' : '#1f2937'

  const icon =
    toast.type === 'invite' ? '⚽' :
    toast.type === 'friend_request' ? '👤' :
    toast.type === 'message' ? '💬' : 'ℹ️'

  return (
    <div
      style={{
        background: bg, borderRadius: 10, padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260, maxWidth: 340,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: toast.action ? 'pointer' : 'default',
        border: '1px solid rgba(255,255,255,0.1)', animation: 'slideIn 0.2s ease',
      }}
      onClick={() => { toast.action?.(); onRemove() }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span className="font-arcade" style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>{toast.text}</span>
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, padding: 0 }}
        >×</button>
      </div>
      {toast.subtext && (
        <span style={{ color: '#d1d5db', fontSize: 11, paddingLeft: 26 }}>{toast.subtext}</span>
      )}
      {(toast.action && toast.actionLabel) || (toast.secondAction && toast.secondActionLabel) ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 26 }}>
          {toast.action && toast.actionLabel && (
            <button
              className="font-arcade"
              onClick={e => { e.stopPropagation(); toast.action!(); onRemove() }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 12px', fontSize: 10, cursor: 'pointer', borderRadius: 4, letterSpacing: 1 }}
            >
              {toast.actionLabel}
            </button>
          )}
          {toast.secondAction && toast.secondActionLabel && (
            <button
              className="font-arcade"
              onClick={e => { e.stopPropagation(); toast.secondAction!() }}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#d1d5db', padding: '4px 12px', fontSize: 10, cursor: 'pointer', borderRadius: 4, letterSpacing: 1 }}
            >
              {toast.secondActionLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubAdd = onToast(toast => setToasts(prev => [...prev.slice(-4), toast]))
    const unsubRemove = onRemoveToast(id => setToasts(prev => prev.filter(t => t.id !== id)))
    return () => { unsubAdd(); unsubRemove() }
  }, [])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  if (!toasts.length) return null

  return (
    <>
      <style>{`@keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div style={{
        position: 'fixed', top: 80, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
        ))}
      </div>
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GlobalOverlays() {
  return (
    <>
      <RejoinOverlay />
      <InviteReadyOverlay />
      <ToastContainer />
    </>
  )
}
