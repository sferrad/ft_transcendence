/**
 * Configuration centralisée pour la taille et les propriétés physiques des joueurs.
 * Modifiez PLAYER_BASE_RADIUS pour adapter automatiquement :
 * - Les visuels du personnage (sprite, dimensions)
 * - Les hitbox et collisions
 * - Le placement sur le sol physique
 * - Tous les calculs de géométrie dépendants
 */

// ===== VALEUR CENTRALE À MODIFIER =====
// Rayon de collision du joueur (en pixels)
// C'est la valeur unique à changer pour adapter la taille globale
export const PLAYER_BASE_RADIUS = 20

// ===== DÉRIVÉS AUTOMATIQUES =====
// Position Y où le joueur se tient au sol (recalculée à partir du rayon)
export const calculatePlayerFloorY = (groundY: number): number => groundY - PLAYER_BASE_RADIUS

// Vitesse du joueur (adaptée à la taille)
export const calculatePlayerSpeed = (): number => 7

// Portée du tir (adapté à la taille du joueur)
export const calculateKickRange = (): number => 25

// ===== LIMITES D'ADAPTATION PHYSIQUE =====
// Taille minimale du chaussure (pour éviter les hitbox trop petites)
export const PLAYER_SHOE_MIN_SIZE = 26

// Taille maximale du rayon (limite pour éviter des débordements)
export const PLAYER_RADIUS_MAX = 50

// Nombre de frames de l'animation de coup de pied (utilisé pour calculer la progression)
export const KICK_ANIM_FRAMES = 5

// ===== HELPERS =====
/**
 * Valide et retourne le rayon du joueur (avec limites)
 */
export const getValidPlayerRadius = (radius: number = PLAYER_BASE_RADIUS): number => {
  return Math.max(15, Math.min(PLAYER_RADIUS_MAX, radius))
}

/**
 * Exporte la configuration actuelle pour debugging/inspection
 */
export const getPlayerConfig = () => ({
  baseRadius: PLAYER_BASE_RADIUS,
  speed: calculatePlayerSpeed(),
  kickRange: calculateKickRange(),
  shoeMinSize: PLAYER_SHOE_MIN_SIZE,
  radiusMax: PLAYER_RADIUS_MAX,
})
