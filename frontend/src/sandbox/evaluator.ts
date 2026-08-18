import type {
  AngleValue,
  FiniteSetValue,
  IntervalValue,
  MathValue,
  PointValue,
  RationalValue,
  VectorValue,
} from './types'

export type UnaryOperator = '+' | '-' | '!'
export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '<'
  | '<='
  | '>'
  | '>='
  | '=='
  | '!='
  | '&&'
  | '||'

export type AstNode =
  | { kind: 'literal'; value: number | boolean }
  | { kind: 'identifier'; name: string }
  | { kind: 'unary'; operator: UnaryOperator; operand: AstNode }
  | { kind: 'binary'; operator: BinaryOperator; left: AstNode; right: AstNode }
  | { kind: 'call'; name: string; args: AstNode[] }
  | { kind: 'array'; elements: AstNode[] }

export interface EvaluatorOptions {
  maxLength?: number
  maxNodes?: number
  maxDepth?: number
  maxSteps?: number
}

export class EvaluationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'EvaluationError'
    this.code = code
  }
}

interface Token {
  kind: 'number' | 'identifier' | 'operator' | 'punctuation' | 'eof'
  text: string
  position: number
}

const DEFAULT_OPTIONS: Required<EvaluatorOptions> = {
  maxLength: 4000,
  maxNodes: 256,
  maxDepth: 64,
  maxSteps: 5000,
}

const TWO_CHARACTER_OPERATORS = new Set(['<=', '>=', '==', '!=', '&&', '||'])
const ONE_CHARACTER_OPERATORS = new Set(['+', '-', '*', '/', '^', '<', '>', '!'])
const PUNCTUATION = new Set(['(', ')', '[', ']', ','])
const ALLOWED_FUNCTIONS = new Set([
  'abs', 'sqrt', 'log', 'sin', 'cos', 'tan', 'exp', 'pow', 'floor', 'ceil', 'round',
  'min', 'max', 'sign', 'deg', 'rad', 'set', 'union', 'intersection', 'difference',
  'contains', 'interval', 'angle', 'point', 'vector', 'rational',
])
const FORBIDDEN_IDENTIFIERS = new Set(['globalThis', 'window', 'document', 'Function', 'eval', 'import', 'process'])

function isDigit(value: string): boolean {
  return value >= '0' && value <= '9'
}

function isIdentifierStart(value: string): boolean {
  return /[A-Za-z_]/.test(value)
}

function isIdentifierPart(value: string): boolean {
  return /[A-Za-z0-9_]/.test(value)
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const current = source[index]
    if (/\s/.test(current)) {
      index += 1
      continue
    }

    if (isDigit(current) || (current === '.' && isDigit(source[index + 1] || ''))) {
      const start = index
      let sawDot = false
      if (current === '.') {
        sawDot = true
        index += 1
      }
      while (isDigit(source[index] || '')) index += 1
      if (!sawDot && source[index] === '.') {
        sawDot = true
        index += 1
        while (isDigit(source[index] || '')) index += 1
      }
      if (source[index] === 'e' || source[index] === 'E') {
        index += 1
        if (source[index] === '+' || source[index] === '-') index += 1
        const exponentStart = index
        while (isDigit(source[index] || '')) index += 1
        if (exponentStart === index) {
          throw new EvaluationError('invalid_number', `Invalid exponent at position ${start}`)
        }
      }
      const text = source.slice(start, index)
      const value = Number(text)
      if (!Number.isFinite(value)) {
        throw new EvaluationError('non_finite_literal', 'Numeric literal must be finite')
      }
      tokens.push({ kind: 'number', text, position: start })
      continue
    }

    if (isIdentifierStart(current)) {
      const start = index
      index += 1
      while (isIdentifierPart(source[index] || '')) index += 1
      tokens.push({ kind: 'identifier', text: source.slice(start, index), position: start })
      continue
    }

    const two = source.slice(index, index + 2)
    if (TWO_CHARACTER_OPERATORS.has(two)) {
      tokens.push({ kind: 'operator', text: two, position: index })
      index += 2
      continue
    }
    if (ONE_CHARACTER_OPERATORS.has(current)) {
      tokens.push({ kind: 'operator', text: current, position: index })
      index += 1
      continue
    }
    if (PUNCTUATION.has(current)) {
      tokens.push({ kind: 'punctuation', text: current, position: index })
      index += 1
      continue
    }

    throw new EvaluationError('unexpected_character', `Unexpected character at position ${index}`)
  }

  tokens.push({ kind: 'eof', text: '', position: source.length })
  return tokens
}

