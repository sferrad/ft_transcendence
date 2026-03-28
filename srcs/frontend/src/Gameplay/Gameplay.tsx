import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameLoop } from './useGameLoop'
import { Ball } from './components/Ball'
import { PlayerCircle } from './components/PlayerCircle'
import { Score } from './components/Score'
import { GameOver } from './components/GameOver'
import { GoalPost } from './components/GoalPost'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'
import { getCurrentUser } from '../utils/auth'

const Gameplay = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const user = getCurrentUser()
  // Le nom du joueur vient du JWT en priorité, sinon du searchParam
  const playerName = user?.username || searchParams.get('player') || 'Joueur'
  // L'IA prend le nom du personnage choisi côté droit (pas le même que le joueur)
  const aiName = searchParams.get('ai') || 'CPU'

  // isSolo=true → player2 est l'IA, inputs flèches désactivés
  const { gameState, goalFlash, restart } = useGameLoop(playerName, aiName, true)

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
        className="border-2 border-gray-600 rounded"
      >
        <Score
          leftScore={gameState.player1.score}
          rightScore={gameState.player2.score}
          leftName={playerName}
          rightName={aiName}
        />

        {/* Ligne centrale */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#333',
          transform: 'translateX(-50%)',
        }} />

        {/* Cages */}
        <GoalPost goal={gameState.goal1} />
        <GoalPost goal={gameState.goal2} />

        {/* Balle */}
        <Ball
          x={gameState.ball.x}
          y={gameState.ball.y}
          radius={gameState.ball.radius}
        />

        {/* Joueurs */}
        <PlayerCircle
          x={gameState.player1.x}
          y={gameState.player1.y}
          radius={gameState.player1.radius}
          color="#3b82f6"
          isKicking={gameState.player1.isKicking}
          facingRight={true}
        />
        <PlayerCircle
          x={gameState.player2.x}
          y={gameState.player2.y}
          radius={gameState.player2.radius}
          color="#ef4444"
          isKicking={gameState.player2.isKicking}
          facingRight={false}
        />

        {/* Écran BUUUT! */}
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
              animation: 'none',
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
              gameState.winner === 'player1' ? playerName :
              gameState.winner === 'player2' ? aiName : ''
            }
            onReplay={restart}
            onBack={() => navigate('/solo-select')}
          />
        )}
      </div>

      <p className="text-gray-500 text-sm mt-2">
        Contrôles : A/D (déplacer) · W (sauter) · G (tirer)
      </p>
    </div>
  )
}

export default Gameplay