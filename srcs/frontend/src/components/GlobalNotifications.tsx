import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Socket } from 'socket.io-client'
import { getSocket } from '../hooks/socketSingleton'
import { addToast, removeToast } from '../utils/toastBus'
import { fetchIncomingFriendRequests, resolveRequesterNames } from '../Profile/api/friends'
import { cancelInvite } from '../Gameplay/api/matchmaking'
import { markInviteResolved } from '../utils/resolvedInvites'

const MAX_MSG_PREVIEW = 60

const INVITE_PREFIX = '__GAME_INVITE__|'

export default function GlobalNotifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const socketRef = useRef<Socket | null>(null)
  // Listeners qu'on a posés sur le socket partagé — à retirer au cleanup.
  const handlersRef = useRef<Array<[string, (...a: unknown[]) => void]>>([])
  const seenFriendReqIds = useRef<Set<number>>(new Set())
  const initialLoadDone = useRef(false)
  const pollRef = useRef<number>(0)

  // Branche les notifications sur le SOCKET PARTAGÉ (singleton). On ne crée
  // plus de connexion ici : on s'abonne juste aux events, et on retient nos
  // handlers pour pouvoir les détacher proprement sans tuer le socket.
  const connectSocket = useCallback((_token: string, myId: number) => {
    if (socketRef.current) return  // déjà branché

    const sock = getSocket()
    if (!sock) return
    socketRef.current = sock

    const bind = (event: string, fn: (...a: unknown[]) => void) => {
      sock.on(event, fn)
      handlersRef.current.push([event, fn])
    }

    bind('chat.group_invite', (payload: unknown) => {
      const data = payload as { room_id?: number; room_name?: string; invited_by_username?: string }
      if (!data?.room_id) return
      const fromName = data.invited_by_username || t('Someone', 'Someone')
      const roomName = data.room_name || ''
      addToast({
        type: 'friend_request',
        text: t('toast.group_invite', { name: fromName }),
        subtext: roomName || undefined,
        action: () => navigate(`/chat?roomId=${data.room_id}`),
        actionLabel: t('View', 'VIEW'),
        duration: 10000,
      })
    })

    bind('chat.message', (payload: unknown) => {
      const data = payload as { sender_user_id?: number; content?: string; username?: string; room_id?: number }
      if (!data?.content || data.sender_user_id === myId) return
      if (data.content.startsWith(INVITE_PREFIX)) return
      const senderName = data.username || t('Someone', 'Someone')
      const preview = data.content.length > MAX_MSG_PREVIEW ? data.content.slice(0, MAX_MSG_PREVIEW) + '…' : data.content
      const roomQuery = data.room_id ? `?roomId=${data.room_id}` : ''
      addToast({
        type: 'message',
        text: t('toast.channel_message', { name: senderName }),
        subtext: preview,
        action: () => navigate(`/chat${roomQuery}`),
        duration: 5000,
      })
    })

    bind('dm.message', (payload: unknown) => {
      const data = payload as { sender_user_id?: number; content?: string; username?: string; room_id?: number }
      if (!data?.content || data.sender_user_id === myId) return

      const roomQuery = data.room_id
        ? `?roomId=${data.room_id}`
        : data.sender_user_id
          ? `?dmUserId=${data.sender_user_id}`
          : ''
      const senderName = data.username || t('Someone', 'Someone')
      const content = data.content
      if (content.startsWith(INVITE_PREFIX)) {
        const parts = content.slice(INVITE_PREFIX.length).split('|')
        const matchId = parseInt(parts[0], 10)
        const fromName = parts[2] || senderName
        let toastId: number
        const handleView = () => {
          removeToast(toastId)
          const roomQuery = data.room_id
            ? `?roomId=${data.room_id}`
            : data.sender_user_id
              ? `?dmUserId=${data.sender_user_id}`
              : ''
          navigate(`/chat${roomQuery}`)
        }
        const handleDecline = async () => {
          removeToast(toastId)
          markInviteResolved(matchId)
          try { await cancelInvite(matchId) } catch { /* best-effort */ }
        }
        toastId = addToast({
          type: 'invite',
          text: t('toast.invite', { name: fromName }),
          subtext: t('toast.invite_sub'),
          action: handleView,
          actionLabel: t('View', 'VIEW'),
          secondAction: handleDecline,
          secondActionLabel: t('Decline', 'DECLINE'),
          duration: 15000,
        })
        return
      }
      const preview = content.length > MAX_MSG_PREVIEW ? content.slice(0, MAX_MSG_PREVIEW) + '…' : content
      addToast({
        type: 'message',
        text: t('toast.message', { name: senderName }),
        subtext: preview,
        action: () => navigate(`/chat${roomQuery}`),
        duration: 5000,
      })
    })
  }, [navigate, t])

  // Détache nos listeners du socket partagé sans fermer la connexion.
  const disconnectSocket = useCallback(() => {
    const sock = socketRef.current
    if (sock) {
      for (const [event, fn] of handlersRef.current) sock.off(event, fn)
    }
    handlersRef.current = []
    socketRef.current = null
  }, [])

  const startPoll = useCallback((token: string) => {
    if (pollRef.current) return  // already polling

    const poll = async () => {
      const currentToken = localStorage.getItem('access_token')
      if (!currentToken) { clearInterval(pollRef.current); pollRef.current = 0; return }
      try {
        const requests = await fetchIncomingFriendRequests(currentToken)
        if (!initialLoadDone.current) {
          requests.forEach(r => seenFriendReqIds.current.add(r.id))
          initialLoadDone.current = true
          return
        }
        const newReqs = requests.filter(r => !seenFriendReqIds.current.has(r.id))
        if (!newReqs.length) return
        const names = await resolveRequesterNames(currentToken, newReqs)
        for (const req of newReqs) {
          seenFriendReqIds.current.add(req.id)
          const name = names[req.from_user_id] || t('Someone', 'Someone')
          addToast({
            type: 'friend_request',
            text: t('toast.friend_request', { name }),
            action: () => navigate('/profile'),
            actionLabel: t('View', 'VIEW'),
            duration: 8000,
          })
        }
      } catch { /* network */ }
    }

    poll()
    pollRef.current = window.setInterval(poll, 2000)
  }, [navigate, t])

  useEffect(() => {
    const tryConnect = () => {
      const token = localStorage.getItem('access_token')
      const myId = parseInt(localStorage.getItem('user_id') || '0', 10)
      if (!token || !myId) return
      connectSocket(token, myId)
      startPoll(token)
    }

    tryConnect()

    // Re-connect when user logs in from another tab or after login navigation
    window.addEventListener('storage', tryConnect)
    // Also fire when same-tab login sets localStorage (storage event doesn't fire for same tab)
    window.addEventListener('focus', tryConnect)
    window.addEventListener('auth:login', tryConnect)

    return () => {
      window.removeEventListener('storage', tryConnect)
      window.removeEventListener('focus', tryConnect)
      window.removeEventListener('auth:login', tryConnect)
      // On détache nos listeners mais on NE FERME PAS le socket partagé.
      disconnectSocket()
      clearInterval(pollRef.current)
      pollRef.current = 0
      initialLoadDone.current = false
      seenFriendReqIds.current = new Set()
    }
  }, [connectSocket, startPoll, disconnectSocket])

  return null
}
