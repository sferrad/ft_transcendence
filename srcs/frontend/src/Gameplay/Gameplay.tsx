import { useSearchParams } from 'react-router-dom'
import { GameModeView } from './GameModeView'
import { getCurrentUser } from '../utils/auth'

const Gameplay = () => {
  const [searchParams] = useSearchParams()

  const user = getCurrentUser()
  const playerName = user?.username || searchParams.get('playerName') || 'Joueur'
  const aiName = searchParams.get('player2') || searchParams.get('ai') || 'CPU'
  const playerNation = searchParams.get('player') || 'Algeria'
  const aiNation = searchParams.get('ai') || 'Algeria'

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

export default Gameplay