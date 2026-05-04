import { useNavigate } from 'react-router-dom'
import { useGameLoop } from './useGameLoop'
import { Ball } from './components/Ball'
import { PlayerCircle } from './components/PlayerCircle'
import { GameOver } from './components/GameOver'
import { GoalPost } from './components/GoalPost'
import { GameSceneLayout } from './GameSceneLayout'

export type GameMode = 'solo' | 'local'

interface GameModeViewProps {
  mode: GameMode
  player1Name: string
  player2Name: string
  player1Nation: string
  player2Nation: string
  backRoute: string
}

export function GameModeView({ mode, player1Name, player2Name, player1Nation, player2Nation, backRoute }: GameModeViewProps) {
  const navigate = useNavigate()
  const isSolo = mode === 'solo'
  const { gameState, goalFlash, restart } = useGameLoop(player1Name, player2Name, isSolo)

  return (
    <GameSceneLayout
      leftScore={gameState.player1.score}
      rightScore={gameState.player2.score}
      leftName={player1Name}
      rightName={player2Name}
    >
      <GoalPost goal={gameState.goal1} />
      <GoalPost goal={gameState.goal2} />

      <Ball
        x={gameState.ball.x}
        y={gameState.ball.y}
        radius={gameState.ball.radius}
      />

      <PlayerCircle
        x={gameState.player1.x}
        y={gameState.player1.y}
        radius={gameState.player1.radius}
        color="#3b82f6"
        nation={player1Nation}
        isKicking={gameState.player1.isKicking}
        facingRight={true}
      />
      <PlayerCircle
        x={gameState.player2.x}
        y={gameState.player2.y}
        radius={gameState.player2.radius}
        color="#ef4444"
        nation={player2Nation}
        isKicking={gameState.player2.isKicking}
        facingRight={false}
      />

      {goalFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.65)',
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#facc15',
            letterSpacing: 4,
            textShadow: '0 0 30px #facc15, 0 0 60px #f97316',
          }}>
            BUUUUT !
          </div>
          <div style={{
            fontSize: 28,
            color: '#fff',
            marginTop: 12,
            fontWeight: 600,
          }}>
            {goalFlash} marque !
          </div>
        </div>
      )}

      {gameState.status === 'finished' && !goalFlash && (
        <GameOver
          winner={
            gameState.winner === 'player1' ? player1Name
              : gameState.winner === 'player2' ? player2Name
                : ''
          }
          onReplay={restart}
          onBack={() => navigate(backRoute)}
        />
      )}
    </GameSceneLayout>
  )
}
