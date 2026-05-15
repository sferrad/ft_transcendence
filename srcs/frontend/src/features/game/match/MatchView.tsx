import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useCallback, useState } from 'react'

import { useGameLoop } from './useGameLoop'
import { Ball } from '../components/Ball'
import { Character } from '../components/Character'
import { GameOver } from '../components/GameOver'
import { GoalPost } from '../components/GoalPost'
import { GoalFlash } from '../components/GoalFlash'
import { Obstacle } from '../components/Obstacle'
import { Happening } from '../components/Happening'
import { Scene } from '../components/Scene'
import { type ThemeConfig, THEMES } from '../themes'
import { saveMatchResult, fetchMyStats, type UserStats } from '../api/matches'

export type GameMode = 'solo' | 'local' | 'online'

interface MatchViewProps {
  mode: GameMode
  player1Name: string
  player2Name: string
  player1Nation: string
  player2Nation: string
  backRoute: string
  paused?: boolean
  duration?: number | null
  winningScore?: number | null
  theme?: ThemeConfig
  restartTrigger?: number
  onFinish?: () => void
}

const PLAYER1_COLOR = '#3b82f6'
const PLAYER2_COLOR = '#ef4444'

export function MatchView({
  mode, player1Name, player2Name, player1Nation, player2Nation, backRoute, paused = false, duration = null, winningScore = 3, theme = THEMES[0], restartTrigger, onFinish,
}: MatchViewProps) {
  const navigate = useNavigate()
  const { gameState, goalFlash, restart, timeLeft } = useGameLoop(player1Name, player2Name, mode === 'solo', paused, duration, winningScore)
  const matchSavedRef = useRef(false)
  const [afterStats, setAfterStats] = useState<UserStats | null>(null)
  const onFinishRef = useRef(onFinish)
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  useEffect(() => {
    if (gameState.status === 'finished' && !matchSavedRef.current) {
      matchSavedRef.current = true
      onFinishRef.current?.()
      saveMatchResult({
        score_player1: gameState.player1.score,
        score_player2: gameState.player2.score,
        winner: gameState.winner as 'player1' | 'player2' | null,
        gameMode: mode,
      })
        .then(() => fetchMyStats())
        .then(s => { if (s) setAfterStats(s) })
        .catch(() => { /* silently ignore if not logged in */ })
    }
  }, [gameState.status, gameState.winner, gameState.player1.score, gameState.player2.score])

  const prevTriggerRef = useRef(0)
  useEffect(() => {
    if (restartTrigger !== undefined && restartTrigger > prevTriggerRef.current) {
      prevTriggerRef.current = restartTrigger
      matchSavedRef.current = false
      restart()
    }
  }, [restartTrigger, restart])

  const handleRestart = useCallback(() => {
    matchSavedRef.current = false
    restart()
  }, [restart])

  const winnerName =
    gameState.winner === 'player1' ? player1Name :
    gameState.winner === 'player2' ? player2Name : ''
  const winnerNation =
    gameState.winner === 'player1' ? player1Nation :
    gameState.winner === 'player2' ? player2Nation : ''
  const winnerColor =
    gameState.winner === 'player1' ? PLAYER1_COLOR : PLAYER2_COLOR

  const lpDelta = mode === 'online'
    ? (gameState.winner === 'player1' ? 20 : gameState.winner === null ? 5 : -13)
    : 0
  const xpDelta = gameState.winner === 'player1' ? 30 : gameState.winner === null ? 10 : 5

  const handleShowResults = afterStats ? () => {
    navigate('/results', { state: { stats: afterStats, lpDelta, xpDelta, backRoute, gameRoute: window.location.pathname, gameMode: mode } })
  } : undefined

  return (
    <Scene
      leftScore={gameState.player1.score}
      rightScore={gameState.player2.score}
      leftName={player1Name}
      rightName={player2Name}
      timeLeft={timeLeft}
      winningScore={winningScore}
      theme={theme}
    >
      <GoalPost goal={gameState.goal1} filter={theme.goalFilter} />
      <GoalPost goal={gameState.goal2} filter={theme.goalFilter} />

      {gameState.obstacles.map((o, i) => (
        <Obstacle key={i} x={o.x} y={o.y} radius={o.radius} themeId={theme.id} />
      ))}

      <Ball
        x={gameState.ball.x}
        y={gameState.ball.y}
        radius={gameState.ball.radius}
        filter={theme.ballFilter}
        glow={theme.ballGlow}
        themeId={theme.id}
      />

      <Character
        x={gameState.player1.x}
        y={gameState.player1.y}
        radius={gameState.player1.radius}
        color={PLAYER1_COLOR}
        nation={player1Nation}
        isKicking={gameState.player1.isKicking}
        kickTimer={gameState.player1.kickTimer}
        facingRight={true}
        freezeFrames={gameState.player1.freezeFrames}
        speedBoostFrames={gameState.player1.speedBoostFrames}
        kickBoostFrames={gameState.player1.kickBoostFrames}
      />
      <Character
        x={gameState.player2.x}
        y={gameState.player2.y}
        radius={gameState.player2.radius}
        color={PLAYER2_COLOR}
        nation={player2Nation}
        isKicking={gameState.player2.isKicking}
        kickTimer={gameState.player2.kickTimer}
        facingRight={false}
        freezeFrames={gameState.player2.freezeFrames}
        speedBoostFrames={gameState.player2.speedBoostFrames}
        kickBoostFrames={gameState.player2.kickBoostFrames}
      />

      {gameState.happening && <Happening happening={gameState.happening} themeId={theme.id} />}

      {goalFlash && (
        <GoalFlash
          scorerName={goalFlash}
          scorerNation={goalFlash === player1Name ? player1Nation : player2Nation}
          scorerColor={goalFlash === player1Name ? PLAYER1_COLOR : PLAYER2_COLOR}
        />
      )}

      {gameState.status === 'finished' && !goalFlash && (
        <GameOver
          isDraw={gameState.winner === null}
          mirrorWinner={gameState.winner === 'player2'}
          winner={winnerName}
          winnerColor={winnerColor}
          winnerNation={winnerNation}
          player1Nation={player1Nation}
          player1Color={PLAYER1_COLOR}
          player2Nation={player2Nation}
          player2Color={PLAYER2_COLOR}
          score1={gameState.player1.score}
          score2={gameState.player2.score}
          onReplay={handleRestart}
          onBack={() => navigate(backRoute)}
          onShowResults={handleShowResults}
        />
      )}
    </Scene>
  )
}
