/**
 * Configuration centralisée pour la taille des cages (buts).
 * Modifiez GOAL_BASE_HEIGHT ou GOAL_BASE_INNER_WIDTH pour adapter automatiquement :
 * - Les dimensions physiques de la cage
 * - Les visuels du PNG (positionnement, taille)
 * - Les hitbox et collisions
 * - Tous les calculs de géométrie dépendants
 */

// ===== VALEURS CENTRALES À MODIFIER =====
// Hauteur totale de la cage (en pixels, incluant la barre transversale) - CHANGE CETTE VALEUR POUR ADAPTER TOUT
export const GOAL_BASE_HEIGHT = 260

// Largeur intérieure de l'ouverture de la cage (en pixels)
export const GOAL_BASE_INNER_WIDTH = 70

// Décalage vertical de la cage (pixels) - CHANGE CETTE VALEUR POUR MONTER/DESCENDRE LES CAGES
// Positif = plus haut, Négatif = plus bas
export const GOAL_VERTICAL_OFFSET = 130

// ===== DÉRIVÉS AUTOMATIQUES =====
// Position Y du haut de la barre (avec décalage vertical)
export const calculateGoalCrossbarY = (groundY: number): number =>
  groundY - GOAL_BASE_HEIGHT + GOAL_VERTICAL_OFFSET

// ===== HELPERS =====
/**
 * Exporte la configuration actuelle pour debugging/inspection
 */
export const getGoalConfig = () => ({
  baseHeight: GOAL_BASE_HEIGHT,
  baseInnerWidth: GOAL_BASE_INNER_WIDTH,
  verticalOffset: GOAL_VERTICAL_OFFSET,
})
