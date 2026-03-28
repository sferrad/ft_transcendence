export interface Keys {
    //joueur1 adw + g pour tirer
    a: boolean
    d: boolean
    w: boolean
    g: boolean

    //Joueur2 fleches + m pour tirer
    ArrowLeft: boolean
    ArrowRight: boolean
    ArrowUp: boolean
    m: boolean
}

export function createInputHandler(): { keys: Keys; attach: () => void; detach: () => void } {
  const keys: Keys = { a: false, d: false, w: false, g: false, ArrowLeft: false, ArrowRight: false, ArrowUp: false, m: false }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') keys.a = true
    if (e.key === 'd' || e.key === 'D') keys.d = true
    if (e.key === 'w' || e.key === 'W') keys.w = true
    if (e.key === 'g' || e.key === 'G') keys.g = true
    if (e.key === 'ArrowLeft')  keys.ArrowLeft = true
    if (e.key === 'ArrowRight') keys.ArrowRight = true
    if (e.key === 'ArrowUp')    keys.ArrowUp = true
    if (e.key === 'm' || e.key === 'M') keys.m = true
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') keys.a = false
    if (e.key === 'd' || e.key === 'D') keys.d = false
    if (e.key === 'w' || e.key === 'W') keys.w = false
    if (e.key === 'g' || e.key === 'G') keys.g = false
    if (e.key === 'ArrowLeft')  keys.ArrowLeft = false
    if (e.key === 'ArrowRight') keys.ArrowRight = false
    if (e.key === 'ArrowUp')    keys.ArrowUp = false
    if (e.key === 'm' || e.key === 'M') keys.m = false
  }

  return {
    keys,
    attach: () => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
    },
    detach: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }
}