class Parser {
  private readonly tokens: Token[]
  private readonly options: Required<EvaluatorOptions>
  private index = 0
  private nodes = 0

  constructor(source: string, options: Required<EvaluatorOptions>) {
    this.tokens = tokenize(source)
    this.options = options
  }

  parse(): AstNode {
    const result = this.parseOr(0)
    this.expect('eof')
    return result
  }

  private bumpNode(): void {
    this.nodes += 1
    if (this.nodes > this.options.maxNodes) {
      throw new EvaluationError('too_many_nodes', 'Expression exceeds the node limit')
    }
  }

  private current(): Token {
    return this.tokens[this.index]
  }

  private take(): Token {
    const token = this.current()
    this.index += 1
    return token
  }

  private matches(text: string): boolean {
    return this.current().text === text
  }

  private expect(text: string): Token {
    const token = this.take()
    if (token.text !== text && !(text === 'eof' && token.kind === 'eof')) {
      throw new EvaluationError('unexpected_token', `Expected ${text} at position ${token.position}`)
    }
    return token
  }

  private parseOr(depth: number): AstNode {
    let left = this.parseAnd(depth + 1)
    while (this.matches('||')) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parseAnd(depth + 1), depth)
    }
    return left
  }

  private parseAnd(depth: number): AstNode {
    let left = this.parseEquality(depth + 1)
    while (this.matches('&&')) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parseEquality(depth + 1), depth)
    }
    return left
  }

  private parseEquality(depth: number): AstNode {
    let left = this.parseComparison(depth + 1)
    while (this.matches('==') || this.matches('!=')) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parseComparison(depth + 1), depth)
    }
    return left
  }

  private parseComparison(depth: number): AstNode {
    let left = this.parseAdditive(depth + 1)
    while (['<', '<=', '>', '>='].includes(this.current().text)) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parseAdditive(depth + 1), depth)
    }
    return left
  }

  private parseAdditive(depth: number): AstNode {
    let left = this.parseMultiplicative(depth + 1)
    while (this.matches('+') || this.matches('-')) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parseMultiplicative(depth + 1), depth)
    }
    return left
  }

  private parseMultiplicative(depth: number): AstNode {
    let left = this.parsePower(depth + 1)
    while (this.matches('*') || this.matches('/')) {
      const operator = this.take().text as BinaryOperator
      left = this.binary(operator, left, this.parsePower(depth + 1), depth)
    }
    return left
  }

  private parsePower(depth: number): AstNode {
    const left = this.parseUnary(depth + 1)
    if (!this.matches('^')) return left
    const operator = this.take().text as BinaryOperator
    return this.binary(operator, left, this.parsePower(depth + 1), depth)
  }

  private parseUnary(depth: number): AstNode {
    if (this.matches('+') || this.matches('-') || this.matches('!')) {
      const operator = this.take().text as UnaryOperator
      this.bumpNode()
      return { kind: 'unary', operator, operand: this.parseUnary(depth + 1) }
    }
    return this.parsePrimary(depth + 1)
  }

  private parsePrimary(depth: number): AstNode {
    if (depth > this.options.maxDepth) {
      throw new EvaluationError('too_deep', 'Expression exceeds the depth limit')
    }

    const token = this.take()
    if (token.kind === 'number') {
      this.bumpNode()
      return { kind: 'literal', value: Number(token.text) }
    }

    if (token.kind === 'identifier') {
      if (FORBIDDEN_IDENTIFIERS.has(token.text)) {
        throw new EvaluationError('identifier_not_allowed', `Identifier ${token.text} is not allowed`)
      }
      if (token.text === 'true' || token.text === 'false') {
        this.bumpNode()
        return { kind: 'literal', value: token.text === 'true' }
      }
      if (this.matches('(')) {
        if (!ALLOWED_FUNCTIONS.has(token.text)) {
          throw new EvaluationError('function_not_allowed', `Function ${token.text} is not allowed`)
        }
        this.expect('(')
        const args: AstNode[] = []
        if (!this.matches(')')) {
          do {
            args.push(this.parseOr(depth + 1))
          } while (this.matches(',') && Boolean(this.take()))
        }
        this.expect(')')
        this.bumpNode()
        return { kind: 'call', name: token.text, args }
      }
      this.bumpNode()
      return { kind: 'identifier', name: token.text }
    }

    if (token.text === '(') {
      const expression = this.parseOr(depth + 1)
      this.expect(')')
      return expression
    }

    if (token.text === '[') {
      const elements: AstNode[] = []
      if (!this.matches(']')) {
        do {
          elements.push(this.parseOr(depth + 1))
        } while (this.matches(',') && Boolean(this.take()))
      }
      this.expect(']')
      this.bumpNode()
      return { kind: 'array', elements }
    }

    throw new EvaluationError('expected_expression', `Expected expression at position ${token.position}`)
  }

  private binary(operator: BinaryOperator, left: AstNode, right: AstNode, depth: number): AstNode {
    if (depth > this.options.maxDepth) {
      throw new EvaluationError('too_deep', 'Expression exceeds the depth limit')
    }
    this.bumpNode()
    return { kind: 'binary', operator, left, right }
  }
}

