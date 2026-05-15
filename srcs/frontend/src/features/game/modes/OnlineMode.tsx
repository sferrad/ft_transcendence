import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWebSocket } from '../../../hooks/useWebSocket'
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
import { clearPendingMatch } from '../../../utils/pendingMatch'

const PLAYER1_COLOR = '#3b82f6'
const PLAYER2_COLOR = '#ef4444'
const FORFEIT_TIMEOUT_S = 20

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

interface ForfeitState {
  isWin: boolean
  opponentName: string
  voluntary: boolean
  winnerRole: 'player1' | 'player2' | null
  score1: number
  score2: number
}

export default function OnlineMode() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const matchInfo = location.state as (MatchmakingResult & { myNation?: string; themeId?: string; isRejoin?: boolean }) | null

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
  const player1Name = role === 'player1' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player2Name = role === 'player2' ? (localStorage.getItem('username') || 'Me') : opponent_name
  const player1Nation = role === 'player1' ? myNation : opponent_nation
  const player2Nation = role === 'player2' ? myNation : opponent_nation
  const myName = role === 'player1' ? player1Name : player2Name

  const theme = THEMES[(parseInt(game_room_id ?? '0') || seed) % THEMES.length]

  const { socket, connected } = useWebSocket()
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [showVersus, setShowVersus] = useState(!isRejoin)
  const [gameInProgress, setGameInProgress] = useState(isRejoin)
  const [disconnectSecs, setDisconnectSecs] = useState<number | null>(null)
  const [forfeit, setForfeit] = useState<ForfeitState | null>(null)
  const [afterStats, setAfterStats] = useState<UserStats | null>(null)

  const [showAbandon, setShowAbandon] = useState(false)
  const matchSavedRef = useRef(false)
  const hasAbandonedRef = useRef(false)
  const hadDisconnectCountdownRef = useRef(false)
  const gameInProgressRef = useRef(isRejoin)
  const disconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasJoinedRef = useRef(false)
  // Stable snapshot of matchInfo so the beforeunload effect never re-runs (and never clears on re-render)
  useEffect(() => { gameInProgressRef.current = gameInProgress }, [gameInProgress])

  // Clear any stale localStorage pending match on mount (server is now the source of truth)
  useEffect(() => {
    clearPendingMatch()
  }, [])

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

  // ── Sortie volontaire : prévenir le backend au démontage ──
  // Le socket est désormais un singleton global : quitter cette page ne coupe
  // plus la connexion. Si la partie n'est pas finie quand le composant se
  // démonte, on émet `game.leave` pour que le backend démarre le grace period
  // (popup de reconnexion). Si elle est finie (matchSavedRef) ou si on a
  // déjà émis un forfeit (hasAbandonedRef), on ne fait rien.
  useEffect(() => {
    return () => {
      if (matchSavedRef.current) return
      if (hasAbandonedRef.current) return
      if (!socket || !game_room_id) return
      socket.emit('game.leave', { game_room_id })
    }
  }, [socket, game_room_id])

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

  const handleAbandon = useCallback(() => {
    if (!socket || !game_room_id) { navigate('/lobby'); return }
    hasAbandonedRef.current = true
    clearPendingMatch()
    setShowAbandon(false)
    socket.emit('game.action', { type: 'forfeit' })
    // Ne pas naviguer ici — attendre game.forfeit du serveur pour afficher l'overlay
  }, [socket, game_room_id, navigate])

  const handleForfeit = useCallback((data: { forfeit_user_id: number; winner_role: string | null; score_player1?: number; score_player2?: number }) => {
    if (matchSavedRef.current) return
    matchSavedRef.current = true
    setGameInProgress(false)
    clearPendingMatch()
    const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10)
    const isWin = data.forfeit_user_id !== myUserId
    // Voluntary = j'ai cliqué abandon, ou l'adversaire n'avait pas eu de countdown de déco avant
    const voluntary = hasAbandonedRef.current || (!isWin ? true : !hadDisconnectCountdownRef.current)
    const winnerRole = data.winner_role as 'player1' | 'player2' | null
    // Scores officiels envoyés par le serveur (3-0), avec fallback dérivé de winnerRole
    const score1 = data.score_player1 ?? (winnerRole === 'player1' ? 3 : 0)
    const score2 = data.score_player2 ?? (winnerRole === 'player2' ? 3 : 0)
    setForfeit({ isWin, opponentName: opponent_name, voluntary, winnerRole, score1, score2 })
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
      hadDisconnectCountdownRef.current = true
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
      hadDisconnectCountdownRef.current = false
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

      {/* ── Abandon button (visible during active gameplay only) ── */}
      {gameInProgress && !forfeit && gameState.status !== 'finished' && !showVersus && (
        <>
          <button
            onClick={() => setShowAbandon(true)}
            title={t('Abandon')}
            style={{
              position: 'fixed', top: 10, right: 10, zIndex: 45,
              width: 42, height: 42,
              background: 'rgba(10, 15, 30, 0.85)',
              border: '2px solid rgba(255,255,255,0.25)',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            ✕
          </button>

          {showAbandon && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 55, backdropFilter: 'blur(3px)' }} />
              <div
                className="font-arcade"
                style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  zIndex: 56,
                  background: 'rgba(10, 15, 30, 0.97)',
                  border: '2px solid rgba(239,68,68,0.4)',
                  borderRadius: 8,
                  padding: '40px 56px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  minWidth: 300,
                }}
              >
                <div style={{ color: '#ef4444', fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('abandon.confirm_title')}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 13, letterSpacing: 1, textAlign: 'center', marginBottom: 8 }}>
                  {t('abandon.confirm_desc')}
                </div>
                <button
                  onClick={handleAbandon}
                  style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#ef4444', color: '#fff', boxShadow: ARCADE_BTN }}
                >
                  {t('Abandon')}
                </button>
                <button
                  onClick={() => setShowAbandon(false)}
                  style={{ width: '100%', padding: '13px 0', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderRadius: 0, background: '#4b5563', color: '#fff', boxShadow: ARCADE_BTN }}
                >
                  {t('Cancel')}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Versus screen ── */}
      {showVersus && (
        <VersusScreen
          player1Name={player1Name}
          player2Name={player2Name}
          player1Nation={player1Nation}
          player2Nation={player2Nation}
          themeId={theme.id}
          themeNameKey={theme.nameKey}
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
              display: 'flex', alignItems: 'center', gap: 24,
              fontSize: 'clamp(32px, 5vw, 72px)',
              color: '#fff',
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ color: forfeit.winnerRole === 'player1' ? '#22c55e' : '#ef4444' }}>
              {forfeit.score1}
            </span>
            <span style={{ color: '#4b5563', fontSize: '0.6em' }}>–</span>
            <span style={{ color: forfeit.winnerRole === 'player2' ? '#22c55e' : '#ef4444' }}>
              {forfeit.score2}
            </span>
          </div>

          <div
            className="font-arcade"
            style={{
              fontSize: 'clamp(20px, 3vw, 42px)',
              color: forfeit.isWin ? '#22c55e' : '#ef4444',
              letterSpacing: 4, textTransform: 'uppercase',
              textShadow: forfeit.isWin
                ? '0 0 28px #22c55e99, 4px 4px 0 #000'
                : '0 0 28px #ef444499, 4px 4px 0 #000',
            }}
          >
            {forfeit.isWin
              ? (forfeit.voluntary ? t('forfeit.win_abandon_title') : t('forfeit.win_title'))
              : (forfeit.voluntary ? t('forfeit.abandon_title') : t('forfeit.loss_title'))}
          </div>
          <div className="font-arcade text-gray-300 text-lg text-center px-8">
            {forfeit.isWin
              ? (forfeit.voluntary
                  ? t('forfeit.win_abandon_desc', { name: forfeit.opponentName })
                  : t('forfeit.win_desc', { name: forfeit.opponentName }))
              : (forfeit.voluntary
                  ? t('forfeit.abandon_desc')
                  : t('forfeit.loss_desc', { name: myName }))}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            {handleShowResults && (
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
