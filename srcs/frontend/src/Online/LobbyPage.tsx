import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCurrentUser } from '../utils/auth'
import { CHARACTERS } from '../characters'
import { joinMatchmaking, getMatchmakingStatus, leaveMatchmaking, type MatchmakingResult } from '../Gameplay/api/matchmaking'

type Phase = 'idle' | 'searching' | 'error'
type GameMode = 'ranked' | 'friendly'

// Règles fixes imposées — les joueurs ne peuvent pas les modifier.
const ONLINE_SCORE = 5
const ONLINE_DURATION = 120 // 2 min

const arcadeBase =
  'hb-tap font-arcade border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] cursor-pointer no-underline inline-flex items-center justify-center transition-transform duration-100 active:translate-y-0.5'

function NationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const idx = CHARACTERS.indexOf(value as (typeof CHARACTERS)[number])
  const prev = () => onChange(CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length])
  const next = () => onChange(CHARACTERS[(idx + 1) % CHARACTERS.length])
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className={`${arcadeBase} px-3 py-1 text-white bg-green-600 hover:bg-green-500 text-xl`}>◀</button>
      <div className="flex flex-col items-center gap-1 w-28">
        <img src={`/assets/perso/faces/${value.toLowerCase()}-face.png`} alt={value} className="w-16 h-16 object-contain" />
        <span className="font-arcade text-white text-sm">{value}</span>
      </div>
      <button onClick={next} className={`${arcadeBase} px-3 py-1 text-white bg-green-600 hover:bg-green-500 text-xl`}>▶</button>
    </div>
  )
}

export default function LobbyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = getCurrentUser()

  const [gameMode, setGameMode] = useState<GameMode>('ranked')
  const [nation, setNation] = useState<string>('Algeria')
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dots, setDots] = useState('.')
  const pollRef = useRef<number>(0)
  const cancelledRef = useRef(false)

  const playerName = user?.username || 'Player'

  useEffect(() => {
    if (phase !== 'searching') return
    const id = window.setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => clearInterval(id)
  }, [phase])

  const handleMatched = useCallback((result: MatchmakingResult) => {
    navigate('/online-gameplay', { state: { ...result, myNation: nation } })
  }, [navigate, nation])

  const handleFindMatch = async () => {
    if (!user?.accessToken) { navigate('/login'); return }
    cancelledRef.current = false
    setPhase('searching')
    setErrorMsg('')
    const isRanked = gameMode === 'ranked'
    try {
      const result = await joinMatchmaking({
        playerName,
        playerNation: nation,
        winningScore: ONLINE_SCORE,
        duration: ONLINE_DURATION,
        ranked: isRanked,
      })
      if (cancelledRef.current) return
      if (result.status === 'matched') { handleMatched(result); return }
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await getMatchmakingStatus()
          if (cancelledRef.current) { clearInterval(pollRef.current); return }
          if (status.status === 'matched') {
            clearInterval(pollRef.current)
            handleMatched(status)
          }
        } catch {
          clearInterval(pollRef.current)
          setPhase('error')
          setErrorMsg('Connection error')
        }
      }, 2000)
    } catch {
      setPhase('error')
      setErrorMsg('Failed to reach server')
    }
  }

  const handleCancel = async () => {
    cancelledRef.current = true
    clearInterval(pollRef.current)
    setPhase('idle')
    try { await leaveMatchmaking() } catch { /* best-effort */ }
  }

  useEffect(() => () => { clearInterval(pollRef.current) }, [])

  return (
    <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgSoloselect.jpg')] bg-cover bg-center bg-no-repeat overflow-auto flex flex-col">
      <button
        onClick={() => { handleCancel(); navigate('/') }}
        className={`absolute top-4 left-4 ${arcadeBase} px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 text-lg`}
      >
        {t('Back')}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="font-arcade text-white text-4xl drop-shadow-[0_3px_0_rgba(0,0,0,0.8)]">
          {t('Online')}
        </h1>

        {phase !== 'searching' && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2 bg-black/40 rounded-xl p-3 border-2 border-white/30">
              <button
                onClick={() => setGameMode('ranked')}
                className={`${arcadeBase} px-6 py-2 text-lg ${gameMode === 'ranked' ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
              >
                {t('Ranked')}
              </button>
              <button
                onClick={() => setGameMode('friendly')}
                className={`${arcadeBase} px-6 py-2 text-lg ${gameMode === 'friendly' ? 'bg-green-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
              >
                {t('Friendly')}
              </button>
            </div>

            {/* Règles fixes du mode sélectionné */}
            <p className="font-arcade text-white/60 text-sm">
              {gameMode === 'ranked' ? t('ranked.info') : t('friendly.info')}
            </p>

            {/* Player info */}
            <div className="flex flex-col items-center gap-4 bg-black/40 rounded-xl p-6 border-2 border-white/30">
              <span className="font-arcade text-yellow-300 text-2xl">{playerName}</span>
              <NationPicker value={nation} onChange={setNation} />
            </div>

            {phase === 'error' && (
              <p className="font-arcade text-red-400 text-base">{errorMsg}</p>
            )}

            <button
              onClick={handleFindMatch}
              className={`${arcadeBase} px-10 py-4 text-2xl bg-yellow-400 text-black hover:bg-yellow-300`}
            >
              {t('Find Match')}
            </button>
          </>
        )}

        {phase === 'searching' && (
          <div className="flex flex-col items-center gap-6 bg-black/50 rounded-xl p-10 border-2 border-yellow-400/60">
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-arcade text-white text-2xl">
              {t('Searching')}{dots}
            </p>
            <p className="font-arcade text-white/60 text-base">{playerName}</p>
            <button
              onClick={handleCancel}
              className={`${arcadeBase} px-8 py-3 text-lg bg-red-600 text-white hover:bg-red-500`}
            >
              {t('Cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