function isRational(value: unknown): value is RationalValue {
  return Boolean(value && typeof value === 'object' && (value as RationalValue).kind === 'rational')
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (isRational(value)) return value.numerator / value.denominator
  if (value && typeof value === 'object' && (value as AngleValue).kind === 'angle') {
    const angle = value as AngleValue
    return angle.unit === 'degree' ? angle.degrees * Math.PI / 180 : angle.degrees
  }
  throw new EvaluationError('expected_number', 'Expected a numeric value')
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new EvaluationError('expected_boolean', 'Expected a boolean value')
  return value
}

function finiteNumber(value: number): number {
  if (!Number.isFinite(value)) throw new EvaluationError('non_finite_result', 'Expression produced a non-finite result')
  return value
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== typeof right) return false
  if (typeof left === 'number' && typeof right === 'number') return Object.is(left, right) || Math.abs(left - right) < 1e-12
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]))
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const keys = Object.keys(leftRecord)
    return keys.length === Object.keys(rightRecord).length && keys.every(key => deepEqual(leftRecord[key], rightRecord[key]))
  }
  return Object.is(left, right)
}

function setValue(elements: unknown[]): FiniteSetValue {
  const unique: MathValue[] = []
  for (const element of elements as MathValue[]) {
    if (!unique.some(item => deepEqual(item, element))) unique.push(element)
  }
  return { kind: 'finite_set', elements: unique }
}

function asSet(value: unknown): FiniteSetValue {
  if (value && typeof value === 'object' && (value as FiniteSetValue).kind === 'finite_set') return value as FiniteSetValue
  throw new EvaluationError('expected_set', 'Expected a finite set')
}

function callFunction(name: string, args: unknown[]): MathValue {
  const numeric = (fn: (...values: number[]) => number): number => finiteNumber(fn(...args.map(asNumber)))
  switch (name) {
    case 'abs': return numeric(Math.abs)
    case 'sqrt': {
      const value = asNumber(args[0])
      if (value < 0) throw new EvaluationError('domain_error', 'sqrt is undefined for negative values')
      return finiteNumber(Math.sqrt(value))
    }
    case 'log': {
      const value = asNumber(args[0])
      if (value <= 0) throw new EvaluationError('domain_error', 'log is undefined for non-positive values')
      return finiteNumber(Math.log(value))
    }
    case 'sin': return numeric(Math.sin)
    case 'cos': return numeric(Math.cos)
    case 'tan': return numeric(Math.tan)
    case 'exp': return numeric(Math.exp)
    case 'pow': return numeric(Math.pow)
    case 'floor': return numeric(Math.floor)
    case 'ceil': return numeric(Math.ceil)
    case 'round': return numeric(Math.round)
    case 'min': return numeric(Math.min)
    case 'max': return numeric(Math.max)
    case 'sign': return numeric(Math.sign)
    case 'deg': return { kind: 'angle', degrees: asNumber(args[0]), unit: 'degree' }
    case 'rad': return { kind: 'angle', degrees: asNumber(args[0]), unit: 'radian' }
    case 'set': return setValue(args)
    case 'union': {
      const sets = args.map(asSet)
      return setValue(sets.flatMap(item => item.elements))
    }
    case 'intersection': {
      const sets = args.map(asSet)
      if (sets.length === 0) return setValue([])
      return setValue(sets[0].elements.filter(element => sets.every(item => item.elements.some(candidate => deepEqual(candidate, element)))))
    }
    case 'difference': {
      const [left, right] = args.map(asSet)
      return setValue(left.elements.filter(element => !right.elements.some(candidate => deepEqual(candidate, element))))
    }
    case 'contains': {
      const [collection, value] = args
      if (collection && typeof collection === 'object' && (collection as FiniteSetValue).kind === 'finite_set') {
        return (collection as FiniteSetValue).elements.some(item => deepEqual(item, value))
      }
      throw new EvaluationError('expected_collection', 'contains expects a finite set')
    }
    case 'interval': {
      const [left, right, leftClosed, rightClosed] = args
      return {
        kind: 'interval',
        left: left === null ? null : asNumber(left),
        right: right === null ? null : asNumber(right),
        leftClosed: asBoolean(leftClosed),
        rightClosed: asBoolean(rightClosed),
      } satisfies IntervalValue
    }
    case 'angle': return { kind: 'angle', degrees: asNumber(args[0]), unit: 'degree' }
    case 'point': return { kind: 'point', x: asNumber(args[0]), y: asNumber(args[1]) } satisfies PointValue
    case 'vector': return { kind: 'vector', x: asNumber(args[0]), y: asNumber(args[1]) } satisfies VectorValue
    case 'rational': {
      const numerator = asNumber(args[0])
      const denominator = asNumber(args[1])
      if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
        throw new EvaluationError('invalid_rational', 'rational expects integer numerator and non-zero denominator')
      }
      return { kind: 'rational', numerator, denominator }
    }
    default:
      throw new EvaluationError('function_not_allowed', `Function ${name} is not allowed`)
  }
}

