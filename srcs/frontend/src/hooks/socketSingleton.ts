/**
 * Socket.IO singleton.
 *
 * Toute l'application partage UNE SEULE connexion WebSocket. Avant, chaque
 * composant (OnlineMode, ChatButton, GlobalNotifications) créait son propre
 * socket via `io()`. Résultat : plusieurs sockets pour le même user_id, des
 * `disconnect` concurrents côté backend, et un comportement non-déterministe
 * du grace period / popup de reconnexion.
 *
 * Avec ce singleton :
 *  - le socket reste connecté tant que l'utilisateur est loggé,
 *  - naviguer entre les pages ne déconnecte rien,
 *  - le backend voit exactement une connexion par user → le `disconnect`
 *    (fermeture d'onglet, perte réseau) est fiable et sans ambiguïté.
 */
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null
let currentToken: string | null = null

function normalizeSocketUrl(rawUrl: string): string {
  const withoutSocketPath = rawUrl
    .replace(/\/ws\/socket\.io\/?$/, '')
    .replace(/\/ws\/?$/, '')
  if (withoutSocketPath.startsWith('ws://')) {
    return `http://${withoutSocketPath.slice('ws://'.length)}`
  }
  if (withoutSocketPath.startsWith('wss://')) {
    return `https://${withoutSocketPath.slice('wss://'.length)}`
  }
  return withoutSocketPath
}

function socketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return normalizeSocketUrl(envUrl)
  return typeof window === 'undefined' ? '' : window.location.origin
}

/**
 * Retourne le socket partagé, en le créant si besoin. Si le token a changé
 * (re-login), recrée le socket avec le nouveau token.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('access_token')
  if (!token) {
    // Plus de session → on coupe proprement.
    if (socket) {
      socket.disconnect()
      socket = null
      currentToken = null
    }
    return null
  }

  // Token changé (autre compte) → on recrée le socket.
  if (socket && currentToken !== token) {
    socket.disconnect()
    socket = null
  }

  if (!socket) {
    currentToken = token
    socket = io(socketUrl(), {
      path: '/ws/socket.io',
      auth: {
        token,
        user_id: localStorage.getItem('user_id') || '',
        username: localStorage.getItem('username') || '',
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: Infinity,
    })
  }

  return socket
}

/** Force la fermeture du socket partagé (logout). */
export function closeSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    currentToken = null
  }
}
