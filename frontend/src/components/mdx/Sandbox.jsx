import React from 'react'
import InteractionSlide from '../interactions'

export function Sandbox({
  type = 'sandbox',
  archetypeId,
  recipe,
  mode,
  config,
  controls,
  items,
  manifest,
  onComplete,
  ...rest
}) {
  // Build standard lesson payload
  const lessonData = manifest || {
    schemaVersion: '1.0',
    kind: 'math.sandbox',
    archetypeId: archetypeId || recipe || 'logic.proposition',
    recipe: recipe || archetypeId || 'logic.proposition',
    mode: mode || 'default',
    config: config || (items ? { activity: { items } } : {}),
    controls: controls || [],
    ...rest,
  }

  const blockContent = {
    interactionType: type,
    lesson: lessonData,
  }

  return (
    <div className="my-6 w-full rounded-3xl overflow-hidden border-2 border-slate-200 bg-white">
      <div className="min-h-[420px]">
        <InteractionSlide
          content={blockContent}
          onComplete={onComplete}
        />
      </div>
    </div>
  )
}

export default Sandbox
