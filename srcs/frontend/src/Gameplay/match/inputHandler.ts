// Gestion clavier : touches « held » (mouvement / saut) et « pulses » (tir, dash).
// Un pulse est consommé exactement 1 frame, même si la touche est tenue.

export interface Keys {
  // Joueur 1 : ADW + G (tir) + double-tap A/D (dash)
  a: boolean
  d: boolean
  w: boolean
  g: boolean
  p1DashLeft: boolean
  p1DashRight: boolean

  // Joueur 2 : flèches + M (tir) + double-tap ← / → (dash)
  ArrowLeft: boolean
  ArrowRight: boolean
  ArrowUp: boolean
  m: boolean
  p2DashLeft: boolean
  p2DashRight: boolean
}

const DOUBLE_TAP_WINDOW_MS = 260

export function createInputHandler() {
  const keys: Keys = {
    a: false, d: false, w: false, g: false,
    p1DashLeft: false, p1DashRight: false,
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, m: false,
    p2DashLeft: false, p2DashRight: false,
  }

  // Pulses armés par les keydown, transférés dans `keys` une seule frame.
  const pulses = {
    shoot1: false, shoot2: false,
    dashP1Left: false, dashP1Right: false,
    dashP2Left: false, dashP2Right: false,
  }
  const lastTapAt = { p1Left: 0, p1Right: 0, p2Left: 0, p2Right: 0 }

  // Détecte un double-appui dans la fenêtre temporelle et arme le dash correspondant.
  function detectDoubleTap(side: keyof typeof lastTapAt, dashKey: keyof typeof pulses, now: number): void {
    if (now - lastTapAt[side] <= DOUBLE_TAP_WINDOW_MS) pulses[dashKey] = true
    lastTapAt[side] = now
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    const now = performance.now()

    if (k === 'a') keys.a = true
    if (k === 'd') keys.d = true
    if (k === 'w') keys.w = true
    if (e.key === 'ArrowLeft') keys.ArrowLeft = true
    if (e.key === 'ArrowRight') keys.ArrowRight = true
    if (e.key === 'ArrowUp') keys.ArrowUp = true

    if (e.repeat) return

    if (k === 'a') detectDoubleTap('p1Left', 'dashP1Left', now)
    if (k === 'd') detectDoubleTap('p1Right', 'dashP1Right', now)
    if (e.key === 'ArrowLeft') detectDoubleTap('p2Left', 'dashP2Left', now)
    if (e.key === 'ArrowRight') detectDoubleTap('p2Right', 'dashP2Right', now)
    if (k === 'g') pulses.shoot1 = true
    if (k === 'm') pulses.shoot2 = true
  }

  const onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'a') keys.a = false
    if (k === 'd') keys.d = false
    if (k === 'w') keys.w = false
    if (e.key === 'ArrowLeft') keys.ArrowLeft = false
    if (e.key === 'ArrowRight') keys.ArrowRight = false
    if (e.key === 'ArrowUp') keys.ArrowUp = false
  }

  // À appeler une fois par frame avant updateGame : transfère les pulses dans
  // keys puis les remet à false, garantissant 1 seule frame d'activation.
  function consumePulses(): void {
    keys.g = pulses.shoot1
    keys.m = pulses.shoot2
    keys.p1DashLeft = pulses.dashP1Left
    keys.p1DashRight = pulses.dashP1Right
    keys.p2DashLeft = pulses.dashP2Left
    keys.p2DashRight = pulses.dashP2Right

    pulses.shoot1 = false
    pulses.shoot2 = false
    pulses.dashP1Left = false
    pulses.dashP1Right = false
    pulses.dashP2Left = false
    pulses.dashP2Right = false
  }

  return {
    keys,
    consumePulses,
    attach: () => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
    },
    detach: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
