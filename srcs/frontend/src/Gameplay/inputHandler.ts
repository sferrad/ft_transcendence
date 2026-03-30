export interface Keys {
  // Joueur 1 : ADWG
  a: boolean
  d: boolean
  w: boolean
  g: boolean       // pulse : true pendant 1 frame seulement

  // Joueur 2 : flèches + M
  ArrowLeft: boolean
  ArrowRight: boolean
  ArrowUp: boolean
  m: boolean       // pulse : true pendant 1 frame seulement
}

export function createInputHandler(): { keys: Keys; consumePulses: () => void; attach: () => void; detach: () => void } {
  const keys: Keys = {
    a: false, d: false, w: false, g: false,
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, m: false,
  }

  // Drapeaux internes "appui détecté depuis le dernier frame"
  let gPulse = false
  let mPulse = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') keys.a = true
    if (e.key === 'd' || e.key === 'D') keys.d = true
    if (e.key === 'w' || e.key === 'W') keys.w = true
    if (e.key === 'ArrowLeft')  keys.ArrowLeft = true
    if (e.key === 'ArrowRight') keys.ArrowRight = true
    if (e.key === 'ArrowUp')    keys.ArrowUp = true

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
   * Transfère les pulses dans keys.g / keys.m, puis les remet à false.
   * Ainsi tryShoot voit wantShoot=true exactement 1 frame par appui.
   */
  function consumePulses(): void {
    keys.g = gPulse
    keys.m = mPulse
    gPulse = false
    mPulse = false
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