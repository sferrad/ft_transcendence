import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MatchView } from '../../match/MatchView'
import { VersusScreen } from '../../components/VersusScreen'
import { PauseMenu } from '../../components/PauseMenu'
import { VERSUS_SCREEN_DURATION_MS, SCORE_DEFAULT } from '../../engine/constants'
import { THEMES } from '../../themes'

interface LocalModeState {
  player1Name?: string
  player2Name?: string
  player1Nation?: string
  player2Nation?: string
  duration?: number | null
  winningScore?: number | null
  themeId?: string
}

const LocalMode = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as LocalModeState | null) ?? null

  const player1Name = state?.player1Name || searchParams.get('player1') || t('Player 1')
  const player2Name = state?.player2Name || searchParams.get('player2') || t('Player 2')
  const player1Nation = state?.player1Nation || searchParams.get('p1Nation') || 'Algeria'
  const player2Nation = state?.player2Nation || searchParams.get('p2Nation') || 'Algeria'
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
        mode="local"
        player1Name={player1Name}
        player2Name={player2Name}
        player1Nation={player1Nation}
        player2Nation={player2Nation}
        backRoute="/local-select"
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
          onLeave={() => navigate('/local-select')}
          backLabel={t('Local')}
        />
      )}
      {showVersus && (
        <VersusScreen
          player1Name={player1Name}
          player2Name={player2Name}
          player1Nation={player1Nation}
          player2Nation={player2Nation}
        />
      )}
    </>
  )
}

export default LocalMode
