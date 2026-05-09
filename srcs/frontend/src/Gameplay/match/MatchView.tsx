import { useNavigate } from 'react-router-dom'
import { useGameLoop } from './useGameLoop'
import { Ball } from '../components/Ball'
import { Character } from '../components/Character'
import { GameOver } from '../components/GameOver'
import { GoalPost } from '../components/GoalPost'
import { GoalFlash } from '../components/GoalFlash'
import { Obstacle } from '../components/Obstacle'
import { Happening } from '../components/Happening'
import { Scene } from '../components/Scene'

export type GameMode = 'solo' | 'local'

interface MatchViewProps {
  mode: GameMode
  player1Name: string
  player2Name: string
  player1Nation: string
  player2Nation: string
  backRoute: string
}

const PLAYER1_COLOR = '#3b82f6'
const PLAYER2_COLOR = '#ef4444'

export function MatchView({
  mode, player1Name, player2Name, player1Nation, player2Nation, backRoute,
}: MatchViewProps) {
  const navigate = useNavigate()
  const { gameState, goalFlash, restart } = useGameLoop(player1Name, player2Name, mode === 'solo')

  const winnerName =
    gameState.winner === 'player1' ? player1Name :
    gameState.winner === 'player2' ? player2Name : ''

  return (
    <Scene
      leftScore={gameState.player1.score}
      rightScore={gameState.player2.score}
      leftName={player1Name}
      rightName={player2Name}
    >
      <GoalPost goal={gameState.goal1} />
      <GoalPost goal={gameState.goal2} />

      {gameState.obstacles.map((o, i) => (
        <Obstacle key={i} x={o.x} y={o.y} radius={o.radius} />
      ))}

      <Ball
        x={gameState.ball.x}
        y={gameState.ball.y}
        radius={gameState.ball.radius}
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

      {gameState.happening && <Happening happening={gameState.happening} />}

      {goalFlash && <GoalFlash scorerName={goalFlash} />}

      {gameState.status === 'finished' && !goalFlash && (
        <GameOver
          winner={winnerName}
          onReplay={restart}
          onBack={() => navigate(backRoute)}
        />
      )}
    </Scene>
  )
}
