import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { MatchView } from '../match/MatchView'
import { VersusScreen } from '../components/VersusScreen'
import { getCurrentUser } from '../../utils/auth'
import { VERSUS_SCREEN_DURATION_MS } from '../engine/constants'

interface SoloModeState {
  playerNation?: string
  aiNation?: string
}

const SoloMode = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as SoloModeState | null) ?? null

  const user = getCurrentUser()
  const playerName = user?.username || searchParams.get('playerName') || 'Joueur'
  const aiName = searchParams.get('player2') || searchParams.get('ai') || 'CPU'
  const playerNation = state?.playerNation || searchParams.get('player') || 'Algeria'
  const aiNation = state?.aiNation || searchParams.get('ai') || 'Algeria'

  const [showVersus, setShowVersus] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowVersus(false), VERSUS_SCREEN_DURATION_MS)
    return () => clearTimeout(t)
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
        paused={showVersus}
      />
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
