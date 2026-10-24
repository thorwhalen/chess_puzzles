// Solve celebration: confetti on a canvas and a synthesized chime (no audio assets).
// Both are best-effort: a browser without canvas or WebAudio just skips them.
const COLORS = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ff8c42']
const PIECES = 90
const DURATION_MS = 1900
const GRAVITY = 0.28

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Burst confetti from the lower middle of `canvas`; returns a cancel function. */
export function launchConfetti(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = window.devicePixelRatio || 1
  const w = (canvas.width = window.innerWidth * dpr)
  const h = (canvas.height = window.innerHeight * dpr)
  const bits = Array.from({ length: PIECES }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
    const speed = (9 + Math.random() * 9) * dpr
    return {
      x: w / 2, y: h * 0.6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: (6 + Math.random() * 6) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
  })
  const t0 = performance.now()
  let raf = 0
  const frame = (now: number) => {
    const age = now - t0
    ctx.clearRect(0, 0, w, h)
    if (age > DURATION_MS) return
    ctx.globalAlpha = Math.min(1, (DURATION_MS - age) / 500)
    for (const b of bits) {
      b.vy += GRAVITY * dpr
      b.vx *= 0.99
      b.x += b.vx
      b.y += b.vy
      b.rot += b.vr
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)
      ctx.fillStyle = b.color
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2)
      ctx.restore()
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    ctx.clearRect(0, 0, w, h)
  }
}

let audio: AudioContext | undefined
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
const NOTE_S = 0.11

/** A short rising major arpeggio. */
export function playChime() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    const t0 = audio.currentTime + 0.02
    ARPEGGIO.forEach((freq, i) => {
      const osc = audio!.createOscillator()
      const gain = audio!.createGain()
      const t = t0 + i * NOTE_S
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === ARPEGGIO.length - 1 ? 0.5 : 0.22))
      osc.connect(gain).connect(audio!.destination)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  } catch {
    /* no WebAudio, or autoplay blocked: silence is fine */
  }
}
