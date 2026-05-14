import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'
const useWafHmr = apiProxyTarget.includes('waf') || process.env.VITE_HMR_CLIENT_PORT === '8443'

// Configuration Vite du frontend.
// L'objectif est de faire cohabiter deux modes de fonctionnement:
// - un mode developpement local avec proxy simple vers l'API gateway;
// - un mode expose derriere le WAF, avec HTTPS et HMR adapte au port publie.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Expose certaines variables d'environnement au code frontend compile.
    // On garde cette liste volontairement limitee afin de ne propager que ce qui
    // est necessaire au runtime navigateur.
    __VITE_WS_URL__: JSON.stringify(process.env.VITE_WS_URL || ''),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: process.env.VITE_HMR_HOST
      ? {
          // Si l'environnement fournit une configuration HMR explicite, on la
          // respecte en priorite pour coller au reseau ou au reverse proxy utilise.
          host: process.env.VITE_HMR_HOST,
          port: parseInt(process.env.VITE_HMR_PORT || '443'),
          clientPort: parseInt(process.env.VITE_HMR_CLIENT_PORT || process.env.VITE_HMR_PORT || '443'),
          protocol: process.env.VITE_HMR_PROTOCOL || 'wss',
        }
      : useWafHmr
        ? {
          // Lorsque le frontend est derriere le WAF, on publie un client HMR
          // compatible avec le HTTPS expose sur 8443.
            host: 'localhost',
          port: 3000,
            clientPort: 8443,
            protocol: 'wss',
          }
        : {
          // Mode developpement classique: HMR local en ws sans passage par le WAF.
            host: 'localhost',
            port: 3000,
            protocol: 'ws',
          },
    proxy: {
      // Toutes les requetes applicatives partent vers l'API gateway via le proxy
      // de Vite afin d'eviter de coder des URL absolues dans le frontend.
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      // Le canal temps reel suit la meme logique: Vite relaie le trafic WebSocket
      // vers l'API gateway pour garder une topologie simple en developpement.
      '/ws': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
