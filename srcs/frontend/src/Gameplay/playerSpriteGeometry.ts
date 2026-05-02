export const PLAYER_SPRITE_FRAME_RATIO = 2.35
export const PLAYER_SPRITE_ZOOM = 2.2
export const PLAYER_SPRITE_NATIVE_WIDTH = 1408
export const PLAYER_SPRITE_NATIVE_HEIGHT = 768
export const PLAYER_SPRITE_ASPECT_RATIO = PLAYER_SPRITE_NATIVE_WIDTH / PLAYER_SPRITE_NATIVE_HEIGHT
export const PLAYER_SPRITE_TOP_OFFSET = 2.4
export const PLAYER_SHOE_SIZE_RATIO = 4
export const PLAYER_SHOE_TOP_RATIO = 0.18

export interface PlayerShoeBounds {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
  rotation: number
  mirrored: boolean
}

export interface PlayerHeadBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PlayerVisualLayout {
  head: PlayerHeadBounds
  shoe: PlayerShoeBounds
  mirrored: boolean
}

export function getPlayerSpriteFrameSize(radius: number): number {
  return radius * PLAYER_SPRITE_FRAME_RATIO
}

export function getPlayerSpriteBounds(x: number, y: number, radius: number): {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
} {
  const frameSize = getPlayerSpriteFrameSize(radius)
  const baseHeight = frameSize / PLAYER_SPRITE_ASPECT_RATIO
  const width = frameSize * PLAYER_SPRITE_ZOOM
  const height = baseHeight * PLAYER_SPRITE_ZOOM
  const centerX = x
  const centerY = y - radius * PLAYER_SPRITE_TOP_OFFSET + frameSize / 2

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
    width,
    height,
  }
}

export function getPlayerHeadBounds(x: number, y: number, radius: number): PlayerHeadBounds {
  const frameSize = getPlayerSpriteFrameSize(radius)
  const width = frameSize * PLAYER_SPRITE_ZOOM * 0.92
  const height = (frameSize / PLAYER_SPRITE_ASPECT_RATIO) * PLAYER_SPRITE_ZOOM * 0.92
  const centerX = x
  const centerY = y - radius * PLAYER_SPRITE_TOP_OFFSET + frameSize / 2

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
  }
}

export function getPlayerVisualLayout(
  x: number,
  y: number,
  radius: number,
  isKicking: boolean,
  facingRight: boolean,
): PlayerVisualLayout {
  const head = getPlayerHeadBounds(x, y, radius)
  const shoe = getPlayerShoeBounds(x, y, radius, isKicking, facingRight)

  return {
    head,
    shoe,
    mirrored: !facingRight,
  }
}

export function getPlayerShoeBounds(
  x: number,
  y: number,
  radius: number,
  isKicking: boolean,
  facingRight: boolean,
): PlayerShoeBounds {
  const baseAngleRad = isKicking ? -0.55 : 0
  const footPivotX = x + radius * 0.2
  const footPivotY = y + radius
  const footDistance = radius * (isKicking ? 0.94 : 0.82)
  const footCenterX = footPivotX + Math.cos(baseAngleRad) * footDistance
  const footCenterY = footPivotY + Math.sin(baseAngleRad) * footDistance
  const width = Math.max(26, radius * PLAYER_SHOE_SIZE_RATIO)
  const height = width
  const left = footCenterX - width / 2
  const top = footCenterY - height * PLAYER_SHOE_TOP_RATIO

  if (facingRight) {
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      centerX: left + width / 2,
      centerY: top + height / 2,
      width,
      height,
      rotation: baseAngleRad,
      mirrored: false,
    }
  }

  const mirroredLeft = 2 * x - (left + width)
  return {
    left: mirroredLeft,
    top,
    right: mirroredLeft + width,
    bottom: top + height,
    centerX: mirroredLeft + width / 2,
    centerY: top + height / 2,
    width,
    height,
    rotation: -baseAngleRad,
    mirrored: true,
  }
}