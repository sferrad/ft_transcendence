export type ToastType = 'message' | 'invite' | 'friend_request' | 'info'

export interface Toast {
  id: number
  type: ToastType
  text: string
  subtext?: string
  action?: () => void
  actionLabel?: string
  secondAction?: () => void
  secondActionLabel?: string
  duration?: number
}

type ToastCallback = (toast: Toast) => void
type RemoveCallback = (id: number) => void

let _nextId = 1
const _listeners: Set<ToastCallback> = new Set()
const _removeListeners: Set<RemoveCallback> = new Set()

export function addToast(opts: Omit<Toast, 'id'>): number {
  const toast: Toast = { id: _nextId++, duration: 5000, ...opts }
  _listeners.forEach(cb => cb(toast))
  return toast.id
}

export function removeToast(id: number): void {
  _removeListeners.forEach(cb => cb(id))
}

export function onToast(cb: ToastCallback): () => void {
  _listeners.add(cb)
  return () => _listeners.delete(cb)
}

export function onRemoveToast(cb: RemoveCallback): () => void {
  _removeListeners.add(cb)
  return () => _removeListeners.delete(cb)
}
