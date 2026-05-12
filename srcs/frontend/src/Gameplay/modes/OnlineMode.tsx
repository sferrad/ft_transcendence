import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useOnlineGameLoop } from '../match/useOnlineGameLoop'
import { Ball } from '../components/Ball'
import { Character } from '../components/Character'
import { GameOver } from '../components/GameOver'
import { GoalPost } from '../components/GoalPost'
import { GoalFlash } from '../components/GoalFlash'
import { Obstacle } from '../components/Obstacle'
import { Happening } from '../components/Happening'
import { Scene } from '../components/Scene'
import { VersusScreen } from '../components/VersusScreen'
import { THEMES } from '../themes'
import { VERSUS_SCREEN_DURATION_MS } from '../engine/constants'
import { fetchMyStats, type UserStats } from '../api/matches'
import type { MatchmakingResult } from '../api/matchmaking'

const PLAYER1_COLOR = '#3b82f6'
const PLAYER2_COLOR = '#ef4444'

export default function OnlineMode() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const matchInfo = location.state as MatchmakingResult | null

  // Guard: redirect if no match info
  useEffect(() => {
    if (!matchInfo?.match_id) navigate('/')
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
      }
    }
  }, [matchInfo, navigate])

  if (!matchInfo?.match_id) return null

  const {
    game_room_id,
    role = 'player1',
    seed = Date.now(),
    opponent_name = 'Opponent',
    opponent_nation = 'Algeria',
  } = matchInfo

  // Online mode has fixed configuration: 5 goals and 60 seconds
  const ONLINE_WINNING_SCORE = 5
  const ONLINE_DURATION = 60

  const myNation = (location.state as { myNation?: string })?.myNation ?? 'Algeria'
  const player1Name = role === 'player1' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player2Name = role === 'player2' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player1Nation = role === 'player1' ? myNation : opponent_nation
  const player2Nation = role === 'player2' ? myNation : opponent_nation

  const theme = THEMES[0]

  // WebSocket connection
  const { socket, connected } = useWebSocket()
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [showVersus, setShowVersus] = useState(true)
  const [gameInProgress, setGameInProgress] = useState(false)
  const matchSavedRef = useRef(false)
  const [afterStats, setAfterStats] = useState<UserStats | null>(null)
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Join game room with role info once connected
  useEffect(() => {
    if (!connected || !socket || !game_room_id) return
    socket.emit('game.join', { game_room_id, role })
  }, [connected, socket, game_room_id, role])

  // Listen for opponent joining/leaving and disconnections
  useEffect(() => {
    if (!socket) return

    const onUserJoined = () => {
      setOpponentConnected(true)
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
        disconnectTimeoutRef.current = null
      }
    }

    const onUserLeft = () => setOpponentConnected(false)

    // Handle socket disconnect
    const onDisconnect = () => {
      setOpponentConnected(false)
      // Auto-reconnect after 3 seconds if still in game
      if (gameInProgress) {
        disconnectTimeoutRef.current = setTimeout(() => {
          socket.connect()
        }, 3000)
      }
    }

    const onConnect = () => {
      if (gameInProgress && game_room_id) {
        socket.emit('game.rejoin', { game_room_id, role })
      }
    }

    socket.on('game.user_joined', onUserJoined)
    socket.on('game.user_left', onUserLeft)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)

    return () => {
      socket.off('game.user_joined', onUserJoined)
      socket.off('game.user_left', onUserLeft)
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current)
      }
    }
  }, [socket, gameInProgress, game_room_id, role])

  // Dismiss versus screen after delay
  useEffect(() => {
    const id = setTimeout(() => {
      setShowVersus(false)
      setGameInProgress(true)
    }, VERSUS_SCREEN_DURATION_MS)
    return () => clearTimeout(id)
  }, [])

  // Online game loop
  const { gameState, goalFlash, timeLeft } = useOnlineGameLoop(
    role as 'player1' | 'player2',
    socket,
    player1Name,
    player2Name,
    showVersus || (!opponentConnected && gameInProgress),
    ONLINE_DURATION,
    ONLINE_WINNING_SCORE,
    seed,
  )

  // When game finishes: player1 sends game.update to trigger server persistence
  useEffect(() => {
    if (gameState.status !== 'finished' || matchSavedRef.current) return
    matchSavedRef.current = true
    setGameInProgress(false)

    if (role === 'player1' && socket?.connected) {
      socket.emit('game.update', {
        status: 'finished',
        winner: gameState.winner,
        player1: { score: gameState.player1.score },
        player2: { score: gameState.player2.score },
        winningScore: ONLINE_WINNING_SCORE,
        duration: ONLINE_DURATION,
      })
    }

    fetchMyStats()
      .then(s => { if (s) setAfterStats(s) })
      .catch(() => {})
  }, [gameState.status, gameState.winner, gameState.player1.score, gameState.player2.score, role, socket])

  const lpDelta = gameState.winner === (role === 'player1' ? 'player1' : 'player2') ? 20
    : gameState.winner === null ? 5 : -13
  const xpDelta = gameState.winner === (role === 'player1' ? 'player1' : 'player2') ? 30
    : gameState.winner === null ? 10 : 5

  const handleShowResults = afterStats ? () => {
    navigate('/results', {
      state: {
        stats: afterStats,
        lpDelta,
        xpDelta,
        backRoute: '/lobby',
        gameRoute: '/online-gameplay',
        gameMode: 'online',
      },
    })
  } : undefined

  const winnerName =
    gameState.winner === 'player1' ? player1Name :
    gameState.winner === 'player2' ? player2Name : ''
  const winnerNation =
    gameState.winner === 'player1' ? player1Nation :
    gameState.winner === 'player2' ? player2Nation : ''
  const winnerColor =
    gameState.winner === 'player1' ? PLAYER1_COLOR : PLAYER2_COLOR

  return (
    <>
      <Scene
        leftScore={gameState.player1.score}
        rightScore={gameState.player2.score}
        leftName={player1Name}
        rightName={player2Name}
        timeLeft={timeLeft}
        winningScore={ONLINE_WINNING_SCORE}
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
            onReplay={() => navigate('/online-gameplay')}
            onBack={() => navigate('/lobby')}
            onShowResults={handleShowResults}
          />
        )}
      </Scene>

      {showVersus && (
        <VersusScreen
          player1Name={player1Name}
          player2Name={player2Name}
          player1Nation={player1Nation}
          player2Nation={player2Nation}
        />
      )}

      {/* Disconnection & Reconnection Status */}
      {gameInProgress && !opponentConnected && gameState.status === 'playing' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white font-arcade px-6 py-3 rounded-lg text-lg shadow-lg text-center">
          <div>{t('Opponent disconnected')}</div>
          <div className="text-sm mt-1">{t('Waiting for reconnection...')}</div>
        </div>
      )}

      {/* Pause overlay when opponent disconnected during playing */}
      {gameInProgress && !opponentConnected && gameState.status === 'playing' && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
          <div className="text-white font-arcade text-center">
            <div className="text-2xl mb-4">{t('Game Paused')}</div>
            <div className="text-lg text-gray-300">{t('Waiting for opponent...')}</div>
          </div>
        </div>
      )}
    </>
  )
}
