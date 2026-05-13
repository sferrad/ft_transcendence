import { useState, useEffect, useRef, useCallback } from 'react'
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
import { savePendingMatch, clearPendingMatch } from '../../utils/pendingMatch'

const PLAYER1_COLOR = '#3b82f6'
const PLAYER2_COLOR = '#ef4444'
const FORFEIT_TIMEOUT_S = 20

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

interface ForfeitState {
  isWin: boolean
  opponentName: string
}

export default function OnlineMode() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const matchInfo = location.state as (MatchmakingResult & { myNation?: string; isRejoin?: boolean }) | null

  useEffect(() => {
    if (!matchInfo?.match_id) navigate('/')
  }, [matchInfo, navigate])

  if (!matchInfo?.match_id) return null

  const {
    game_room_id,
    role = 'player1',
    seed = 1,
    opponent_name = 'Opponent',
    opponent_nation = 'Algeria',
    isRejoin = false,
  } = matchInfo

  const ONLINE_WINNING_SCORE = 5
  const ONLINE_DURATION = 60

  const myNation = matchInfo.myNation ?? 'Algeria'
  const player1Name = role === 'player1' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player2Name = role === 'player2' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player1Nation = role === 'player1' ? myNation : opponent_nation
  const player2Nation = role === 'player2' ? myNation : opponent_nation
  const myName = role === 'player1' ? player1Name : player2Name

  const theme = THEMES[0]

  const { socket, connected } = useWebSocket()
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [showVersus, setShowVersus] = useState(!isRejoin)
  const [gameInProgress, setGameInProgress] = useState(isRejoin)
  const [disconnectSecs, setDisconnectSecs] = useState<number | null>(null)
  const [forfeit, setForfeit] = useState<ForfeitState | null>(null)
  const [afterStats, setAfterStats] = useState<UserStats | null>(null)

  const matchSavedRef = useRef(false)
  const gameInProgressRef = useRef(isRejoin)
  const disconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasJoinedRef = useRef(false)

  useEffect(() => { gameInProgressRef.current = gameInProgress }, [gameInProgress])

  // ── Save pending match on tab/window close only (not on SPA navigation) ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameInProgressRef.current && !matchSavedRef.current) {
        savePendingMatch({ ...matchInfo, myNation }, FORFEIT_TIMEOUT_S * 1000)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // SPA navigation: clear the pending match so no popup appears
      clearPendingMatch()
    }
  }, [matchInfo, myNation])

  // ── Join / rejoin game room on (re)connect ──
  useEffect(() => {
    if (!connected || !socket || !game_room_id) return
    if (isRejoin || hasJoinedRef.current) {
      socket.emit('game.rejoin', { game_room_id, role })
    } else {
      hasJoinedRef.current = true
      socket.emit('game.join', { game_room_id, role })
    }
  }, [connected, socket, game_room_id, role, isRejoin])

  // ── Game socket events ──
  const { gameState, goalFlash, timeLeft, restoreState } = useOnlineGameLoop(
    role as 'player1' | 'player2',
    socket,
    player1Name,
    player2Name,
    showVersus || (!opponentConnected && gameInProgress && !forfeit),
    ONLINE_DURATION,
    ONLINE_WINNING_SCORE,
    seed,
  )

  const handleForfeit = useCallback((data: { forfeit_user_id: number; winner_role: string | null }) => {
    if (matchSavedRef.current) return
    matchSavedRef.current = true
    setGameInProgress(false)
    clearPendingMatch()
    const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
    const isWin = data.forfeit_user_id !== myUserId
    setForfeit({ isWin, opponentName: opponent_name })
    fetchMyStats().then(s => { if (s) setAfterStats(s) }).catch(() => {})
  }, [opponent_name])

  useEffect(() => {
    if (!socket) return

    const onUserJoined = () => {
      setOpponentConnected(true)
      if (disconnectIntervalRef.current) {
        clearInterval(disconnectIntervalRef.current)
        disconnectIntervalRef.current = null
      }
      setDisconnectSecs(null)
    }

    const onUserLeft = () => {
      setOpponentConnected(false)
    }

    const onOpponentDisconnected = (data: { timeout_seconds?: number }) => {
      setOpponentConnected(false)
      const secs = data?.timeout_seconds ?? FORFEIT_TIMEOUT_S
      setDisconnectSecs(secs)
      if (disconnectIntervalRef.current) clearInterval(disconnectIntervalRef.current)
      disconnectIntervalRef.current = setInterval(() => {
        setDisconnectSecs(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(disconnectIntervalRef.current!)
            disconnectIntervalRef.current = null
            return null
          }
          return prev - 1
        })
      }, 1000)
    }

    const onOpponentReconnected = () => {
      setOpponentConnected(true)
      setDisconnectSecs(null)
      if (disconnectIntervalRef.current) {
        clearInterval(disconnectIntervalRef.current)
        disconnectIntervalRef.current = null
      }
    }

    // game.joined is the confirmation we receive after our own game.join.
    // user_joined only fires for the OTHER members of the room, so the
    // second player to join would never learn the first is already there
    // without inspecting room_members here.
    const onJoined = (data: { room_members?: number[] }) => {
      const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
      const others = (data.room_members ?? []).filter(id => id !== myUserId)
      if (others.length > 0) setOpponentConnected(true)
    }

    const onRejoined = (data: { last_state?: Record<string, unknown>; room_members?: number[] }) => {
      clearPendingMatch()
      if (data.last_state) {
        restoreState(data.last_state as Parameters<typeof restoreState>[0])
      }
      const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
      const others = (data.room_members ?? []).filter(id => id !== myUserId)
      setOpponentConnected(others.length > 0)
      setGameInProgress(true)
    }

    const onForfeit = (data: { forfeit_user_id: number; winner_role: string | null }) => {
      handleForfeit(data)
    }

    const onDisconnect = () => {
      setOpponentConnected(false)
      if (!matchSavedRef.current) {
        savePendingMatch({ ...matchInfo, myNation }, FORFEIT_TIMEOUT_S * 1000)
      }
    }

    socket.on('game.joined', onJoined)
    socket.on('game.user_joined', onUserJoined)
    socket.on('game.user_left', onUserLeft)
    socket.on('game.opponent_disconnected', onOpponentDisconnected)
    socket.on('game.opponent_reconnected', onOpponentReconnected)
    socket.on('game.rejoined', onRejoined)
    socket.on('game.forfeit', onForfeit)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('game.joined', onJoined)
      socket.off('game.user_joined', onUserJoined)
      socket.off('game.user_left', onUserLeft)
      socket.off('game.opponent_disconnected', onOpponentDisconnected)
      socket.off('game.opponent_reconnected', onOpponentReconnected)
      socket.off('game.rejoined', onRejoined)
      socket.off('game.forfeit', onForfeit)
      socket.off('disconnect', onDisconnect)
      if (disconnectIntervalRef.current) clearInterval(disconnectIntervalRef.current)
    }
  }, [socket, matchInfo, myNation, restoreState, handleForfeit])

  // ── Versus screen (skipped on rejoin) ──
  useEffect(() => {
    if (isRejoin) return
    const id = setTimeout(() => {
      setShowVersus(false)
      setGameInProgress(true)
    }, VERSUS_SCREEN_DURATION_MS)
    return () => clearTimeout(id)
  }, [isRejoin])

  // ── Persist result when game finishes normally ──
  // The loop already broadcasts the final state (status === 'finished') via
  // game.update; the backend handles persistence on its side. We only need
  // to flip local flags and refresh stats here.
  useEffect(() => {
    if (gameState.status !== 'finished' || matchSavedRef.current) return
    matchSavedRef.current = true
    setGameInProgress(false)
    clearPendingMatch()
    fetchMyStats().then(s => { if (s) setAfterStats(s) }).catch(() => {})
  }, [gameState.status])

  // ── LP / XP deltas ──
  const myRole = role === 'player1' ? 'player1' : 'player2'
  const lpDelta = gameState.winner === myRole ? 20 : gameState.winner === null ? 5 : -13
  const xpDelta = gameState.winner === myRole ? 30 : gameState.winner === null ? 10 : 5
  const forfeitLpDelta = forfeit?.isWin ? 20 : -13
  const forfeitXpDelta = forfeit?.isWin ? 30 : 5

  const handleShowResults = afterStats ? () => {
    navigate('/results', {
      state: {
        stats: afterStats,
        lpDelta: forfeit ? forfeitLpDelta : lpDelta,
        xpDelta: forfeit ? forfeitXpDelta : xpDelta,
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

        {gameState.status === 'finished' && !goalFlash && !forfeit && (
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

      {/* ── Versus screen ── */}
      {showVersus && (
        <VersusScreen
          player1Name={player1Name}
          player2Name={player2Name}
          player1Nation={player1Nation}
          player2Nation={player2Nation}
        />
      )}

      {/* ── Pause overlay when opponent disconnected ── */}
      {gameInProgress && !opponentConnected && gameState.status === 'playing' && !forfeit && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 bg-gray-900/95 border-2 border-red-500/60 rounded-xl px-10 py-8 shadow-2xl text-center">
            <div className="font-arcade text-red-400 text-2xl">{t('Opponent disconnected')}</div>
            {disconnectSecs !== null && (
              <div className="font-arcade text-white text-4xl">{disconnectSecs}s</div>
            )}
            <div className="font-arcade text-gray-300 text-base">{t('disconnect.countdown_hint')}</div>
          </div>
        </>
      )}

      {/* ── Forfeit overlay ── */}
      {forfeit && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden',
            background: forfeit.isWin
              ? 'radial-gradient(ellipse at 50% 40%, #22c55e22 0%, #050e1a 70%)'
              : 'radial-gradient(ellipse at 50% 40%, #ef444422 0%, #050e1a 70%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}
        >
          <div
            className="font-arcade"
            style={{
              fontSize: 'clamp(28px, 5vw, 64px)',
              color: forfeit.isWin ? '#22c55e' : '#ef4444',
              letterSpacing: 4, textTransform: 'uppercase',
              textShadow: forfeit.isWin
                ? '0 0 28px #22c55e99, 4px 4px 0 #000'
                : '0 0 28px #ef444499, 4px 4px 0 #000',
            }}
          >
            {forfeit.isWin ? t('forfeit.win_title') : t('forfeit.loss_title')}
          </div>
          <div className="font-arcade text-gray-300 text-lg text-center px-8">
            {forfeit.isWin
              ? t('forfeit.win_desc', { name: forfeit.opponentName })
              : t('forfeit.loss_desc', { name: myName })}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {forfeit.isWin && handleShowResults && (
              <button
                className="font-arcade"
                onClick={handleShowResults}
                style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#7c3aed', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
              >
                {t('Results')}
              </button>
            )}
            <button
              className="font-arcade"
              onClick={() => navigate('/lobby')}
              style={{ padding: '14px 38px', fontSize: 'clamp(12px, 1.6vw, 20px)', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#2563EB', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
            >
              {t('Back')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
