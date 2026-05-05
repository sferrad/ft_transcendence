import { useLocation, useSearchParams } from 'react-router-dom'
import { GameModeView } from './GameModeView'

interface LocalModeState {
  player1Name?: string
  player2Name?: string
  player1Nation?: string
  player2Nation?: string
}

const LocalMode = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state as LocalModeState | null) ?? null

  const player1Name = state?.player1Name || searchParams.get('player1') || 'Joueur 1'
  const player2Name = state?.player2Name || searchParams.get('player2') || 'Joueur 2'
  const player1Nation = state?.player1Nation || searchParams.get('p1Nation') || 'Algeria'
  const player2Nation = state?.player2Nation || searchParams.get('p2Nation') || 'Algeria'

  return (
    <GameModeView
      mode="local"
      player1Name={player1Name}
      player2Name={player2Name}
      player1Nation={player1Nation}
      player2Nation={player2Nation}
      backRoute="/local-select"
    />
  )
}

export default LocalMode