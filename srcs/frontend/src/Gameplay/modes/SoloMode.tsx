import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MatchView } from '../match/MatchView'
import { VersusScreen } from '../components/VersusScreen'
import { PauseMenu } from '../components/PauseMenu'
import { getCurrentUser } from '../../utils/auth'
import { VERSUS_SCREEN_DURATION_MS, SCORE_DEFAULT } from '../engine/constants'
import { THEMES } from '../themes'

interface SoloModeState {
  playerName?: string
  aiName?: string
  playerNation?: string
  aiNation?: string
  duration?: number | null
  winningScore?: number | null
  themeId?: string
}

const SoloMode = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as SoloModeState | null) ?? null

  const user = getCurrentUser()
  const playerName = state?.playerName || user?.username || searchParams.get('playerName') || t('Player')
  const aiName = state?.aiName || searchParams.get('player2') || searchParams.get('ai') || 'CPU'
  const playerNation = state?.playerNation || searchParams.get('player') || 'Algeria'
  const aiNation = state?.aiNation || searchParams.get('ai') || 'Algeria'
  const duration = state?.duration !== undefined ? state.duration : null
  const winningScore = state?.winningScore !== undefined ? state.winningScore : SCORE_DEFAULT
  const theme = THEMES.find(th => th.id === state?.themeId) ?? THEMES[0]

  const [showVersus, setShowVersus] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [restartCount, setRestartCount] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setShowVersus(false), VERSUS_SCREEN_DURATION_MS)
    return () => clearTimeout(t)
  }, [])

  const handlePauseRestart = useCallback(() => {
    setIsPaused(false)
    setGameFinished(false)
    setRestartCount(c => c + 1)
  }, [])

  return (
    <>
      <MatchView
        mode="solo"
        player1Name={playerName}
        player2Name={aiName}
        player1Nation={playerNation}
        player2Nation={aiNation}
        backRoute="/solo-select"
        paused={showVersus || isPaused}
        duration={duration}
        winningScore={winningScore}
        theme={theme}
        restartTrigger={restartCount}
        onFinish={() => setGameFinished(true)}
      />
      {!showVersus && !gameFinished && (
        <PauseMenu
          isPaused={isPaused}
          onOpen={() => setIsPaused(true)}
          onClose={() => setIsPaused(false)}
          onRestart={handlePauseRestart}
          onLeave={() => navigate('/solo-select')}
          backLabel={t('Solo')}
        />
      )}
      {showVersus && (
        <VersusScreen
          player1Name={playerName}
          player2Name={aiName}
          player1Nation={playerNation}
          player2Nation={aiNation}
        />
      )}
    </>
  )
}

export default SoloMode
