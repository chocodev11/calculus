import type {
  JsonObject,
  PrimitiveState,
  RecomputeResult,
  RenderModel,
  SandboxManifest,
  SandboxSnapshot,
} from './types'

export interface SandboxPlugin {
  readonly id: string
  readonly domainId: SandboxManifest['domainId']
  validateManifest(manifest: SandboxManifest): string[]
  createInitialState(manifest: SandboxManifest): PrimitiveState
  recompute(manifest: SandboxManifest, state: PrimitiveState): RecomputeResult
  render(manifest: SandboxManifest, derivedState: Record<string, unknown>): RenderModel
  getConstraints?(manifest: SandboxManifest): Record<string, unknown>
  gradeStructuredStep?(manifest: SandboxManifest, stepId: string, value: unknown): { correct: boolean; feedback?: string }
}

export class CapabilityRegistry {
  private readonly plugins = new Map<string, SandboxPlugin>()

  register(plugin: SandboxPlugin): this {
    if (this.plugins.has(plugin.id)) throw new Error(`Plugin already registered: ${plugin.id}`)
    this.plugins.set(plugin.id, plugin)
    return this
  }

  get(id: string): SandboxPlugin {
    const plugin = this.plugins.get(id)
    if (!plugin) throw new Error(`Sandbox plugin is not registered: ${id}`)
    return plugin
  }

  has(id: string): boolean {
    return this.plugins.has(id)
  }

  ids(): string[] {
    return [...this.plugins.keys()].sort()
  }
}

export function createRegistry(plugins: SandboxPlugin[] = []): CapabilityRegistry {
  const registry = new CapabilityRegistry()
  plugins.forEach(plugin => registry.register(plugin))
  return registry
}

export function assertPluginManifest(manifest: SandboxManifest, registry: CapabilityRegistry): SandboxPlugin {
  const plugin = registry.get(manifest.recipe)
  if (plugin.domainId !== manifest.domainId) {
    throw new Error(`Plugin ${plugin.id} does not support domain ${manifest.domainId}`)
  }
  const issues = plugin.validateManifest(manifest)
  if (issues.length > 0) throw new Error(issues.join('; '))
  return plugin
}

export function snapshotFromResult(
  manifest: SandboxManifest,
  result: RecomputeResult,
  historyDepth: number,
): SandboxSnapshot {
  return {
    ...structuredClone(result),
    manifestId: manifest.id,
    manifestVersion: manifest.version,
    historyDepth,
  }
}
