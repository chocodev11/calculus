/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import { createSession, defaultSandboxRegistry } from './index'
import type { SandboxManifest } from './types'

interface StepJson {
  slides: Array<{ blocks?: Array<{ content?: { lesson?: SandboxManifest } }> }>
}

// Guards the engine against regressions on the real course content, not only on fixtures.
const stepFiles = import.meta.glob<StepJson>('../../../data/courses/**/steps/*.json', { eager: true, import: 'default' })

function courseSandboxes(): Array<{ file: string; manifest: SandboxManifest }> {
  return Object.entries(stepFiles).flatMap(([file, step]) => step.slides.flatMap(slide => (slide.blocks || [])
    .map(block => block.content?.lesson)
    .filter((lesson): lesson is SandboxManifest => lesson?.kind === 'math.sandbox')
    .map(manifest => ({ file: file.replace(/^.*courses\//, ''), manifest }))))
}

describe('course sandboxes', () => {
  const sandboxes = courseSandboxes()

  it('finds the sandboxes of the logic course', () => {
    expect(sandboxes.length).toBeGreaterThanOrEqual(7)
  })

  it.each(sandboxes.map(({ file, manifest }) => [`${file} · ${manifest.id}`, manifest]))('%s opens unanswered', (_, manifest) => {
    const snapshot = createSession(manifest, defaultSandboxRegistry).snapshot()
    expect(snapshot.goals.length).toBeGreaterThan(0)
    expect(snapshot.goals.every(goal => goal.reached)).toBe(false)
  })

  it('completes the grading lesson when every sentence is graded correctly', () => {
    const lesson = sandboxes.map(item => item.manifest).find(manifest => manifest.config.mode === 'proposition_classifier')
    expect(lesson).toBeDefined()
    const session = createSession(lesson!, defaultSandboxRegistry)
    const items = (lesson!.config.activity as { items: Array<{ id: string; controlId?: string; expectedType: string; truthValue?: boolean }> }).items
    for (const item of items) {
      const value = item.expectedType === 'proposition' ? `proposition:${item.truthValue}` : item.expectedType
      session.dispatch({ type: 'set_control', controlId: item.controlId || `class:${item.id}`, value })
    }
    expect(session.snapshot().goals.every(goal => goal.reached)).toBe(true)
  })
})
