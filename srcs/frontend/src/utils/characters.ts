export const CHARACTERS = [
  "Algeria", "Morocco", "Tunisia", "France",
  "Italy", "Nigeria", "America", "China",
] as const

export type CharacterName = typeof CHARACTERS[number]

export const faceSrc = (name: string) =>
  `/assets/perso/faces/${name.toLowerCase()}-face.png`

export const flagSrc = (name: string) =>
  `/assets/perso/flags/${name.toLowerCase()}-flag.png`
