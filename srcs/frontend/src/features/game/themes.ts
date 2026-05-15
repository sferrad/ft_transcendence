import type { CSSProperties } from 'react'

export interface FieldTheme {
  grassColor: string
  stripeColor: string
  lineColor: string
}

export interface ThemeConfig {
  id: string
  nameKey: string
  field: FieldTheme
  sceneBackground: CSSProperties
  scoreBand: { backgroundColor: string; borderColor: string }
  ballFilter?: string
  ballGlow?: string
  goalFilter?: string
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'classic',
    nameKey: 'theme.classic',
    field: { grassColor: '#3b7b10', stripeColor: 'rgba(21,61,10,0.14)', lineColor: '#ffffff' },
    sceneBackground: {
      backgroundColor: '#111',
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.18),rgba(0,0,0,0.18)),url(/assets/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center -450px',
    },
    scoreBand: { backgroundColor: '#000', borderColor: '#333' },
  },
  {
    id: 'neon',
    nameKey: 'theme.neon',
    field: { grassColor: '#020d14', stripeColor: 'rgba(0,255,200,0.05)', lineColor: '#00ffe0' },
    sceneBackground: {
      backgroundImage: 'radial-gradient(ellipse at 50% 60%, #001a2e 0%, #010810 70%)',
    },
    scoreBand: { backgroundColor: '#020d14', borderColor: '#00ffe0' },
    ballFilter: 'hue-rotate(170deg) brightness(2) saturate(3)',
    ballGlow: '0 0 12px 4px #00ffe0, 0 0 24px 8px #00ffe066',
    goalFilter: 'hue-rotate(170deg) brightness(1.5) saturate(2) drop-shadow(0 0 8px #00ffe066)',
  },
]

export const THEME_DEFAULT = THEMES[0]
