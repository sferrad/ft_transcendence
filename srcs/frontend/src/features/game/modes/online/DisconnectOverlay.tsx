import { useTranslation } from 'react-i18next'

interface DisconnectOverlayProps {
  visible: boolean
  disconnectSecs: number | null
}

export function DisconnectOverlay({ visible, disconnectSecs }: DisconnectOverlayProps) {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 bg-gray-900/95 border-2 border-red-500/60 rounded-xl px-10 py-8 shadow-2xl text-center">
        <div className="font-arcade text-red-400 text-2xl">{t('Opponent disconnected')}</div>
        {disconnectSecs !== null && (
          <div className="font-arcade text-white text-4xl">{disconnectSecs}s</div>
        )}
        <div className="font-arcade text-gray-300 text-base">{t('disconnect.countdown_hint')}</div>
      </div>
    </>
  )
}
