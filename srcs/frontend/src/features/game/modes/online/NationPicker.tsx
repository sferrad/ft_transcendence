import { CHARACTERS } from '../../../../utils/characters'
import { ARCADE_BASE } from './constants'

interface NationPickerProps {
  value: string
  onChange: (v: string) => void
}

export function NationPicker({ value, onChange }: NationPickerProps) {
  const idx = CHARACTERS.indexOf(value as (typeof CHARACTERS)[number])
  const prev = () => onChange(CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length])
  const next = () => onChange(CHARACTERS[(idx + 1) % CHARACTERS.length])
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className={`${ARCADE_BASE} px-3 py-1 text-white bg-green-600 hover:bg-green-500 text-xl`}>◀</button>
      <div className="flex flex-col items-center gap-1 w-28">
        <img src={`/assets/perso/faces/${value.toLowerCase()}-face.png`} alt={value} className="w-16 h-16 object-contain" />
        <span className="font-arcade text-white text-base">{value}</span>
      </div>
      <button onClick={next} className={`${ARCADE_BASE} px-3 py-1 text-white bg-green-600 hover:bg-green-500 text-xl`}>▶</button>
    </div>
  )
}
