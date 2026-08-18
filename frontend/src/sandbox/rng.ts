export class SeededRandom {
  private state: number

  constructor(seed: number | string) {
    this.state = hashSeed(seed)
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  integer(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) throw new Error('Invalid integer range')
    return min + Math.floor(this.next() * (max - min + 1))
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot pick from an empty list')
    return values[this.integer(0, values.length - 1)]
  }
}

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return (seed >>> 0) || 1
  let hash = 2166136261
  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0 || 1
}

export function generateVariant<T>(seed: number | string, factory: (random: SeededRandom) => T): T {
  return factory(new SeededRandom(seed))
}

