import { useLocation, useSearchParams } from 'react-router-dom'
import { GameModeView } from './GameModeView'
import { getCurrentUser } from '../utils/auth'
import { t } from 'i18next'

interface SoloModeState {
  playerNation?: string
  aiNation?: string
}

const SoloMode = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as SoloModeState | null) ?? null

  const user = getCurrentUser()
  const playerName = user?.username || searchParams.get('playerName') || t('Player')
  const aiName = searchParams.get('player2') || searchParams.get('ai') || t('Bot')
  const playerNation = state?.playerNation || searchParams.get('player') || t('Algeria')
  const aiNation = state?.aiNation || searchParams.get('ai') || t('Algeria')

  return (
    <GameModeView
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