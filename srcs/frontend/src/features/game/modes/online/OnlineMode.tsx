import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../../../../hooks/useWebSocket'
import { useOnlineGameLoop } from '../../match/useOnlineGameLoop'
import { Ball } from '../../components/Ball'
import { Character } from '../../components/Character'
import { GameOver } from '../../components/GameOver'
import { GoalPost } from '../../components/GoalPost'
import { GoalFlash } from '../../components/GoalFlash'
import { Obstacle } from '../../components/Obstacle'
import { Happening } from '../../components/Happening'
import { Scene } from '../../components/Scene'
import { VersusScreen } from '../../components/VersusScreen'
import { THEMES } from '../../themes'
import { VERSUS_SCREEN_DURATION_MS } from '../../engine/constants'
import { fetchMyStats } from '../../api/matches'
import type { MatchmakingResult } from '../../api/matchmaking'
import { clearPendingMatch } from '../../../../utils/pendingMatch'
import { useOnlineSession } from './useOnlineSession'
import { AbandonModal } from './AbandonModal'
import { DisconnectOverlay } from './DisconnectOverlay'
import { ForfeitOverlay } from './ForfeitOverlay'
import { PLAYER1_COLOR, PLAYER2_COLOR } from './constants'

export default function OnlineMode() {
  const location = useLocation()
  const navigate = useNavigate()
  const matchInfo = location.state as (MatchmakingResult & { myNation?: string; themeId?: string; isRejoin?: boolean; backRoute?: string }) | null

  useEffect(() => {
    const valid = matchInfo?.match_id || (matchInfo?.isRejoin && matchInfo?.game_room_id)
    if (!valid) navigate('/')
  }, [matchInfo, navigate])

  if (!matchInfo?.match_id && !(matchInfo?.isRejoin && matchInfo?.game_room_id)) return null

  const {
    game_room_id,
    role = 'player1',
    seed = 1,
    opponent_name = 'Opponent',
    opponent_nation = 'Algeria',
    isRejoin = false,
  } = matchInfo

  const ONLINE_WINNING_SCORE = matchInfo.winning_score ?? 5
  const ONLINE_DURATION = matchInfo.duration ?? 120
  const myNation = matchInfo.myNation ?? 'Algeria'
  const backRoute = matchInfo.backRoute ?? '/lobby'

  const player1Name = role === 'player1' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player2Name = role === 'player2' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player1Nation = role === 'player1' ? myNation : opponent_nation
  const player2Nation = role === 'player2' ? myNation : opponent_nation
  const myName = role === 'player1' ? player1Name : player2Name

  const theme = THEMES[(parseInt(game_room_id ?? '0') || seed) % THEMES.length]

  const { socket, connected } = useWebSocket()

  const [versusActive, setVersusActive] = useState(!isRejoin)

  // Initialise the game loop first so restoreState is available for session handlers
  const { gameState, goalFlash, timeLeft, restoreState } = useOnlineGameLoop(
    role as 'player1' | 'player2',
    socket,
    player1Name,
    player2Name,
    versusActive, // paused tant que le versus screen est affiché
    ONLINE_DURATION,
    ONLINE_WINNING_SCORE,
    seed,
  )

  const session = useOnlineSession({
    socket,
    connected,
    game_room_id,
    role: role as 'player1' | 'player2',
    opponent_name,
    isRejoin,
    restoreState,
  })

  // Versus screen timer (skipped on rejoin)
  useEffect(() => {
    if (isRejoin) return
    const id = setTimeout(() => {
      setVersusActive(false)
      session.setShowVersus(false)
      session.setGameInProgress(true)
    }, VERSUS_SCREEN_DURATION_MS)
    return () => clearTimeout(id)
  }, [isRejoin])

  // Persist result when game finishes normally
  useEffect(() => {
    if (gameState.status !== 'finished' || session.matchSavedRef.current) return
    session.matchSavedRef.current = true
    session.setGameInProgress(false)
    clearPendingMatch()
    fetchMyStats().then(s => { if (s) session.setAfterStats(s) }).catch(() => {})
  }, [gameState.status])

  // LP / XP deltas
  const myRole = role === 'player1' ? 'player1' : 'player2'
  const lpDelta = gameState.winner === myRole ? 20 : gameState.winner === null ? 5 : -13
  const xpDelta = gameState.winner === myRole ? 30 : gameState.winner === null ? 10 : 5
  const forfeitLpDelta = session.forfeit?.isWin ? 20 : -13
  const forfeitXpDelta = session.forfeit?.isWin ? 30 : 5

  const handleShowResults = session.afterStats ? () => {
    navigate('/results', {
      state: {
        stats: session.afterStats,
        lpDelta: session.forfeit ? forfeitLpDelta : lpDelta,
        xpDelta: session.forfeit ? forfeitXpDelta : xpDelta,
        backRoute,
        gameRoute: '/online-gameplay',
        gameMode: 'online',
      },
    })
  } : undefined

  const winnerName = gameState.winner === 'player1' ? player1Name : gameState.winner === 'player2' ? player2Name : ''
  const winnerNation = gameState.winner === 'player1' ? player1Nation : gameState.winner === 'player2' ? player2Nation : ''
  const winnerColor = gameState.winner === 'player1' ? PLAYER1_COLOR : PLAYER2_COLOR

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

        {gameState.status === 'finished' && !goalFlash && !session.forfeit && (
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
            onBack={() => navigate(backRoute)}
            onShowResults={handleShowResults}
          />
        )}
      </Scene>

      <AbandonModal
        showAbandon={session.showAbandon}
        onOpen={() => session.setShowAbandon(true)}
        onConfirm={() => session.handleAbandon(navigate)}
        onCancel={() => session.setShowAbandon(false)}
        gameInProgress={session.gameInProgress}
        isFinished={gameState.status === 'finished'}
        showVersus={session.showVersus}
        hasForfeit={Boolean(session.forfeit)}
      />

      {session.showVersus && (
        <VersusScreen
          player1Name={player1Name}
          player2Name={player2Name}
          player1Nation={player1Nation}
          player2Nation={player2Nation}
          themeId={theme.id}
          themeNameKey={theme.nameKey}
        />
      )}

      <DisconnectOverlay
        visible={session.gameInProgress && !session.opponentConnected && gameState.status === 'playing' && !session.forfeit}
        disconnectSecs={session.disconnectSecs}
      />

      {session.forfeit && (
        <ForfeitOverlay
          forfeit={session.forfeit}
          myName={myName}
          onShowResults={handleShowResults}
          onBack={() => navigate(backRoute)}
        />
      )}
    </>
  )
}