function evaluateAst(node: AstNode, scope: Record<string, MathValue>, steps: { value: number }, maxSteps: number): MathValue {
  steps.value += 1
  if (steps.value > maxSteps) throw new EvaluationError('too_many_steps', 'Expression exceeded the evaluation step limit')

  switch (node.kind) {
    case 'literal': return node.value
    case 'identifier': {
      if (node.name === 'PI') return Math.PI
      if (node.name === 'E') return Math.E
      if (!(node.name in scope)) throw new EvaluationError('unknown_identifier', `Unknown identifier ${node.name}`)
      return scope[node.name]
    }
    case 'array': return node.elements.map(item => evaluateAst(item, scope, steps, maxSteps)) as unknown as MathValue
    case 'unary': {
      const value = evaluateAst(node.operand, scope, steps, maxSteps)
      if (node.operator === '!') return !asBoolean(value)
      const number = asNumber(value)
      return finiteNumber(node.operator === '-' ? -number : number)
    }
    case 'binary': {
      const left = evaluateAst(node.left, scope, steps, maxSteps)
      if (node.operator === '&&') return asBoolean(left) && asBoolean(evaluateAst(node.right, scope, steps, maxSteps))
      if (node.operator === '||') return asBoolean(left) || asBoolean(evaluateAst(node.right, scope, steps, maxSteps))
      const right = evaluateAst(node.right, scope, steps, maxSteps)
      switch (node.operator) {
        case '+': return finiteNumber(asNumber(left) + asNumber(right))
        case '-': return finiteNumber(asNumber(left) - asNumber(right))
        case '*': return finiteNumber(asNumber(left) * asNumber(right))
        case '/': {
          const denominator = asNumber(right)
          if (denominator === 0) throw new EvaluationError('division_by_zero', 'Division by zero is not allowed')
          return finiteNumber(asNumber(left) / denominator)
        }
        case '^': return finiteNumber(Math.pow(asNumber(left), asNumber(right)))
        case '<': return asNumber(left) < asNumber(right)
        case '<=': return asNumber(left) <= asNumber(right)
        case '>': return asNumber(left) > asNumber(right)
        case '>=': return asNumber(left) >= asNumber(right)
        case '==': return deepEqual(left, right)
        case '!=': return !deepEqual(left, right)
      }
    }
    case 'call': return callFunction(node.name, node.args.map(argument => evaluateAst(argument, scope, steps, maxSteps)))
  }
}

export function parseExpression(source: string, options: EvaluatorOptions = {}): AstNode {
  const resolved = { ...DEFAULT_OPTIONS, ...options }
  if (typeof source !== 'string' || source.trim().length === 0) {
    throw new EvaluationError('empty_expression', 'Expression must not be empty')
  }
  if (source.length > resolved.maxLength) {
    throw new EvaluationError('expression_too_long', 'Expression exceeds the length limit')
  }
  return new Parser(source, resolved).parse()
}

export function compileExpression(source: string, options: EvaluatorOptions = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options }
  const ast = parseExpression(source, resolved)
  return {
    ast,
    evaluate(scope: Record<string, MathValue> = {}): MathValue {
      return evaluateAst(ast, scope, { value: 0 }, resolved.maxSteps)
    },
  }
}

export function evaluateExpression(source: string, scope: Record<string, MathValue> = {}, options: EvaluatorOptions = {}): MathValue {
  return compileExpression(source, options).evaluate(scope)
}

export function compilePredicate(source: string, options: EvaluatorOptions = {}) {
  const expression = compileExpression(source, options)
  return {
    ast: expression.ast,
    evaluate(scope: Record<string, MathValue> = {}): boolean {
      return asBoolean(expression.evaluate(scope))
    },
  }
}
