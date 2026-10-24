// Plays the solve celebration whenever `seq` increases (and the player has it switched on).
import { useEffect, useRef } from 'react'
import { launchConfetti, playChime, prefersReducedMotion } from './celebrate'

export function Confetti({ seq, enabled, sound }: { seq: number; enabled: boolean; sound: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef(seq) // a remount (coming back from the guide) must not replay an old solve
  useEffect(() => {
    if (seq === last.current) return
    last.current = seq
    if (!enabled) return
    if (sound) playChime()
    if (prefersReducedMotion() || !canvas.current) return
    return launchConfetti(canvas.current)
  }, [seq, enabled, sound])
  return <canvas ref={canvas} className="confetti" aria-hidden="true" />
}
