import { RejoinOverlay } from './overlays/RejoinOverlay'
import { InviteReadyOverlay } from './overlays/InviteReadyOverlay'
import { ToastContainer } from './overlays/ToastContainer'

export default function GlobalOverlays() {
  return (
    <>
      <RejoinOverlay />
      <InviteReadyOverlay />
      <ToastContainer />
    </>
  )
}
