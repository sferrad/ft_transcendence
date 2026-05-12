import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { type GameState, createInitialState, updateGame } from '../engine'
import { GOAL_FLASH_DURATION_MS, FIXED_STEP_MS, MAX_CATCHUP_MS } from '../engine/constants'
import type { Keys } from './inputHandler'

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

// Build the engine's Keys object from p1 and p2 universal inputs.
function buildKeys(p1: NetInput, p2: NetInput): Keys {
  return {
    a: p1.left, d: p1.right, w: p1.up, g: p1.shoot,
    p1DashLeft: p1.dashLeft, p1DashRight: p1.dashRight,
    ArrowLeft: p2.left, ArrowRight: p2.right, ArrowUp: p2.up, m: p2.shoot,
    p2DashLeft: p2.dashLeft, p2DashRight: p2.dashRight,
  }
}

export function useOnlineGameLoop(
  role: 'player1' | 'player2',
  socket: Socket | null,
  player1Name: string,
  player2Name: string,
  paused: boolean = false,
  duration: number | null = null,
  winningScore: number | null = 3,
  seed: number = Date.now(),
) {
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

  // Local held state (updated by keydown/keyup)
  const localHeld = useRef<Pick<NetInput, 'left' | 'right' | 'up'>>({ left: false, right: false, up: false })
  // Local pulses pending consumption at next tick
  const localPulses = useRef<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>>({ shoot: false, dashLeft: false, dashRight: false })
  // Remote player's last received held state
  const remoteHeld = useRef<Pick<NetInput, 'left' | 'right' | 'up'>>({ left: false, right: false, up: false })
  // Remote pulses pending consumption at next tick
  const remotePulses = useRef<Pick<NetInput, 'shoot' | 'dashLeft' | 'dashRight'>>({ shoot: false, dashLeft: false, dashRight: false })

  const socketRef = useRef<Socket | null>(socket)
  useEffect(() => { socketRef.current = socket }, [socket])
  useEffect(() => { pausedRef.current = paused }, [paused])

  // Send local input snapshot to opponent.
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

  // Keyboard handler: capture local input and relay to opponent.
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

  // Receive opponent's input from WebSocket.
  useEffect(() => {
    if (!socket) return
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
  }, [socket])

  const showGoalFlash = useCallback((scorer: string) => {
    goalFlashRef.current = true
    setGoalFlash(scorer)
    setTimeout(() => {
      goalFlashRef.current = false
      setGoalFlash(null)
    }, GOAL_FLASH_DURATION_MS)
  }, [])

  // Consume pending pulses and build Keys for one tick.
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

    const p1Input = role === 'player1' ? localSnap : remoteSnap
    const p2Input = role === 'player1' ? remoteSnap : localSnap
    return buildKeys(p1Input, p2Input)
  }, [role])

  const startLoop = useCallback(() => {
    let prevScore1 = stateRef.current.player1.score
    let prevScore2 = stateRef.current.player2.score

    const loop = () => {
      if (pausedRef.current || goalFlashRef.current) {
        if (pausedRef.current) {
          // Drain local pulses while paused so they don't fire on resume
          localPulses.current = { shoot: false, dashLeft: false, dashRight: false }
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
        const newState = updateGame(stateRef.current, keys, false) // isSolo=false: no AI
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
          showGoalFlash(player1Name)
          break
        } else if (newState.player2.score > prevScore2) {
          prevScore2 = newState.player2.score
          showGoalFlash(player2Name)
          break
        }

        if (newState.status !== 'playing') break
      }

      if (didUpdate) setGameState({ ...stateRef.current })

      if (stateRef.current.status === 'playing') {
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [player1Name, player2Name, showGoalFlash, consumeAndBuildKeys])

  useEffect(() => {
    startLoop()
    return () => { cancelAnimationFrame(animFrameRef.current) }
  }, [startLoop])

  return { gameState, goalFlash, timeLeft }
}
