/**
 * Interaction Slide Engine
 *
 * Dispatches to the correct interaction type component based on
 * the `interactionType` field in the lesson config.
 *
 * Usage in a slide JSON block:
 * {
 *   "type": "interaction",
 *   "content": {
 *     "interactionType": "A",   // "A" | "B" | "C" | "E"
 *     "lesson": { ...overrides } // optional — falls back to each type's default
 *   }
 * }
 */

import { useState, useEffect, useCallback } from 'react'
import { MathText } from './MathText'

export { default as InteractionTypeA } from './InteractionTypeA'
export { default as InteractionTypeB } from './InteractionTypeB'
export { default as InteractionTypeC } from './InteractionTypeC'
export { default as InteractionTypeE } from './InteractionTypeE'

import InteractionTypeA from './InteractionTypeA'
import InteractionTypeB from './InteractionTypeB'
import InteractionTypeC from './InteractionTypeC'
import InteractionTypeE from './InteractionTypeE'

const TYPE_MAP = {
  'A': InteractionTypeA,
  'B': InteractionTypeB,
  'C': InteractionTypeC,
  'E': InteractionTypeE,
}

/* ═══════════════════════════════════════════════════════════════════════════
 * StatementPopup — shows the problem statement prominently when entering
 * an interaction slide. Auto-fades after a few seconds, with a floating
 * button to re-open it.
 * ═══════════════════════════════════════════════════════════════════════════ */

const POPUP_FADE_DELAY = 5000 // ms before auto-dismiss

function StatementPopup({ text }) {
  const [visible, setVisible] = useState(true)   // overlay shown
  const [fading, setFading] = useState(false)     // fade-out animation running

  // Auto-dismiss timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), POPUP_FADE_DELAY)
    const hideTimer = setTimeout(() => setVisible(false), POPUP_FADE_DELAY + 500)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  const dismiss = useCallback(() => {
    setFading(true)
    setTimeout(() => setVisible(false), 350)
  }, [])

  const reopen = useCallback(() => {
    setVisible(true)
    setFading(false)
    // restart auto-dismiss
    const fadeTimer = setTimeout(() => setFading(true), POPUP_FADE_DELAY)
    const hideTimer = setTimeout(() => setVisible(false), POPUP_FADE_DELAY + 500)
    // store cleanup ids on window so we can clear if component unmounts
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  return (
    <>
      {/* Floating "show problem" button — always visible when popup is hidden */}
      {!visible && (
        <button
          onClick={reopen}
          aria-label="Hiện đề bài"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            animation: 'statement-btn-in 0.3s ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 4px 18px rgba(99,102,241,0.45)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.35)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Đề bài
        </button>
      )}

      {/* Overlay popup */}
      {visible && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.4s ease',
            cursor: 'pointer',
          }}
          onClick={dismiss}
        >
          <div
            style={{
              maxWidth: 520,
              width: '90%',
              background: '#fff',
              borderRadius: 16,
              padding: '28px 32px 24px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              transform: fading ? 'translateY(-8px) scale(0.97)' : 'translateY(0) scale(1)',
              transition: 'transform 0.4s ease, opacity 0.4s ease',
              cursor: 'default',
            }}
            onClick={e => e.stopPropagation()} // don't dismiss when clicking card
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <span style={{
                fontSize: 16, fontWeight: 700, color: '#1e1b4b',
                letterSpacing: '-0.01em',
              }}>Đề bài</span>
            </div>

            {/* Statement text */}
            <div style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: '#334155',
              marginBottom: 18,
            }}>
              {text.split('\n').map((line, i) => (
                <div key={i} style={{ marginBottom: line.trim() === '' ? 8 : 2 }}>
                  {line.trim() ? <MathText text={line} /> : '\u00A0'}
                </div>
              ))}
            </div>

            {/* Dismiss button */}
            <button
              onClick={dismiss}
              style={{
                display: 'block',
                margin: '0 auto',
                padding: '8px 28px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Bắt đầu
            </button>
          </div>
        </div>
      )}

      {/* Keyframe for the floating button entrance */}
      <style>{`
        @keyframes statement-btn-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}

/**
 * InteractionSlide — renders the correct engine for a given interactionType.
 *
 * Props:
 *   interactionType  "A" | "B" | "C" | "E"
 *   lesson           optional lesson config object to override defaults
 */
export default function InteractionSlide({ interactionType, lesson }) {
  const Component = TYPE_MAP[interactionType]

  if (!Component) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ef4444', fontSize: 14
      }}>
        Unknown interaction type: <strong style={{ marginLeft: 4 }}>{interactionType}</strong>
      </div>
    )
  }

  const prompt = lesson?.prompt
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Component lesson={lesson} />
      {prompt && <StatementPopup text={prompt} />}
    </div>
  )
}
