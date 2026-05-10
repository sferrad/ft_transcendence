import { useEffect, useRef, useState, useCallback } from 'react'
import { type GameState, createInitialState, updateGame } from '../engine'
import { createInputHandler } from './inputHandler'

const GOAL_FLASH_DURATION_MS = 2000

// Hook principal de la game loop. En solo, player2 est l'IA.
export function useGameLoop(player1Name: string, player2Name: string, isSolo: boolean = false) {
  const [gameState, setGameState] = useState<GameState>(createInitialState)
  const [goalFlash, setGoalFlash] = useState<string | null>(null)

  const stateRef = useRef<GameState>(gameState)
  const animFrameRef = useRef<number>(0)
  const goalFlashRef = useRef<boolean>(false)
  const inputHandler = useRef(createInputHandler())

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
      // Pendant le flash de but, on ne fait pas avancer la simulation.
      if (goalFlashRef.current) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
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
    goalFlashRef.current = false
    setGoalFlash(null)
    const fresh = createInitialState()
    stateRef.current = fresh
    setGameState(fresh)
    startLoop()
  }, [startLoop])

  return { gameState, goalFlash, restart }
}
