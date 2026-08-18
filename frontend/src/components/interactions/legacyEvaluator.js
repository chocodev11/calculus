import { evaluateExpression } from '../../sandbox/evaluator'

function normalizeExpression(expression) {
  if (typeof expression !== 'string' || expression.length > 4000) throw new Error('Legacy expression is invalid')
  return expression
    .replace(/\bMath\.(pow|abs|sin|cos|tan|sqrt|log|exp|floor|ceil|round|min|max|sign)\b/g, '$1')
    .replace(/\bMath\.PI\b/g, 'PI')
    .replace(/\bMath\.E\b/g, 'E')
    .replace(/\*\*/g, '^')
}

export function evaluateNumber(expression, scope = {}) {
  const value = evaluateExpression(normalizeExpression(expression), scope)
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expression did not produce a finite number')
  return value
}

export function makeNumberEvaluator(expression, names = ['x']) {
  return (...values) => evaluateNumber(expression, Object.fromEntries(names.map((name, index) => [name, values[index]])))
}

export function makeArrayEvaluator(expression) {
  return scope => {
    const value = evaluateExpression(normalizeExpression(expression), scope)
    if (!Array.isArray(value)) throw new Error('Expression did not produce an array')
    return value
  }
}

export function evaluateCondition(expression, state) {
  const normalized = normalizeExpression(expression).replace(/\bstate\./g, '')
  return evaluateExpression(normalized, state) === true
}
