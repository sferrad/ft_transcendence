import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { io } from 'socket.io-client'
import { getPendingMatch, clearPendingMatch } from '../utils/pendingMatch'
import { getPendingInvite, clearPendingInvite } from '../utils/pendingInvite'
import { pollPendingInviteResult } from '../Gameplay/api/matchmaking'
import { onToast, onRemoveToast, type Toast } from '../utils/toastBus'
import { markInviteResolved } from '../utils/resolvedInvites'

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

// ── Rejoin Overlay ────────────────────────────────────────────────────────────

function RejoinOverlay() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState(() => getPendingMatch())
  const forfeitingRef = useRef(false)

  useEffect(() => {
    if (location.pathname === '/online-gameplay') {
      setPending(null)
      return
    }
    setPending(getPendingMatch())
    const id = window.setInterval(() => setPending(getPendingMatch()), 2000)
    return () => clearInterval(id)
  }, [location.pathname])

  if (!pending || location.pathname === '/online-gameplay') return null

  const handleResume = () => {
    clearPendingMatch()
    setPending(null)
    navigate('/online-gameplay', { state: { ...pending.info, isRejoin: true } })
  }

  const handleForfeit = async () => {
    if (forfeitingRef.current) return
    forfeitingRef.current = true
    const info = pending.info
    clearPendingMatch()
    setPending(null)
    try {
      const token = localStorage.getItem('access_token') || ''
      const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || window.location.origin
      const baseUrl = wsUrl.replace(/\/ws\/socket\.io\/?$/, '').replace(/\/ws\/?$/, '')
        .replace(/^wss?:\/\//, s => s.startsWith('wss') ? 'https://' : 'http://')
      const sock = io(baseUrl, {
        path: '/ws/socket.io',
        auth: { token, user_id: localStorage.getItem('user_id'), username: localStorage.getItem('username') },
        transports: ['websocket'],
        reconnection: false,
      })
      sock.once('connect', () => {
        sock.emit('game.join', { game_room_id: info.game_room_id, role: info.role })
        setTimeout(() => {
          sock.emit('game.action', { type: 'forfeit' })
          setTimeout(() => sock.disconnect(), 500)
        }, 300)
      })
      sock.once('connect_error', () => sock.disconnect())
    } catch {
      // best-effort
    }
  }

  const secsLeft = Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000))

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
          {t('rejoin.body', 'You left a match. Resume or forfeit?')}
        </div>
        <div className="font-arcade text-gray-400 text-sm">{secsLeft}s {t('remaining', 'remaining')}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            className="font-arcade"
            onClick={handleResume}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#16a34a', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('Resume', 'RESUME')}
          </button>
          <button
            className="font-arcade"
            onClick={handleForfeit}
            style={{ padding: '12px 28px', fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#dc2626', color: '#fff', letterSpacing: 2, boxShadow: ARCADE_BTN }}
          >
            {t('Forfeit', 'FORFEIT')}
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
    navigate('/online-gameplay', { state: { ...info, myNation: info.myNation } })
  }

  const handleDecline = () => {
    const info = ready.info!
    markInviteResolved(info.match_id)
    clearPendingInvite()
    setReady(null)
    // Forfeit so the opponent isn't left waiting indefinitely
    if (!info.match_id || !info.game_room_id) return
    try {
      const token = localStorage.getItem('access_token') || ''
      const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || window.location.origin
      const baseUrl = wsUrl.replace(/\/ws\/socket\.io\/?$/, '').replace(/\/ws\/?$/, '')
        .replace(/^wss?:\/\//, s => s.startsWith('wss') ? 'https://' : 'http://')
      const sock = io(baseUrl, {
        path: '/ws/socket.io',
        auth: { token, user_id: localStorage.getItem('user_id'), username: localStorage.getItem('username') },
        transports: ['websocket'],
        reconnection: false,
      })
      sock.once('connect', () => {
        sock.emit('game.join', { game_room_id: info.game_room_id, role: info.role ?? 'player1' })
        setTimeout(() => {
          sock.emit('game.action', { type: 'forfeit' })
          setTimeout(() => sock.disconnect(), 500)
        }, 300)
      })
      sock.once('connect_error', () => sock.disconnect())
    } catch { /* best-effort */ }
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
      onClick={toast.action}
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
              onClick={e => { e.stopPropagation(); toast.action!() }}
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
