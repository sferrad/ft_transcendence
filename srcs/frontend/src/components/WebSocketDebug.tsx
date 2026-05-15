import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Composant de debug pour vérifier l'état de la connexion WebSocket
 * À utiliser temporairement en développement
 */
export function WebSocketDebug() {
  const { connected, error } = useWebSocket();

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      color: connected ? '#00ff00' : '#ff6b6b',
      padding: '10px 15px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px',
      wordBreak: 'break-word',
    }}>
      <div>WebSocket: {connected ? '✓ Connected' : '✗ Disconnected'}</div>
      {error && (
        <div style={{ color: '#ff6b6b', marginTop: '5px' }}>
          Error: {error.message}
        </div>
      )}
      <div style={{ fontSize: '10px', marginTop: '5px', color: '#aaa' }}>
        Token: {localStorage.getItem('access_token') ? '✓ Present' : '✗ Missing'}
      </div>
    </div>
  );
}
