import { useLocation, useSearchParams } from 'react-router-dom'
import { MatchView } from '../match/MatchView'
import { getCurrentUser } from '../../utils/auth'

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

  return (
    <MatchView
      mode="solo"
      player1Name={playerName}
      player2Name={aiName}
      player1Nation={playerNation}
      player2Nation={aiNation}
      backRoute="/solo-select"
    />
  )
}

export default SoloMode