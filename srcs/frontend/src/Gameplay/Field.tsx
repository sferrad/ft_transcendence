import { CANVAS_WIDTH, CANVAS_HEIGHT } from './gameEngine'

const GROUND_Y = CANVAS_HEIGHT * 0.7
const FIELD_WIDTH = 1800
const FIELD_HEIGHT = 279

// Position field.png so its top part aligns with GROUND_Y, pushing it down
const FIELD_TOP = GROUND_Y + FIELD_HEIGHT / 3

export function Field(): JSX.Element {
  return (
    <img
      src="/assets/field.png"
      alt="Football Field"
      style={{
        position: 'absolute',
        left: '50%',
        top: `${FIELD_TOP}px`,
        transform: 'translateX(-50%) translateY(-50%)',
        width: `${FIELD_WIDTH}px`,
        height: `${FIELD_HEIGHT}px`,
        objectFit: 'contain',
        pointerEvents: 'none',
      }}
    />
  )
}
