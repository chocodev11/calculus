export * from './types'
export * from './evaluator'
export * from './manifest'
export * from './canonical'
export * from './registry'
export * from './runtime'
export * from './rng'
export * from './catalog'
export * from './renderer'
export * from './assessment'
export * from './fixtures'

import { createRegistry } from './registry'
import {
  logicPlugin,
  propositionBuilderPlugin,
  conditionGraphPlugin,
  propositionPlugin,
  quantifierPlugin,
  implicationPlugin,
  necessarySufficientPlugin,
  parameterTruthPlugin,
  variableEvaluatorPlugin,
} from './plugins/logic'
import { setPlugin, setBuilderPlugin, setVennPlugin, setNumberLinePlugin } from './plugins/set'
import {
  trigonometryPlugin,
  triangleSolverPlugin,
  lawOfSinesPlugin,
  lawOfCosinesPlugin,
  measurementModelPlugin,
} from './plugins/trigonometry'

export const defaultSandboxRegistry = createRegistry([
  logicPlugin,
  propositionBuilderPlugin,
  conditionGraphPlugin,
  propositionPlugin,
  quantifierPlugin,
  implicationPlugin,
  necessarySufficientPlugin,
  parameterTruthPlugin,
  variableEvaluatorPlugin,
  setPlugin,
  setBuilderPlugin,
  setVennPlugin,
  setNumberLinePlugin,
  trigonometryPlugin,
  triangleSolverPlugin,
  lawOfSinesPlugin,
  lawOfCosinesPlugin,
  measurementModelPlugin,
])
