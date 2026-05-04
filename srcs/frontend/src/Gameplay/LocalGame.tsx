import { useSearchParams } from 'react-router-dom'
import { GameModeView } from './GameModeView'

const LocalGame = () => {
  const [searchParams] = useSearchParams()

  const player1Name = searchParams.get('player1') || 'Joueur 1'
  const player2Name = searchParams.get('player2') || 'Joueur 2'
  const player1Nation = searchParams.get('p1Nation') || 'Algeria'
  const player2Nation = searchParams.get('p2Nation') || 'Algeria'

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

export default LocalGame