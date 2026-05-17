import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { type GameState, createInitialState, updateGame } from '../engine'
import { GOAL_FLASH_DURATION_MS, FIXED_STEP_MS, MAX_CATCHUP_MS } from '../engine/constants'
import type { Keys } from './inputHandler'

// Partial game state payload used for checkpoint / restore.
export type GameStateCheckpoint = Partial<GameState> & { timeLeftMs?: number | null }

// Universal input snapshot sent/received over the network.
interface NetInput {
  left: boolean
  right: boolean
  up: boolean
  shoot: boolean
  dashLeft: boolean
  dashRight: boolean
}

const DOUBLE_TAP_MS = 260

function buildKeys(p1: NetInput, p2: NetInput): Keys {
  return {
    a: p1.left, d: p1.right, w: p1.up, g: p1.shoot,
    p1DashLeft: p1.dashLeft, p1DashRight: p1.dashRight,
    ArrowLeft: p2.left, ArrowRight: p2.right, ArrowUp: p2.up, m: p2.shoot,
    p2DashLeft: p2.dashLeft, p2DashRight: p2.dashRight,
  }
}

// Online mode is player1-authoritative:
//  • player1 runs the simulation and broadcasts the full state every tick.
//  • player2 sends its inputs over the wire and renders the state it
//    receives — it does NOT simulate locally. This avoids the divergence
//    that lockstep input-forwarding suffers from when packets arrive a few
//    frames late.
export function useOnlineGameLoop(
  role: 'player1' | 'player2',
  socket: Socket | null,
  player1Name: string,
  player2Name: string,
  paused: boolean = false,
  duration: number | null = null,
  winningScore: number | null = 3,
  seed: number = 1,
) {
  const isAuthoritative = role === 'player1'

  const [gameState, setGameState] = useState<GameState>(() => createInitialState(winningScore, seed))
  const [goalFlash, setGoalFlash] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(duration)

  const stateRef         = useRef<GameState>(gameState)
  const animFrameRef     = useRef<number>(0)
  const goalFlashRef     = useRef<boolean>(false)
  const pausedRef        = useRef<boolean>(paused)
  const gameStartedRef   = useRef<boolean>(false)
  const accumulatorRef   = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const timeLeftMsRef    = useRef<number | null>(duration !== null ? duration * 1000 : null)
  const displaySecsRef   = useRef<number | null>(duration)
  const prevScoreRef     = useRef<{ p1: number; p2: number }>({ p1: 0, p2: 0 })

  // Local held state (updated by keydown/keyup)
  const localHeld    = useRef<Pick<NetInput, 'left' | 'right' | 'up'>>({ left: false, right: false, up: false })
  // Local pulses pending consumption at next tick (authoritative side only)
  const localPulses  = useRef<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>>({ shoot: false, dashLeft: false, dashRight: false })
  // Remote player's last received held state (authoritative side only)
  const remoteHeld   = useRef<Pick<NetInput, 'left' | 'right' | 'up'>>({ left: false, right: false, up: false })
  // Remote pulses pending consumption at next tick (authoritative side only)
  const remotePulses = useRef<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>>({ shoot: false, dashLeft: false, dashRight: false })

  const socketRef = useRef<Socket | null>(socket)
  useEffect(() => { socketRef.current = socket }, [socket])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const showGoalFlash = useCallback((scorer: string) => {
    goalFlashRef.current = true
    setGoalFlash(scorer)
    setTimeout(() => {
      goalFlashRef.current = false
      setGoalFlash(null)
    }, GOAL_FLASH_DURATION_MS)
  }, [])

  // Apply a state snapshot received over the wire. Detects score changes to
  // trigger goal flashes on the non-authoritative side (and on rejoin).
  const applyStateSnapshot = useCallback((snap: GameStateCheckpoint) => {
    const s = stateRef.current
    const merged: GameState = {
      ...s,
      ...(snap.ball     !== undefined ? { ball: { ...s.ball, ...snap.ball } } : {}),
      ...(snap.player1  !== undefined ? { player1: { ...s.player1, ...snap.player1 } } : {}),
      ...(snap.player2  !== undefined ? { player2: { ...s.player2, ...snap.player2 } } : {}),
      ...(snap.goal1    !== undefined ? { goal1: { ...s.goal1, ...snap.goal1 } } : {}),
      ...(snap.goal2    !== undefined ? { goal2: { ...s.goal2, ...snap.goal2 } } : {}),
      ...(snap.happening !== undefined ? { happening: snap.happening } : {}),
      ...(typeof snap.framesUntilNextHappening === 'number' ? { framesUntilNextHappening: snap.framesUntilNextHappening } : {}),
      ...(typeof snap.slowBallFrames === 'number' ? { slowBallFrames: snap.slowBallFrames } : {}),
      ...(snap.status   !== undefined ? { status: snap.status } : {}),
      ...(snap.winner   !== undefined ? { winner: snap.winner } : {}),
    }

    const prev = prevScoreRef.current
    if (merged.player1.score > prev.p1) showGoalFlash(player1Name)
    else if (merged.player2.score > prev.p2) showGoalFlash(player2Name)
    prevScoreRef.current = { p1: merged.player1.score, p2: merged.player2.score }

    stateRef.current = merged
    setGameState(merged)

    if (typeof snap.timeLeftMs === 'number') {
      timeLeftMsRef.current = snap.timeLeftMs
      const secs = Math.ceil(snap.timeLeftMs / 1000)
      if (secs !== displaySecsRef.current) {
        displaySecsRef.current = secs
        setTimeLeft(secs)
      }
    }
  }, [player1Name, player2Name, showGoalFlash])

  // Exposed to OnlineMode so it can restore the last server-side state on
  // rejoin (game.rejoined → last_state).
  const restoreState = useCallback((checkpoint: GameStateCheckpoint) => {
    applyStateSnapshot(checkpoint)
  }, [applyStateSnapshot])

  // ──────────────────────────────────────────────────────────────────────
  //  INPUT CAPTURE: both sides capture local keystrokes and forward them.
  //  player1 also uses its own input locally; player2's input only matters
  //  once it reaches player1.
  // ──────────────────────────────────────────────────────────────────────
  const sendInput = useCallback((extra?: Partial<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>>) => {
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('game.action', {
      type: 'input',
      keys: {
        left: localHeld.current.left,
        right: localHeld.current.right,
        up: localHeld.current.up,
        shoot: extra?.shoot ?? false,
        dashLeft: extra?.dashLeft ?? false,
        dashRight: extra?.dashRight ?? false,
      },
    })
  }, [])

  useEffect(() => {
    const lastTapAt = { left: 0, right: 0 }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      let changed = false
      const pulseExtra: Partial<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>> = {}
      const now = performance.now()

      if (k === 'a' || k === 'arrowleft') { localHeld.current.left = true; changed = true }
      if (k === 'd' || k === 'arrowright') { localHeld.current.right = true; changed = true }
      if (k === 'w' || k === 'arrowup') { localHeld.current.up = true; changed = true }

      if (e.repeat) { if (changed) sendInput(); return }

      if (k === 'a' || k === 'arrowleft') {
        if (now - lastTapAt.left <= DOUBLE_TAP_MS) {
          localPulses.current.dashLeft = true
          pulseExtra.dashLeft = true
        }
        lastTapAt.left = now
      }
      if (k === 'd' || k === 'arrowright') {
        if (now - lastTapAt.right <= DOUBLE_TAP_MS) {
          localPulses.current.dashRight = true
          pulseExtra.dashRight = true
        }
        lastTapAt.right = now
      }
      if (k === 'g' || k === 'm') {
        localPulses.current.shoot = true
        pulseExtra.shoot = true
      }

      sendInput(pulseExtra)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'a' || k === 'arrowleft') { localHeld.current.left = false; sendInput() }
      if (k === 'd' || k === 'arrowright') { localHeld.current.right = false; sendInput() }
      if (k === 'w' || k === 'arrowup') { localHeld.current.up = false; sendInput() }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [sendInput])

  // Authoritative side listens for remote input (player2's keystrokes).
  useEffect(() => {
    if (!socket || !isAuthoritative) return
    const handler = (payload: unknown) => {
      const data = payload as { action?: { type?: string; keys?: Partial<NetInput> } }
      if (data?.action?.type !== 'input') return
      const k = data.action.keys ?? {}
      remoteHeld.current.left = Boolean(k.left)
      remoteHeld.current.right = Boolean(k.right)
      remoteHeld.current.up = Boolean(k.up)
      if (k.shoot) remotePulses.current.shoot = true
      if (k.dashLeft) remotePulses.current.dashLeft = true
      if (k.dashRight) remotePulses.current.dashRight = true
    }
    socket.on('game.action', handler)
    return () => { socket.off('game.action', handler) }
  }, [socket, isAuthoritative])

  // Non-authoritative side listens for state broadcasts from player1.
  useEffect(() => {
    if (!socket || isAuthoritative) return
    const handler = (payload: unknown) => {
      const data = payload as { state?: GameStateCheckpoint }
      if (!data?.state) return
      applyStateSnapshot(data.state)
    }
    socket.on('game.update', handler)
    return () => { socket.off('game.update', handler) }
  }, [socket, isAuthoritative, applyStateSnapshot])

  // ──────────────────────────────────────────────────────────────────────
  //  SIMULATION (authoritative side only)
  // ──────────────────────────────────────────────────────────────────────
  const consumeAndBuildKeys = useCallback((): Keys => {
    const localSnap: NetInput = {
      ...localHeld.current,
      shoot: localPulses.current.shoot,
      dashLeft: localPulses.current.dashLeft,
      dashRight: localPulses.current.dashRight,
    }
    localPulses.current.shoot = false
    localPulses.current.dashLeft = false
    localPulses.current.dashRight = false

    const remoteSnap: NetInput = {
      ...remoteHeld.current,
      shoot: remotePulses.current.shoot,
      dashLeft: remotePulses.current.dashLeft,
      dashRight: remotePulses.current.dashRight,
    }
    remotePulses.current.shoot = false
    remotePulses.current.dashLeft = false
    remotePulses.current.dashRight = false

    return buildKeys(localSnap, remoteSnap)
  }, [])

  const broadcastState = useCallback(() => {
    const s = socketRef.current
    if (!s?.connected) return
    const st = stateRef.current
    s.emit('game.update', {
      ball: st.ball,
      player1: st.player1,
      player2: st.player2,
      goal1: st.goal1,
      goal2: st.goal2,
      happening: st.happening,
      framesUntilNextHappening: st.framesUntilNextHappening,
      slowBallFrames: st.slowBallFrames,
      status: st.status,
      winner: st.winner,
      timeLeftMs: timeLeftMsRef.current,
    })
  }, [])

  const startLoop = useCallback(() => {
    let prevScore1 = stateRef.current.player1.score
    let prevScore2 = stateRef.current.player2.score
    prevScoreRef.current = { p1: prevScore1, p2: prevScore2 }

    const loop = () => {
      // Non-authoritative side: no local simulation. We just keep an RAF
      // ticking so React batches re-renders smoothly when state arrives.
      if (!isAuthoritative) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      if (pausedRef.current || goalFlashRef.current) {
        if (pausedRef.current) {
          // Drain pulses while paused so they don't fire on resume.
          localPulses.current = { shoot: false, dashLeft: false, dashRight: false }
          remotePulses.current = { shoot: false, dashLeft: false, dashRight: false }
        }
        lastFrameTimeRef.current = performance.now()
        accumulatorRef.current = 0
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      if (!gameStartedRef.current) {
        gameStartedRef.current = true
        lastFrameTimeRef.current = performance.now()
      }

      const now = performance.now()
      const elapsed = Math.min(now - lastFrameTimeRef.current, MAX_CATCHUP_MS)
      lastFrameTimeRef.current = now
      accumulatorRef.current += elapsed

      let didUpdate = false

      while (accumulatorRef.current >= FIXED_STEP_MS) {
        const keys = consumeAndBuildKeys()
        const newState = updateGame(stateRef.current, keys, false)
        accumulatorRef.current -= FIXED_STEP_MS
        stateRef.current = newState
        didUpdate = true

        if (timeLeftMsRef.current !== null) {
          timeLeftMsRef.current = Math.max(0, timeLeftMsRef.current - FIXED_STEP_MS)
          const newSecs = Math.ceil(timeLeftMsRef.current / 1000)
          if (newSecs !== displaySecsRef.current) {
            displaySecsRef.current = newSecs
            setTimeLeft(newSecs)
          }
        }

        if (timeLeftMsRef.current === 0 && newState.status === 'playing') {
          newState.status = 'finished'
          if      (newState.player1.score > newState.player2.score) newState.winner = 'player1'
          else if (newState.player2.score > newState.player1.score) newState.winner = 'player2'
          else newState.winner = null
          stateRef.current = newState
          break
        }

        if (newState.player1.score > prevScore1) {
          prevScore1 = newState.player1.score
          prevScoreRef.current = { p1: prevScore1, p2: prevScore2 }
          showGoalFlash(player1Name)
          break
        } else if (newState.player2.score > prevScore2) {
          prevScore2 = newState.player2.score
          prevScoreRef.current = { p1: prevScore1, p2: prevScore2 }
          showGoalFlash(player2Name)
          break
        }

        if (newState.status !== 'playing') break
      }

      if (didUpdate) {
        setGameState({ ...stateRef.current })
        broadcastState()
      }

      if (stateRef.current.status === 'playing') {
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [isAuthoritative, player1Name, player2Name, showGoalFlash, consumeAndBuildKeys, broadcastState])

  useEffect(() => {
    startLoop()
    return () => { cancelAnimationFrame(animFrameRef.current) }
  }, [startLoop])

  return { gameState, goalFlash, timeLeft, restoreState }
}
