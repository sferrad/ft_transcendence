import { useEffect, useRef, useState, useCallback } from 'react'
import { type GameState } from './types'
import { createInitialState, updateGame, resetBall } from './gameEngine'
import { createInputHandler } from './inputHandler'

// isSolo = true → player2 est l'IA, false → local 2 joueurs
export function useGameLoop(player1Name: string, player2Name: string, isSolo: boolean = false) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState())
  const [goalFlash, setGoalFlash] = useState<string | null>(null)

  const stateRef      = useRef<GameState>(gameState)
  const animFrameRef  = useRef<number>(0)
  const goalFlashRef  = useRef<boolean>(false)
  const inputHandler  = useRef(createInputHandler())

  const showGoalFlash = useCallback((scorer: string) => {
    goalFlashRef.current = true
    setGoalFlash(scorer)
    setTimeout(() => {
      goalFlashRef.current = false
      setGoalFlash(null)
    }, 2000)
  }, [])

  const startLoop = useCallback(() => {
    const input = inputHandler.current
    input.attach()

    let prevScore1 = stateRef.current.player1.score
    let prevScore2 = stateRef.current.player2.score

    const loop = () => {
      if (goalFlashRef.current) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      // ← ICI : transférer les pulses G/M dans keys avant updateGame
      input.consumePulses()

      const newState = updateGame(stateRef.current, input.keys, isSolo)

      if (newState.player1.score > prevScore1) {
        prevScore1 = newState.player1.score
        showGoalFlash(player1Name)
      } else if (newState.player2.score > prevScore2) {
        prevScore2 = newState.player2.score
        showGoalFlash(player2Name)
      }

      stateRef.current = newState
      setGameState({ ...newState })

      if (newState.status === 'playing') {
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      input.detach()
    }
  }, [isSolo, player1Name, player2Name, showGoalFlash])

  useEffect(() => {
    return startLoop()
  }, [startLoop])

  const restart = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    goalFlashRef.current = false
    setGoalFlash(null)
    const fresh = createInitialState()
    stateRef.current = fresh
    setGameState(fresh)
    startLoop()
  }, [startLoop])

  return { gameState, goalFlash, restart }
}