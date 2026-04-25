/**
 * Capability Mesh — Broker contract (v1.5.0)
 *
 * The Broker is the stateful, per-tenant component that turns a
 * CapabilityRequest into an invocation against the right MCP server. This
 * module exports only the interface and a stub implementation; the runtime
 * (registry lookup, vault hydration, billing telemetry) ships in v1.5.1.
 *
 * @see docs/architecture.md (section 5)
 */
import type {
  CapabilityRequest,
  CapabilityResponse,
  CapabilityChunk,
  CapabilityDescriptor,
  DryRunResult,
} from '../resolve'
import { ConfigurationError } from '../errors'

// ============================================================================
// Interface
// ============================================================================

/**
 * Stateful Broker — the connective tissue between consumers and the MCP
 * server pool. Implementations are expected to:
 *
 * 1. Validate the CapabilityRequest (zod schemas in `../resolve`).
 * 2. Resolve candidate servers via the Registry.
 * 3. Hydrate per-tenant credentials via the Auth Proxy / vault.
 * 4. Enforce budget and policy.
 * 5. Invoke the chosen server, retry next-best on failure.
 * 6. Emit a `capability.resolved` telemetry event on success.
 */
export interface Broker {
  /**
   * Resolve a capability request to a single result. Throws one of:
   *
   * - `CapabilityUnavailableError` — registry produced no candidates.
   * - `BudgetExceededError` — request or tenant budget exhausted.
   * - `TenantNotProvisionedError` — vault has no entry for `auth`.
   * - `ToolExecutionError` — all candidates failed to invoke.
   */
  resolve(req: CapabilityRequest): Promise<CapabilityResponse>

  /**
   * Streaming variant for long-running capabilities. Yields
   * {@link CapabilityChunk} until `done: true`.
   */
  resolveStream(req: CapabilityRequest): AsyncIterable<CapabilityChunk>

  /**
   * Enumerate the capabilities a given tenant can invoke right now.
   * Useful for UIs that render available actions per tenant.
   */
  list(
    tenantId: string,
    filter?: { tag?: string }
  ): Promise<CapabilityDescriptor[]>

  /**
   * Pre-flight: report whether a resolve() *could* succeed without actually
   * invoking any server. `blockers` is empty on success. Used by GodotForge
   * to validate a build plan before kickoff.
   */
  dryRun(req: CapabilityRequest): Promise<DryRunResult>
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Runtime configuration for a concrete Broker implementation.
 * Currently a placeholder — the real shape will land with v1.5.1.
 */
export interface BrokerConfig {
  /** OpenConductor API key. */
  apiKey: string
  /** Registry endpoint URL. */
  registryUrl?: string
  /** Vault endpoint URL (e.g. Supabase project URL). */
  vaultUrl?: string
  /**
   * Tenant cache TTL in milliseconds. Default: 60_000.
   * Set to 0 to disable caching.
   */
  tenantCacheTtlMs?: number
}

// ============================================================================
// Stub implementation
// ============================================================================

/**
 * Skeleton Broker that throws `ConfigurationError` on every method.
 *
 * Use this to type-check integration code and pin the contract today;
 * swap for the real implementation once it lands. Concrete impls should
 * NOT extend this — they should implement {@link Broker} directly.
 *
 * @example
 * import { NotImplementedBroker } from '@openconductor/mcp-sdk/broker'
 *
 * const broker: Broker = new NotImplementedBroker()
 * await broker.resolve({ capability: 'database:write', auth: 't1' })
 * // → ConfigurationError: Broker runtime not yet wired (v1.5.1)
 */
export class NotImplementedBroker implements Broker {
  private fail(method: string): never {
    throw new ConfigurationError(
      'broker',
      `Broker.${method}() runtime not yet wired (planned for v1.5.1). ` +
        `Use NotImplementedBroker only for type-checking integration code.`
    )
  }

  async resolve(_req: CapabilityRequest): Promise<CapabilityResponse> {
    this.fail('resolve')
  }

  resolveStream(_req: CapabilityRequest): AsyncIterable<CapabilityChunk> {
    return {
      [Symbol.asyncIterator](): AsyncIterator<CapabilityChunk> {
        return {
          async next(): Promise<IteratorResult<CapabilityChunk>> {
            throw new ConfigurationError(
              'broker',
              'Broker.resolveStream() runtime not yet wired (planned for v1.5.1).'
            )
          },
        }
      },
    }
  }

  async list(
    _tenantId: string,
    _filter?: { tag?: string }
  ): Promise<CapabilityDescriptor[]> {
    this.fail('list')
  }

  async dryRun(_req: CapabilityRequest): Promise<DryRunResult> {
    this.fail('dryRun')
  }
}
