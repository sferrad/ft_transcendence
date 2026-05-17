import { getSocket } from '../hooks/socketSingleton'

export function emitForfeit(gameRoomId: string, role: string): void {
  const sock = getSocket()
  if (!sock) return
  const fire = () => {
    sock.emit('game.join', { game_room_id: gameRoomId, role })
    setTimeout(() => sock.emit('game.action', { type: 'forfeit' }), 300)
  }
  if (sock.connected) fire()
  else sock.once('connect', fire)
}
