import type { SandboxManifest } from './types'
import { sandboxCatalog } from './catalog'

export const propositionFixture: SandboxManifest = {
  schemaVersion: '1.0',
  kind: 'math.sandbox',
  id: 'logic-proposition-basic',
  version: '1.0.0',
  domainId: 'logic',
  archetypeId: 'compound-truth-value',
  level: 'understanding',
  recipe: 'logic.truth_table',
  outcomeIds: ['M10-SET-PROPOSITION-01'],
  prerequisites: [],
  misconceptions: ['negation-without-parentheses'],
  scene: { space: 'truth_table' },
  controls: [
    { id: 'p', type: 'toggle', label: 'Mệnh đề p', initial: false },
    { id: 'q', type: 'toggle', label: 'Mệnh đề q', initial: false },
  ],
  goals: [{ id: 'truth', evidence: 'truth_value', target: true }],
  assessment: [],
  accessibility: {
    keyboardControls: true,
    textAlternative: 'Bảng chân trị của mệnh đề p và q',
    highContrast: true,
  },
  config: {
    mode: 'truth_table',
    variables: ['p', 'q'],
    expression: 'p && !q',
    initialValues: { p: false, q: false },
  },
}

export const setOperatorFixture: SandboxManifest = {
  schemaVersion: '1.0',
  kind: 'math.sandbox',
  id: 'set-operator-basic',
  version: '1.0.0',
  domainId: 'set',
  archetypeId: 'union-intersection',
  level: 'application',
  recipe: 'set.operator',
  outcomeIds: ['M10-SET-OPERATOR-01'],
  prerequisites: ['M10-SET-MEMBERSHIP-01'],
  misconceptions: ['set-operation-order'],
  scene: { space: 'venn_plane' },
  controls: [],
  goals: [{ id: 'result', evidence: 'set_equal', target: [1, 2, 3, 4] }],
  assessment: [],
  accessibility: {
    keyboardControls: true,
    textAlternative: 'Biểu diễn phép hợp của hai tập hợp',
    highContrast: true,
  },
  config: {
    mode: 'operator',
    left: [1, 2, 3],
    right: [3, 4],
    operation: 'union',
    target: [1, 2, 3, 4],
    universe: [1, 2, 3, 4, 5],
  },
}

export const triangleFixture: SandboxManifest = {
  schemaVersion: '1.0',
  kind: 'math.sandbox',
  id: 'triangle-cosine-law-basic',
  version: '1.0.0',
  domainId: 'trigonometry',
  archetypeId: 'law-of-cosines',
  level: 'application',
  recipe: 'trigonometry.triangle_solver',
  outcomeIds: ['M10-TRIG-LAW-COS-01'],
  prerequisites: ['M10-TRIG-VALUES-01'],
  misconceptions: ['wrong-cosine-side'],
  scene: { space: 'triangle_scene' },
  controls: [],
  goals: [{ id: 'triangle-solved', evidence: 'triangle_solved' }],
  assessment: [],
  accessibility: {
    keyboardControls: true,
    textAlternative: 'Tam giác với hai cạnh và góc xen giữa',
    highContrast: true,
  },
  config: {
    mode: 'triangle_solver',
    triangle: { a: 3, b: 4, C: 90 },
  },
}

export function createCatalogFixture(archetypeId: string, level: SandboxManifest['level']): SandboxManifest {
  const archetype = sandboxCatalog.find(item => item.id === archetypeId)
  if (!archetype) throw new Error(`Unknown catalog archetype: ${archetypeId}`)
  if (archetype.domainId === 'logic') {
    const solutionGraph = level === 'advanced_application' ? { steps: [{ id: 'strategy', kind: 'justify' as const, hint: 'Kiểm tra từng dòng của bảng chân trị.' }], terminalStepIds: ['strategy'] } : null
    return {
      ...propositionFixture,
      id: `${archetype.id}.${level}`,
      version: '1.0.0',
      archetypeId,
      level,
      outcomeIds: archetype.outcomeIds,
      prerequisites: archetype.prerequisites,
      misconceptions: archetype.misconceptions,
      ...(solutionGraph ? { solutionGraph } : {}),
    }
  }
  if (archetype.domainId === 'set') {
    const solutionGraph = level === 'advanced_application' ? { steps: [{ id: 'region', kind: 'check' as const, hint: 'Phân hoạch universe trước khi đếm.' }], terminalStepIds: ['region'] } : null
    return {
      ...setOperatorFixture,
      id: `${archetype.id}.${level}`,
      version: '1.0.0',
      archetypeId,
      level,
      outcomeIds: archetype.outcomeIds,
      prerequisites: archetype.prerequisites,
      misconceptions: archetype.misconceptions,
      ...(solutionGraph ? { solutionGraph } : {}),
    }
  }
  const isUnitCircle = archetype.id.includes('angle') || archetype.id.includes('special') || archetype.id.includes('sign') || archetype.id.includes('identit')
  const solutionGraph = level === 'advanced_application' ? { steps: [{ id: 'invariant', kind: 'check' as const, hint: 'Kiểm tra tổng góc và bất đẳng thức tam giác.' }], terminalStepIds: ['invariant'] } : null
  return {
    ...triangleFixture,
    id: `${archetype.id}.${level}`,
    version: '1.0.0',
    archetypeId,
    level,
    recipe: isUnitCircle ? 'trigonometry.unit_circle' : 'trigonometry.triangle_solver',
    scene: { space: isUnitCircle ? 'unit_circle' : 'triangle_scene' },
    outcomeIds: archetype.outcomeIds,
    prerequisites: archetype.prerequisites,
    misconceptions: archetype.misconceptions,
    goals: isUnitCircle ? [{ id: 'angle', evidence: 'unit_circle_value', target: 60 }] : triangleFixture.goals,
    config: isUnitCircle ? { mode: 'unit_circle', initialDegrees: 60 } : triangleFixture.config,
    ...(solutionGraph ? { solutionGraph } : {}),
  }
}

export const catalogFixtures = sandboxCatalog.flatMap(archetype => archetype.levels.map(level => createCatalogFixture(archetype.id, level)))
