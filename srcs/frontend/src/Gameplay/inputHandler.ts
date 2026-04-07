export interface Keys {
  // Joueur 1 : ADWG
  a: boolean
  d: boolean
  w: boolean
  g: boolean       // pulse : true pendant 1 frame seulement
  p1DashLeft: boolean   // pulse : true pendant 1 frame seulement
  p1DashRight: boolean  // pulse : true pendant 1 frame seulement

  // Joueur 2 : flèches + M
  ArrowLeft: boolean
  ArrowRight: boolean
  ArrowUp: boolean
  m: boolean       // pulse : true pendant 1 frame seulement
  p2DashLeft: boolean   // pulse : true pendant 1 frame seulement
  p2DashRight: boolean  // pulse : true pendant 1 frame seulement
}

export function createInputHandler(): { keys: Keys; consumePulses: () => void; attach: () => void; detach: () => void } {
  const keys: Keys = {
    a: false, d: false, w: false, g: false,
    p1DashLeft: false, p1DashRight: false,
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, m: false,
    p2DashLeft: false, p2DashRight: false,
  }

  // Drapeaux internes "appui détecté depuis le dernier frame"
  let gPulse = false
  let mPulse = false
  const dashPulses = { p1Left: false, p1Right: false, p2Left: false, p2Right: false }

  const DOUBLE_TAP_WINDOW_MS = 260
  const lastTapAt = { p1Left: 0, p1Right: 0, p2Left: 0, p2Right: 0 }

  // Détecte un double-appui dans une petite fenêtre temporelle et arme le dash.
  function armDashPulse(key: keyof typeof dashPulses, now: number): void {
    if (now - lastTapAt[key] <= DOUBLE_TAP_WINDOW_MS) dashPulses[key] = true
    lastTapAt[key] = now
  }

  function handleTap(isPressed: boolean, key: keyof typeof dashPulses, now: number): void {
    if (isPressed) armDashPulse(key, now)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const now = performance.now()

    if (e.key === 'a' || e.key === 'A') keys.a = true
    if (e.key === 'd' || e.key === 'D') keys.d = true
    if (e.key === 'w' || e.key === 'W') keys.w = true
    if (e.key === 'ArrowLeft')  keys.ArrowLeft = true
    if (e.key === 'ArrowRight') keys.ArrowRight = true
    if (e.key === 'ArrowUp')    keys.ArrowUp = true

    handleTap(!e.repeat && (e.key === 'a' || e.key === 'A'), 'p1Left', now)
    handleTap(!e.repeat && (e.key === 'd' || e.key === 'D'), 'p1Right', now)
    handleTap(!e.repeat && e.key === 'ArrowLeft', 'p2Left', now)
    handleTap(!e.repeat && e.key === 'ArrowRight', 'p2Right', now)

    // Pour G et M : on arme le pulse (ignoré si déjà armé = repeat OS)
    if ((e.key === 'g' || e.key === 'G') && !e.repeat) gPulse = true
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) mPulse = true
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') keys.a = false
    if (e.key === 'd' || e.key === 'D') keys.d = false
    if (e.key === 'w' || e.key === 'W') keys.w = false
    if (e.key === 'ArrowLeft')  keys.ArrowLeft = false
    if (e.key === 'ArrowRight') keys.ArrowRight = false
    if (e.key === 'ArrowUp')    keys.ArrowUp = false
    // G et M n'ont pas de keyUp à gérer (ce sont des pulses)
  }

  /**
   * À appeler UNE FOIS par frame dans la game loop, AVANT updateGame.
    * Transfère les pulses (tir + dash) dans keys, puis les remet à false.
   * Ainsi tryShoot voit wantShoot=true exactement 1 frame par appui.
   */
  function consumePulses(): void {
    keys.g = gPulse
    keys.m = mPulse
    keys.p1DashLeft = dashPulses.p1Left
    keys.p1DashRight = dashPulses.p1Right
    keys.p2DashLeft = dashPulses.p2Left
    keys.p2DashRight = dashPulses.p2Right

    gPulse = false
    mPulse = false
    dashPulses.p1Left = false
    dashPulses.p1Right = false
    dashPulses.p2Left = false
    dashPulses.p2Right = false
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