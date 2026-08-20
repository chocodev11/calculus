import React, { useEffect, useRef } from 'react'

/**
 * AlgorithmicBackground: Generative Vector Flow Field & Tangent Harmonic Waves
 * Computational aesthetic expressing calculus intuition (tangents, vector fields, harmonic integration).
 * Lightweight, GPU-friendly, 60fps, mouse/touch interactive.
 */
export function AlgorithmicBackground({
  className = '',
  opacity = 0.6,
  particleCount = 50,
  speed = 1.0,
  interactive = true
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animId
    let width = 0
    let height = 0
    let dpr = 1

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 140
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    // Palette: Academic Tactile (Euler Indigo, Tangent Cyan, Kinetic Amber, Vector Emerald)
    const colorPalette = [
      'rgba(79, 70, 229, 0.45)',  // Indigo
      'rgba(2, 132, 199, 0.45)',  // Cyan
      'rgba(16, 185, 129, 0.45)', // Emerald
      'rgba(245, 158, 11, 0.35)', // Amber
    ]

    // Create particles along harmonic curves
    const particles = []
    const count = Math.min(particleCount, Math.floor((width * height) / 12000))

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8 * speed,
        vy: (Math.random() - 0.5) * 0.8 * speed,
        size: Math.random() * 2.5 + 1.2,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        history: [],
        maxHistory: Math.floor(Math.random() * 8 + 6),
        frequency: Math.random() * 0.005 + 0.002,
        phase: Math.random() * Math.PI * 2
      })
    }

    let time = 0

    const render = () => {
      time += 0.008 * speed

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.1
      mouse.y += (mouse.targetY - mouse.y) * 0.1

      ctx.clearRect(0, 0, width, height)

      // Draw subtle tangent grid curves (Mathematical field)
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)'

      const gridSpacing = 60
      const cols = Math.ceil(width / gridSpacing)
      const rows = Math.ceil(height / gridSpacing)

      for (let c = 0; c < cols; c += 2) {
        for (let r = 0; r < rows; r += 2) {
          const gx = c * gridSpacing
          const gy = r * gridSpacing

          // Mathematical vector field angle: theta = sin(x * 0.01 + t) + cos(y * 0.01 + t)
          let angle = Math.sin(gx * 0.005 + time) + Math.cos(gy * 0.005 + time)

          // Mouse deflection
          if (interactive && mouse.x > 0) {
            const dx = mouse.x - gx
            const dy = mouse.y - gy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < mouse.radius) {
              const influence = (1 - dist / mouse.radius) * 1.2
              angle += Math.atan2(dy, dx) * influence
            }
          }

          const len = 8
          const x2 = gx + Math.cos(angle) * len
          const y2 = gy + Math.sin(angle) * len

          ctx.beginPath()
          ctx.moveTo(gx, gy)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }

      // Update and draw harmonic particles
      particles.forEach(p => {
        // Record trail
        p.history.push({ x: p.x, y: p.y })
        if (p.history.length > p.maxHistory) {
          p.history.shift()
        }

        // Vector field force at particle position
        const angle = Math.sin(p.x * 0.004 + time) + Math.cos(p.y * 0.004 + p.phase)
        p.vx += Math.cos(angle) * 0.08 * speed
        p.vy += Math.sin(angle) * 0.08 * speed

        // Friction
        p.vx *= 0.95
        p.vy *= 0.95

        // Mouse repulsion / attraction
        if (interactive && mouse.x > 0) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < mouse.radius) {
            const force = (1 - dist / mouse.radius) * 0.6
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        p.x += p.vx
        p.y += p.vy

        // Wrap around boundaries
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        // Draw particle trail
        if (p.history.length > 1) {
          ctx.beginPath()
          ctx.moveTo(p.history[0].x, p.history[0].y)
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y)
          }
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.size
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Draw particle head
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      })

      animId = requestAnimationFrame(render)
    }

    render()

    const handleMouseMove = (e) => {
      if (!interactive) return
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
    }

    const handleTouchMove = (e) => {
      if (!interactive || !e.touches[0]) return
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = e.touches[0].clientX - rect.left
      mouse.targetY = e.touches[0].clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.targetX = -1000
      mouse.targetY = -1000
    }

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
      window.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [particleCount, speed, interactive])

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}

export default AlgorithmicBackground
