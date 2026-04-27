import { CapabilityRequest, CapabilityResponse, CapabilityChunk, CapabilityDescriptor, DryRunResult } from '../resolve/index.js';
import 'zod';

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
interface Broker {
    /**
     * Resolve a capability request to a single result. Throws one of:
     *
     * - `CapabilityUnavailableError` — registry produced no candidates.
     * - `BudgetExceededError` — request or tenant budget exhausted.
     * - `TenantNotProvisionedError` — vault has no entry for `auth`.
     * - `ToolExecutionError` — all candidates failed to invoke.
     */
    resolve(req: CapabilityRequest): Promise<CapabilityResponse>;
    /**
     * Streaming variant for long-running capabilities. Yields
     * {@link CapabilityChunk} until `done: true`.
     */
    resolveStream(req: CapabilityRequest): AsyncIterable<CapabilityChunk>;
    /**
     * Enumerate the capabilities a given tenant can invoke right now.
     * Useful for UIs that render available actions per tenant.
     */
    list(tenantId: string, filter?: {
        tag?: string;
    }): Promise<CapabilityDescriptor[]>;
    /**
     * Pre-flight: report whether a resolve() *could* succeed without actually
     * invoking any server. `blockers` is empty on success. Used by GodotForge
     * to validate a build plan before kickoff.
     */
    dryRun(req: CapabilityRequest): Promise<DryRunResult>;
}
/**
 * Runtime configuration for a concrete Broker implementation.
 * Currently a placeholder — the real shape will land with v1.5.1.
 */
interface BrokerConfig {
    /** OpenConductor API key. */
    apiKey: string;
    /** Registry endpoint URL. */
    registryUrl?: string;
    /** Vault endpoint URL (e.g. Supabase project URL). */
    vaultUrl?: string;
    /**
     * Tenant cache TTL in milliseconds. Default: 60_000.
     * Set to 0 to disable caching.
     */
    tenantCacheTtlMs?: number;
}
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
declare class NotImplementedBroker implements Broker {
    private fail;
    resolve(_req: CapabilityRequest): Promise<CapabilityResponse>;
    resolveStream(_req: CapabilityRequest): AsyncIterable<CapabilityChunk>;
    list(_tenantId: string, _filter?: {
        tag?: string;
    }): Promise<CapabilityDescriptor[]>;
    dryRun(_req: CapabilityRequest): Promise<DryRunResult>;
}

export { type Broker, type BrokerConfig, NotImplementedBroker };
