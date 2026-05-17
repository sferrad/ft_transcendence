// PRNG Mulberry32 — remplace Math.random() pour un jeu déterministe.
// Même seed → même séquence de nombres sur tous les clients.
// Le seed doit venir du serveur pour les parties online.

let _state = 0

export function seedRng(seed: number): void {
  _state = seed >>> 0
}

export function rng(): number {
  _state = (_state + 0x6D2B79F5) >>> 0
  let z = Math.imul(_state ^ (_state >>> 15), 1 | _state)
  z = Math.imul(z ^ (z >>> 7), 61 | z) ^ z
  return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
}
