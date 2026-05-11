import { useEffect, useRef, useState, useCallback } from 'react'
import { type GameState, createInitialState, updateGame } from '../engine'
import { GOAL_FLASH_DURATION_MS } from '../engine/constants'
import { createInputHandler } from './inputHandler'

export function useGameLoop(
  player1Name: string,
  player2Name: string,
  isSolo: boolean = false,
  paused: boolean = false,
  duration: number | null = null,
  winningScore: number | null = 3,
) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(winningScore))
  const [goalFlash, setGoalFlash] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(duration)

  const stateRef        = useRef<GameState>(gameState)
  const animFrameRef    = useRef<number>(0)
  const goalFlashRef    = useRef<boolean>(false)
  const pausedRef       = useRef<boolean>(paused)
  const gameStartedRef  = useRef<boolean>(false)
  const inputHandler    = useRef(createInputHandler())

  const timeLeftMsRef    = useRef<number | null>(duration !== null ? duration * 1000 : null)
  const displaySecsRef   = useRef<number | null>(duration)
  const lastFrameTimeRef = useRef<number>(0)

  useEffect(() => { pausedRef.current = paused }, [paused])

  const showGoalFlash = useCallback((scorer: string) => {
    goalFlashRef.current = true
    setGoalFlash(scorer)
    setTimeout(() => {
      goalFlashRef.current = false
      setGoalFlash(null)
    }, GOAL_FLASH_DURATION_MS)
  }, [])

  const startLoop = useCallback(() => {
    const input = inputHandler.current
    input.attach()

    let prevScore1 = stateRef.current.player1.score
    let prevScore2 = stateRef.current.player2.score

    const loop = () => {
      if (pausedRef.current || goalFlashRef.current) {
        if (pausedRef.current) input.consumePulses()
        lastFrameTimeRef.current = performance.now()
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      if (!gameStartedRef.current) {
        gameStartedRef.current = true
        lastFrameTimeRef.current = performance.now()
      }

      const now = performance.now()
      const dt  = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      if (timeLeftMsRef.current !== null) {
        timeLeftMsRef.current = Math.max(0, timeLeftMsRef.current - dt)
        const newSecs = Math.ceil(timeLeftMsRef.current / 1000)
        if (newSecs !== displaySecsRef.current) {
          displaySecsRef.current = newSecs
          setTimeLeft(newSecs)
        }
      }

      input.consumePulses()
      const newState = updateGame(stateRef.current, input.keys, isSolo)

      if (newState.player1.score > prevScore1) {
        prevScore1 = newState.player1.score
        showGoalFlash(player1Name)
      } else if (newState.player2.score > prevScore2) {
        prevScore2 = newState.player2.score
        showGoalFlash(player2Name)
      }

      const timeOut = timeLeftMsRef.current === 0 && newState.status === 'playing'
      const scoredWin = newState.status === 'finished' && stateRef.current.status !== 'finished'

      if (timeOut) {
        const st = newState
        st.status = 'finished'
        if      (st.player1.score > st.player2.score) st.winner = 'player1'
        else if (st.player2.score > st.player1.score) st.winner = 'player2'
        else st.winner = null
        stateRef.current = st
        setGameState({ ...st })
        return
      }

      if (scoredWin) { /* fin sur score max */ }

      stateRef.current = newState
      setGameState({ ...newState })

      if (newState.status === 'playing') {
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [isSolo, player1Name, player2Name, showGoalFlash])

  useEffect(() => {
    startLoop()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      inputHandler.current.detach()
    }
  }, [startLoop])

  const restart = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    inputHandler.current.detach()
    goalFlashRef.current   = false
    gameStartedRef.current = false
    setGoalFlash(null)

    timeLeftMsRef.current  = duration !== null ? duration * 1000 : null
    displaySecsRef.current = duration
    lastFrameTimeRef.current = 0
    setTimeLeft(duration)

    const fresh = createInitialState(winningScore)
    stateRef.current = fresh
    setGameState(fresh)
    startLoop()
  }, [duration, winningScore, startLoop])

  return { gameState, goalFlash, restart, timeLeft }
}
