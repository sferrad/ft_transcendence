import { useState, useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { clearPendingMatch } from '../../../../utils/pendingMatch'
import { fetchMyStats } from '../../api/matches'
import type { ForfeitState } from './types'
import { FORFEIT_TIMEOUT_S } from './constants'

interface UseOnlineSessionParams {
  socket: Socket | null
  connected: boolean
  game_room_id: string | undefined
  role: 'player1' | 'player2'
  opponent_name: string
  isRejoin: boolean
  restoreState: (state: Parameters<typeof restoreState>[0]) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RestoreStateFn = (state: Record<string, unknown>) => void

interface UseOnlineSessionParams {
  socket: Socket | null
  connected: boolean
  game_room_id: string | undefined
  role: 'player1' | 'player2'
  opponent_name: string
  isRejoin: boolean
  restoreState: RestoreStateFn
}

export function useOnlineSession({
  socket,
  connected,
  game_room_id,
  role,
  opponent_name,
  isRejoin,
  restoreState,
}: UseOnlineSessionParams) {
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [showVersus, setShowVersus] = useState(!isRejoin)
  const [gameInProgress, setGameInProgress] = useState(isRejoin)
  const [disconnectSecs, setDisconnectSecs] = useState<number | null>(null)
  const [forfeit, setForfeit] = useState<ForfeitState | null>(null)
  const [afterStats, setAfterStats] = useState<Awaited<ReturnType<typeof fetchMyStats>>>(null)
  const [showAbandon, setShowAbandon] = useState(false)

  const matchSavedRef = useRef(false)
  const hasAbandonedRef = useRef(false)
  const hadDisconnectCountdownRef = useRef(false)
  const gameInProgressRef = useRef(isRejoin)
  const disconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasJoinedRef = useRef(false)

  useEffect(() => { gameInProgressRef.current = gameInProgress }, [gameInProgress])

  useEffect(() => { clearPendingMatch() }, [])

  // Join / rejoin on (re)connect
  useEffect(() => {
    if (!connected || !socket || !game_room_id) return
    if (isRejoin || hasJoinedRef.current) {
      socket.emit('game.rejoin', { game_room_id, role })
    } else {
      hasJoinedRef.current = true
      socket.emit('game.join', { game_room_id, role })
    }
  }, [connected, socket, game_room_id, role, isRejoin])

  // Notify backend on unmount if game wasn't finished
  useEffect(() => {
    return () => {
      if (matchSavedRef.current) return
      if (hasAbandonedRef.current) return
      if (!socket || !game_room_id) return
      socket.emit('game.leave', { game_room_id })
    }
  }, [socket, game_room_id])

  const handleForfeit = useCallback((data: { forfeit_user_id: number; winner_role: string | null; score_player1?: number; score_player2?: number }) => {
    if (matchSavedRef.current) return
    matchSavedRef.current = true
    setGameInProgress(false)
    clearPendingMatch()
    const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
    const isWin = data.forfeit_user_id !== myUserId
    const voluntary = hasAbandonedRef.current || (!isWin ? true : !hadDisconnectCountdownRef.current)
    const winnerRole = data.winner_role as 'player1' | 'player2' | null
    const score1 = data.score_player1 ?? (winnerRole === 'player1' ? 3 : 0)
    const score2 = data.score_player2 ?? (winnerRole === 'player2' ? 3 : 0)
    setForfeit({ isWin, opponentName: opponent_name, voluntary, winnerRole, score1, score2 })
    fetchMyStats().then(s => { if (s) setAfterStats(s) }).catch(() => {})
  }, [opponent_name])

  const handleAbandon = useCallback((navigate: (path: string) => void) => {
    if (!socket || !game_room_id) { navigate('/lobby'); return }
    hasAbandonedRef.current = true
    clearPendingMatch()
    setShowAbandon(false)
    socket.emit('game.action', { type: 'forfeit' })
  }, [socket, game_room_id])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onUserJoined = () => {
      setOpponentConnected(true)
      if (disconnectIntervalRef.current) {
        clearInterval(disconnectIntervalRef.current)
        disconnectIntervalRef.current = null
      }
      setDisconnectSecs(null)
    }

    const onUserLeft = () => setOpponentConnected(false)

    const onOpponentDisconnected = (data: { timeout_seconds?: number }) => {
      setOpponentConnected(false)
      hadDisconnectCountdownRef.current = true
      const secs = data?.timeout_seconds ?? FORFEIT_TIMEOUT_S
      setDisconnectSecs(secs)
      if (disconnectIntervalRef.current) clearInterval(disconnectIntervalRef.current)
      disconnectIntervalRef.current = setInterval(() => {
        setDisconnectSecs(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(disconnectIntervalRef.current!)
            disconnectIntervalRef.current = null
            return null
          }
          return prev - 1
        })
      }, 1000)
    }

    const onOpponentReconnected = () => {
      setOpponentConnected(true)
      hadDisconnectCountdownRef.current = false
      setDisconnectSecs(null)
      if (disconnectIntervalRef.current) {
        clearInterval(disconnectIntervalRef.current)
        disconnectIntervalRef.current = null
      }
    }

    const onJoined = (data: { room_members?: number[] }) => {
      const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
      const others = (data.room_members ?? []).filter(id => id !== myUserId)
      if (others.length > 0) setOpponentConnected(true)
    }

    const onRejoined = (data: { last_state?: Record<string, unknown>; room_members?: number[] }) => {
      clearPendingMatch()
      if (data.last_state) restoreState(data.last_state)
      const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
      const others = (data.room_members ?? []).filter(id => id !== myUserId)
      setOpponentConnected(others.length > 0)
      setGameInProgress(true)
    }

    const onForfeit = (data: { forfeit_user_id: number; winner_role: string | null }) => handleForfeit(data)
    const onDisconnect = () => setOpponentConnected(false)

    socket.on('game.joined', onJoined)
    socket.on('game.user_joined', onUserJoined)
    socket.on('game.user_left', onUserLeft)
    socket.on('game.opponent_disconnected', onOpponentDisconnected)
    socket.on('game.opponent_reconnected', onOpponentReconnected)
    socket.on('game.rejoined', onRejoined)
    socket.on('game.forfeit', onForfeit)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('game.joined', onJoined)
      socket.off('game.user_joined', onUserJoined)
      socket.off('game.user_left', onUserLeft)
      socket.off('game.opponent_disconnected', onOpponentDisconnected)
      socket.off('game.opponent_reconnected', onOpponentReconnected)
      socket.off('game.rejoined', onRejoined)
      socket.off('game.forfeit', onForfeit)
      socket.off('disconnect', onDisconnect)
      if (disconnectIntervalRef.current) clearInterval(disconnectIntervalRef.current)
    }
  }, [socket, restoreState, handleForfeit])

  return {
    opponentConnected,
    showVersus,
    setShowVersus,
    gameInProgress,
    setGameInProgress,
    disconnectSecs,
    forfeit,
    afterStats,
    setAfterStats,
    showAbandon,
    setShowAbandon,
    matchSavedRef,
    handleAbandon,
    handleForfeit,
  }
}
