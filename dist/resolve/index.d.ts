import { z } from 'zod';

/**
 * Capability Mesh — request/response schemas (v1.5.0)
 *
 * Defines the wire contract between consumers (x3o.ai, GodotForge, …) and
 * the OpenConductor Broker. Schemas are exported as Zod for validation and
 * as TypeScript types for static checks.
 *
 * @see docs/architecture.md (section 4)
 */

/**
 * Namespaced verb identifying what the caller wants done.
 * Format: `<resource>:<action>` — e.g. `database:write`, `lint:gdscript`.
 */
declare const CapabilityName: z.ZodString;
/**
 * Hard requirements applied as filters on candidate MCP servers.
 * Candidates that don't satisfy every constraint are dropped before ranking.
 */
declare const CapabilityConstraints: z.ZodObject<{
    region: z.ZodOptional<z.ZodEnum<["us", "eu", "global"]>>;
    compliance: z.ZodOptional<z.ZodArray<z.ZodEnum<["soc2", "hipaa", "gdpr"]>, "many">>;
    maxLatencyMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    region?: "us" | "eu" | "global" | undefined;
    compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
    maxLatencyMs?: number | undefined;
}, {
    region?: "us" | "eu" | "global" | undefined;
    compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
    maxLatencyMs?: number | undefined;
}>;
type CapabilityConstraints = z.infer<typeof CapabilityConstraints>;
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
declare const CapabilityRequest: z.ZodObject<{
    capability: z.ZodString;
    /** Tenant identifier — Broker uses this to look up vault state and policy. */
    auth: z.ZodString;
    /** Free-form tags to bias semantic ranking (e.g. ['fast', 'pre-build']). */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Free-form description to bias semantic ranking. */
    description: z.ZodOptional<z.ZodString>;
    /** Per-request cost ceiling in USD. Broker rejects with BudgetExceededError. */
    budget: z.ZodOptional<z.ZodNumber>;
    /** Caller-supplied correlation id (UUID). Propagated to telemetry. */
    traceId: z.ZodOptional<z.ZodString>;
    constraints: z.ZodOptional<z.ZodObject<{
        region: z.ZodOptional<z.ZodEnum<["us", "eu", "global"]>>;
        compliance: z.ZodOptional<z.ZodArray<z.ZodEnum<["soc2", "hipaa", "gdpr"]>, "many">>;
        maxLatencyMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        region?: "us" | "eu" | "global" | undefined;
        compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
        maxLatencyMs?: number | undefined;
    }, {
        region?: "us" | "eu" | "global" | undefined;
        compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
        maxLatencyMs?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    capability: string;
    auth: string;
    description?: string | undefined;
    tags?: string[] | undefined;
    budget?: number | undefined;
    traceId?: string | undefined;
    constraints?: {
        region?: "us" | "eu" | "global" | undefined;
        compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
        maxLatencyMs?: number | undefined;
    } | undefined;
}, {
    capability: string;
    auth: string;
    description?: string | undefined;
    tags?: string[] | undefined;
    budget?: number | undefined;
    traceId?: string | undefined;
    constraints?: {
        region?: "us" | "eu" | "global" | undefined;
        compliance?: ("soc2" | "hipaa" | "gdpr")[] | undefined;
        maxLatencyMs?: number | undefined;
    } | undefined;
}>;
type CapabilityRequest = z.infer<typeof CapabilityRequest>;
/**
 * Returned on a successful resolve(). The `result` payload is shaped by the
 * underlying MCP server's tool — consumers must validate it against their
 * own contract.
 */
declare const CapabilityResponse: z.ZodObject<{
    /** Unique id for this resolution. Logged on telemetry events. */
    resolutionId: z.ZodString;
    /** Identifier of the MCP server that handled the call. */
    serverId: z.ZodString;
    /** Server-shaped result payload. Type-erased at the SDK boundary. */
    result: z.ZodUnknown;
    /** Cost charged for this resolution in USD. */
    costApplied: z.ZodNumber;
    /** End-to-end latency in milliseconds (Broker-measured). */
    latencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    resolutionId: string;
    serverId: string;
    costApplied: number;
    latencyMs: number;
    result?: unknown;
}, {
    resolutionId: string;
    serverId: string;
    costApplied: number;
    latencyMs: number;
    result?: unknown;
}>;
type CapabilityResponse = z.infer<typeof CapabilityResponse>;
/**
 * Chunk type yielded by `Broker.resolveStream()` for long-running
 * capabilities (e.g. asset optimization).
 *
 * The runtime protocol (SSE / WebSocket / MCP-native) is left open — see
 * docs/architecture.md section 8.
 */
declare const CapabilityChunk: z.ZodObject<{
    resolutionId: z.ZodString;
    /** Monotonically increasing sequence number within a stream. */
    seq: z.ZodNumber;
    /** Server-shaped partial result. */
    data: z.ZodUnknown;
    /** True on the final chunk; followed by no further chunks. */
    done: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    resolutionId: string;
    seq: number;
    done: boolean;
    data?: unknown;
}, {
    resolutionId: string;
    seq: number;
    done: boolean;
    data?: unknown;
}>;
type CapabilityChunk = z.infer<typeof CapabilityChunk>;
/**
 * Summary of a capability that a tenant *could* invoke right now. Returned
 * by `Broker.list()` and `Broker.dryRun()` for UI rendering and pre-flight.
 */
declare const CapabilityDescriptor: z.ZodObject<{
    capability: z.ZodString;
    serverId: z.ZodString;
    costPerCall: z.ZodNumber;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    compliance: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    capability: string;
    compliance: string[];
    tags: string[];
    serverId: string;
    costPerCall: number;
}, {
    capability: string;
    serverId: string;
    costPerCall: number;
    compliance?: string[] | undefined;
    tags?: string[] | undefined;
}>;
type CapabilityDescriptor = z.infer<typeof CapabilityDescriptor>;
/**
 * Result of `Broker.dryRun()`. `blockers` is a human-readable list of
 * reasons the resolve would fail (missing creds, budget, policy, etc.).
 * GodotForge uses this for pre-flight validation before kicking off a build.
 */
declare const DryRunResult: z.ZodObject<{
    candidates: z.ZodArray<z.ZodObject<{
        capability: z.ZodString;
        serverId: z.ZodString;
        costPerCall: z.ZodNumber;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        compliance: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        capability: string;
        compliance: string[];
        tags: string[];
        serverId: string;
        costPerCall: number;
    }, {
        capability: string;
        serverId: string;
        costPerCall: number;
        compliance?: string[] | undefined;
        tags?: string[] | undefined;
    }>, "many">;
    estimatedCost: z.ZodNumber;
    blockers: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    candidates: {
        capability: string;
        compliance: string[];
        tags: string[];
        serverId: string;
        costPerCall: number;
    }[];
    estimatedCost: number;
    blockers: string[];
}, {
    candidates: {
        capability: string;
        serverId: string;
        costPerCall: number;
        compliance?: string[] | undefined;
        tags?: string[] | undefined;
    }[];
    estimatedCost: number;
    blockers: string[];
}>;
type DryRunResult = z.infer<typeof DryRunResult>;

export { CapabilityChunk, CapabilityConstraints, CapabilityDescriptor, CapabilityName, CapabilityRequest, CapabilityResponse, DryRunResult };
