import { z } from 'zod';

// src/validate/index.ts
({
  /** Non-empty string */
  nonEmptyString: z.string().min(1, "Cannot be empty"),
  /** Positive integer */
  positiveInt: z.number().int().positive(),
  /** Pagination limit (1-100, default 10) */
  limit: z.number().int().min(1).max(100).default(10),
  /** Pagination offset (>= 0, default 0) */
  offset: z.number().int().min(0).default(0),
  /** URL string */
  url: z.string().url(),
  /** Email string */
  email: z.string().email(),
  /** UUID string */
  uuid: z.string().uuid(),
  /** ISO date string */
  isoDate: z.string().datetime(),
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: z.union([
    z.boolean(),
    z.enum(["true", "false"]).transform((v) => v === "true")
  ])
});

// src/resolve/index.ts
var CapabilityName = z.string().regex(/^[a-z0-9_-]+:[a-z0-9_-]+$/, {
  message: "capability must match '<resource>:<action>' (lowercase, hyphen/underscore allowed)"
});
var CapabilityConstraints = z.object({
  region: z.enum(["us", "eu", "global"]).optional(),
  compliance: z.array(z.enum(["soc2", "hipaa", "gdpr"])).optional(),
  maxLatencyMs: z.number().int().positive().optional()
});
var CapabilityRequest = z.object({
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
  constraints: CapabilityConstraints.optional()
});
var CapabilityResponse = z.object({
  /** Unique id for this resolution. Logged on telemetry events. */
  resolutionId: z.string().uuid(),
  /** Identifier of the MCP server that handled the call. */
  serverId: z.string().min(1),
  /** Server-shaped result payload. Type-erased at the SDK boundary. */
  result: z.unknown(),
  /** Cost charged for this resolution in USD. */
  costApplied: z.number().nonnegative(),
  /** End-to-end latency in milliseconds (Broker-measured). */
  latencyMs: z.number().int().nonnegative()
});
var CapabilityChunk = z.object({
  resolutionId: z.string().uuid(),
  /** Monotonically increasing sequence number within a stream. */
  seq: z.number().int().nonnegative(),
  /** Server-shaped partial result. */
  data: z.unknown(),
  /** True on the final chunk; followed by no further chunks. */
  done: z.boolean()
});
var CapabilityDescriptor = z.object({
  capability: CapabilityName,
  serverId: z.string().min(1),
  costPerCall: z.number().nonnegative(),
  tags: z.array(z.string()).default([]),
  compliance: z.array(z.string()).default([])
});
var DryRunResult = z.object({
  candidates: z.array(CapabilityDescriptor),
  estimatedCost: z.number().nonnegative(),
  blockers: z.array(z.string())
});

export { CapabilityChunk, CapabilityConstraints, CapabilityDescriptor, CapabilityName, CapabilityRequest, CapabilityResponse, DryRunResult };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map