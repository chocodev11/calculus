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
    <div className="my-3 w-full rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <InteractionSlide
        interactionType={blockContent.interactionType}
        lesson={blockContent.lesson}
        content={blockContent}
        onComplete={onComplete}
      />
    </div>
  )
}

export default Sandbox
