/**
 * Performant Lightweight Canvas Confetti
 * Renders directly on a temporary overlay HTML5 Canvas without DOM bloat or layout shifts.
 */

export function fireConfetti({
  particleCount = 60,
  spread = 70,
  origin = { x: 0.5, y: 0.6 },
  colors = ['#4F46E5', '#0284C7', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6']
} = {}) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '99999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr

  const particles = []
  const startX = origin.x * canvas.width
  const startY = origin.y * canvas.height

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI / 180) * (270 + (Math.random() - 0.5) * spread)
    const velocity = (Math.random() * 8 + 6) * dpr
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * 2 * dpr,
      vy: Math.sin(angle) * velocity,
      w: (Math.random() * 8 + 6) * dpr,
      h: (Math.random() * 5 + 4) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.28 * dpr,
      drag: 0.985
    })
  }

  let animId
  const startTime = performance.now()
  const duration = 2400

  function render(now) {
    const elapsed = now - startTime
    if (elapsed > duration || particles.length === 0) {
      cancelAnimationFrame(animId)
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const progress = elapsed / duration
    const globalFade = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.vx *= p.drag
      p.vy *= p.drag
      p.rotation += p.rotationSpeed

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = Math.max(0, p.opacity * globalFade)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    })

    animId = requestAnimationFrame(render)
  }

  animId = requestAnimationFrame(render)
}

/**
 * High-celebration dual cannon for lesson completion
 */
export function fireLessonCompleteConfetti() {
  fireConfetti({
    particleCount: 45,
    spread: 60,
    origin: { x: 0.2, y: 0.7 }
  })
  setTimeout(() => {
    fireConfetti({
      particleCount: 45,
      spread: 60,
      origin: { x: 0.8, y: 0.7 }
    })
  }, 150)
  setTimeout(() => {
    fireConfetti({
      particleCount: 50,
      spread: 100,
      origin: { x: 0.5, y: 0.5 }
    })
  }, 350)
}
