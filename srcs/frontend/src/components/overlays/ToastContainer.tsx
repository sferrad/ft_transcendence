import { useCallback, useEffect, useState } from 'react'
import { onToast, onRemoveToast, type Toast } from '../../utils/toastBus'

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
      style={{ background: bg, borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260, maxWidth: 340, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: toast.action ? 'pointer' : 'default', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideIn 0.2s ease' }}
      onClick={() => { toast.action?.(); onRemove() }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span className="font-arcade" style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>{toast.text}</span>
        <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
      </div>
      {toast.subtext && <span style={{ color: '#d1d5db', fontSize: 11, paddingLeft: 26 }}>{toast.subtext}</span>}
      {(toast.action && toast.actionLabel) || (toast.secondAction && toast.secondActionLabel) ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 26 }}>
          {toast.action && toast.actionLabel && (
            <button className="font-arcade" onClick={e => { e.stopPropagation(); toast.action!(); onRemove() }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 12px', fontSize: 10, cursor: 'pointer', borderRadius: 4, letterSpacing: 1 }}>
              {toast.actionLabel}
            </button>
          )}
          {toast.secondAction && toast.secondActionLabel && (
            <button className="font-arcade" onClick={e => { e.stopPropagation(); toast.secondAction!() }}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#d1d5db', padding: '4px 12px', fontSize: 10, cursor: 'pointer', borderRadius: 4, letterSpacing: 1 }}>
              {toast.secondActionLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubAdd = onToast(toast => setToasts(prev => [...prev.slice(-4), toast]))
    const unsubRemove = onRemoveToast(id => setToasts(prev => prev.filter(t => t.id !== id)))
    return () => { unsubAdd(); unsubRemove() }
  }, [])

  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  if (!toasts.length) return null

  return (
    <>
      <style>{`@keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />)}
      </div>
    </>
  )
}
