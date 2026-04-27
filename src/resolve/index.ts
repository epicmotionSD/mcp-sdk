/**
 * Capability Mesh — request/response schemas (v1.5.0)
 *
 * Defines the wire contract between consumers (x3o.ai, GodotForge, …) and
 * the OpenConductor Broker. Schemas are exported as Zod for validation and
 * as TypeScript types for static checks.
 *
 * @see docs/architecture.md (section 4)
 */
import { z } from '../validate'

// ============================================================================
// CapabilityRequest
// ============================================================================

/**
 * Namespaced verb identifying what the caller wants done.
 * Format: `<resource>:<action>` — e.g. `database:write`, `lint:gdscript`.
 */
export const CapabilityName = z
  .string()
  .regex(/^[a-z0-9_-]+:[a-z0-9_-]+$/, {
    message: "capability must match '<resource>:<action>' (lowercase, hyphen/underscore allowed)",
  })

/**
 * Hard requirements applied as filters on candidate MCP servers.
 * Candidates that don't satisfy every constraint are dropped before ranking.
 */
export const CapabilityConstraints = z.object({
  region: z.enum(['us', 'eu', 'global']).optional(),
  compliance: z.array(z.enum(['soc2', 'hipaa', 'gdpr'])).optional(),
  maxLatencyMs: z.number().int().positive().optional(),
})

export type CapabilityConstraints = z.infer<typeof CapabilityConstraints>

/**
 * The wire-level request that consumers send to the Broker.
 *
 * @example
 * const req: CapabilityRequest = {
 *   capability: 'database:write',
 *   auth: 'tenant_id_123',
 *   budget: 0.05,
 * }
 */
export const CapabilityRequest = z.object({
  capability: CapabilityName,

  /** Tenant identifier — Broker uses this to look up vault state and policy. */
  auth: z.string().min(1),

  /** Free-form tags to bias semantic ranking (e.g. ['fast', 'pre-build']). */
  tags: z.array(z.string()).optional(),

  /** Free-form description to bias semantic ranking. */
  description: z.string().optional(),

  /** Per-request cost ceiling in USD. Broker rejects with BudgetExceededError. */
  budget: z.number().nonnegative().optional(),

  /** Caller-supplied correlation id (UUID). Propagated to telemetry. */
  traceId: z.string().uuid().optional(),

  constraints: CapabilityConstraints.optional(),
})

export type CapabilityRequest = z.infer<typeof CapabilityRequest>

// ============================================================================
// CapabilityResponse
// ============================================================================

/**
 * Returned on a successful resolve(). The `result` payload is shaped by the
 * underlying MCP server's tool — consumers must validate it against their
 * own contract.
 */
export const CapabilityResponse = z.object({
  /** Unique id for this resolution. Logged on telemetry events. */
  resolutionId: z.string().uuid(),

  /** Identifier of the MCP server that handled the call. */
  serverId: z.string().min(1),

  /** Server-shaped result payload. Type-erased at the SDK boundary. */
  result: z.unknown(),

  /** Cost charged for this resolution in USD. */
  costApplied: z.number().nonnegative(),

  /** End-to-end latency in milliseconds (Broker-measured). */
  latencyMs: z.number().int().nonnegative(),
})

export type CapabilityResponse = z.infer<typeof CapabilityResponse>

// ============================================================================
// Streaming
// ============================================================================

/**
 * Chunk type yielded by `Broker.resolveStream()` for long-running
 * capabilities (e.g. asset optimization).
 *
 * The runtime protocol (SSE / WebSocket / MCP-native) is left open — see
 * docs/architecture.md section 8.
 */
export const CapabilityChunk = z.object({
  resolutionId: z.string().uuid(),
  /** Monotonically increasing sequence number within a stream. */
  seq: z.number().int().nonnegative(),
  /** Server-shaped partial result. */
  data: z.unknown(),
  /** True on the final chunk; followed by no further chunks. */
  done: z.boolean(),
})

export type CapabilityChunk = z.infer<typeof CapabilityChunk>

// ============================================================================
// Descriptors
// ============================================================================

/**
 * Summary of a capability that a tenant *could* invoke right now. Returned
 * by `Broker.list()` and `Broker.dryRun()` for UI rendering and pre-flight.
 */
export const CapabilityDescriptor = z.object({
  capability: CapabilityName,
  serverId: z.string().min(1),
  costPerCall: z.number().nonnegative(),
  tags: z.array(z.string()).default([]),
  compliance: z.array(z.string()).default([]),
})

export type CapabilityDescriptor = z.infer<typeof CapabilityDescriptor>

/**
 * Result of `Broker.dryRun()`. `blockers` is a human-readable list of
 * reasons the resolve would fail (missing creds, budget, policy, etc.).
 * GodotForge uses this for pre-flight validation before kicking off a build.
 */
export const DryRunResult = z.object({
  candidates: z.array(CapabilityDescriptor),
  estimatedCost: z.number().nonnegative(),
  blockers: z.array(z.string()),
})

export type DryRunResult = z.infer<typeof DryRunResult>
