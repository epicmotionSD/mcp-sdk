'use strict';

var zod = require('zod');

// src/validate/index.ts
({
  /** Non-empty string */
  nonEmptyString: zod.z.string().min(1, "Cannot be empty"),
  /** Positive integer */
  positiveInt: zod.z.number().int().positive(),
  /** Pagination limit (1-100, default 10) */
  limit: zod.z.number().int().min(1).max(100).default(10),
  /** Pagination offset (>= 0, default 0) */
  offset: zod.z.number().int().min(0).default(0),
  /** URL string */
  url: zod.z.string().url(),
  /** Email string */
  email: zod.z.string().email(),
  /** UUID string */
  uuid: zod.z.string().uuid(),
  /** ISO date string */
  isoDate: zod.z.string().datetime(),
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: zod.z.union([
    zod.z.boolean(),
    zod.z.enum(["true", "false"]).transform((v) => v === "true")
  ])
});

// src/resolve/index.ts
var CapabilityName = zod.z.string().regex(/^[a-z0-9_-]+:[a-z0-9_-]+$/, {
  message: "capability must match '<resource>:<action>' (lowercase, hyphen/underscore allowed)"
});
var CapabilityConstraints = zod.z.object({
  region: zod.z.enum(["us", "eu", "global"]).optional(),
  compliance: zod.z.array(zod.z.enum(["soc2", "hipaa", "gdpr"])).optional(),
  maxLatencyMs: zod.z.number().int().positive().optional()
});
var CapabilityRequest = zod.z.object({
  capability: CapabilityName,
  /** Tenant identifier — Broker uses this to look up vault state and policy. */
  auth: zod.z.string().min(1),
  /** Free-form tags to bias semantic ranking (e.g. ['fast', 'pre-build']). */
  tags: zod.z.array(zod.z.string()).optional(),
  /** Free-form description to bias semantic ranking. */
  description: zod.z.string().optional(),
  /** Per-request cost ceiling in USD. Broker rejects with BudgetExceededError. */
  budget: zod.z.number().nonnegative().optional(),
  /** Caller-supplied correlation id (UUID). Propagated to telemetry. */
  traceId: zod.z.string().uuid().optional(),
  constraints: CapabilityConstraints.optional()
});
var CapabilityResponse = zod.z.object({
  /** Unique id for this resolution. Logged on telemetry events. */
  resolutionId: zod.z.string().uuid(),
  /** Identifier of the MCP server that handled the call. */
  serverId: zod.z.string().min(1),
  /** Server-shaped result payload. Type-erased at the SDK boundary. */
  result: zod.z.unknown(),
  /** Cost charged for this resolution in USD. */
  costApplied: zod.z.number().nonnegative(),
  /** End-to-end latency in milliseconds (Broker-measured). */
  latencyMs: zod.z.number().int().nonnegative()
});
var CapabilityChunk = zod.z.object({
  resolutionId: zod.z.string().uuid(),
  /** Monotonically increasing sequence number within a stream. */
  seq: zod.z.number().int().nonnegative(),
  /** Server-shaped partial result. */
  data: zod.z.unknown(),
  /** True on the final chunk; followed by no further chunks. */
  done: zod.z.boolean()
});
var CapabilityDescriptor = zod.z.object({
  capability: CapabilityName,
  serverId: zod.z.string().min(1),
  costPerCall: zod.z.number().nonnegative(),
  tags: zod.z.array(zod.z.string()).default([]),
  compliance: zod.z.array(zod.z.string()).default([])
});
var DryRunResult = zod.z.object({
  candidates: zod.z.array(CapabilityDescriptor),
  estimatedCost: zod.z.number().nonnegative(),
  blockers: zod.z.array(zod.z.string())
});

exports.CapabilityChunk = CapabilityChunk;
exports.CapabilityConstraints = CapabilityConstraints;
exports.CapabilityDescriptor = CapabilityDescriptor;
exports.CapabilityName = CapabilityName;
exports.CapabilityRequest = CapabilityRequest;
exports.CapabilityResponse = CapabilityResponse;
exports.DryRunResult = DryRunResult;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map