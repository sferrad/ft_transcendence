import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Socket } from 'socket.io-client'
import { getSocket } from '../hooks/socketSingleton'
import { addToast, removeToast } from '../utils/toastBus'
import { cancelInvite } from '../Gameplay/api/matchmaking'
import { markInviteResolved } from '../utils/resolvedInvites'
import { getBlockedIds } from '../Profile/api/friends'

const MAX_MSG_PREVIEW = 60

const INVITE_PREFIX = '__GAME_INVITE__|'

export default function GlobalNotifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const socketRef = useRef<Socket | null>(null)
  // Listeners qu'on a posés sur le socket partagé — à retirer au cleanup.
  const handlersRef = useRef<Array<[string, (...a: unknown[]) => void]>>([])
  const seenFriendReqIds = useRef<Set<number>>(new Set())
  const blockedIdsRef = useRef<Set<number>>(new Set())

  // Branche les notifications sur le SOCKET PARTAGÉ (singleton). On ne crée
  // plus de connexion ici : on s'abonne juste aux events, et on retient nos
  // handlers pour pouvoir les détacher proprement sans tuer le socket.
  const connectSocket = useCallback((token: string, myId: number) => {
    if (socketRef.current) return  // déjà branché

    const sock = getSocket()
    if (!sock) return
    socketRef.current = sock

    getBlockedIds(token).then(ids => { blockedIdsRef.current = new Set(ids) }).catch(() => {})

    const bind = (event: string, fn: (...a: unknown[]) => void) => {
      sock.on(event, fn)
      handlersRef.current.push([event, fn])
    }

    bind('ws.friend_request', (payload: unknown) => {
      const data = payload as { from_user_id?: number; from_username?: string }
      if (!data?.from_user_id) return
      if (blockedIdsRef.current.has(data.from_user_id)) return
      if (seenFriendReqIds.current.has(data.from_user_id)) return
      seenFriendReqIds.current.add(data.from_user_id)
      const name = data.from_username || t('Someone', 'Someone')
      addToast({
        type: 'friend_request',
        text: t('toast.friend_request', { name }),
        action: () => navigate('/profile'),
        actionLabel: t('View', 'VIEW'),
        duration: 8000,
      })
    })

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
      if (data.sender_user_id && blockedIdsRef.current.has(data.sender_user_id)) return
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
      if (data.sender_user_id && blockedIdsRef.current.has(data.sender_user_id)) return

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


  useEffect(() => {
    const tryConnect = () => {
      const token = localStorage.getItem('access_token')
      const myId = parseInt(localStorage.getItem('user_id') || '0', 10)
      if (!token || !myId) return
      connectSocket(token, myId)
    }

    tryConnect()

    window.addEventListener('storage', tryConnect)
    window.addEventListener('focus', tryConnect)
    window.addEventListener('auth:login', tryConnect)

    return () => {
      window.removeEventListener('storage', tryConnect)
      window.removeEventListener('focus', tryConnect)
      window.removeEventListener('auth:login', tryConnect)
      disconnectSocket()
      seenFriendReqIds.current = new Set()
    }
  }, [connectSocket, disconnectSocket])

  return null
}
