# API Reference

Complete API documentation for @openconductor/mcp-sdk v1.0.

## Imports

```typescript
// Main exports
import { 
  // Errors
  MCPError, ValidationError, ToolNotFoundError, ToolExecutionError,
  ResourceNotFoundError, AuthenticationError, AuthorizationError,
  RateLimitError, TimeoutError, DependencyError, ConfigurationError,
  ErrorCodes, type ErrorCode,
  
  // Validation
  z, validate, validateInput, schemas, ZodError,
  type ZodSchema, type Infer, type ValidateOptions,
  
  // Logging
  createLogger, type Logger, type LogLevel, type LogEntry, type LoggerOptions,
  
  // Server
  createHealthCheck, wrapTool,
  type HealthCheckInfo, type HealthCheckResponse, type WrapToolOptions, type ToolContext,
  
  // Telemetry
  initTelemetry, getTelemetry, Telemetry,
  type TelemetryConfig, type ToolMetric, type TelemetryBatch
} from '@openconductor/mcp-sdk'

// Tree-shakeable imports
import { ValidationError } from '@openconductor/mcp-sdk/errors'
import { z, validate } from '@openconductor/mcp-sdk/validate'
import { createLogger } from '@openconductor/mcp-sdk/logger'
import { wrapTool } from '@openconductor/mcp-sdk/server'
import { initTelemetry } from '@openconductor/mcp-sdk/telemetry'
```

---

## Errors Module

### `MCPError`

Base error class. All other errors extend this.

```typescript
class MCPError extends Error {
  code: ErrorCode
  data?: Record<string, unknown>
  
  constructor(code: ErrorCode, message: string, data?: Record<string, unknown>)
  toJSON(): { code: number; message: string; data?: Record<string, unknown> }
  toResponse(id?: string | number | null): JsonRpcErrorResponse
}
```

### `ValidationError`

```typescript
new ValidationError(field: string, reason: string, value?: unknown)
```

### `ToolNotFoundError`

```typescript
new ToolNotFoundError(toolName: string)
```

### `ToolExecutionError`

```typescript
new ToolExecutionError(toolName: string, reason: string, cause?: Error)
```

### `ResourceNotFoundError`

```typescript
new ResourceNotFoundError(resourceUri: string)
```

### `AuthenticationError`

```typescript
new AuthenticationError(reason?: string)  // default: 'Authentication required'
```

### `AuthorizationError`

```typescript
new AuthorizationError(action: string, resource?: string)
```

### `RateLimitError`

```typescript
new RateLimitError(retryAfterMs?: number)
```

### `TimeoutError`

```typescript
new TimeoutError(operation: string, timeoutMs: number)
```

### `DependencyError`

```typescript
new DependencyError(dependency: string, reason: string)
```

### `ConfigurationError`

```typescript
new ConfigurationError(setting: string, reason: string)
```

### `ErrorCodes`

```typescript
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_NOT_FOUND: -32001,
  TOOL_EXECUTION_ERROR: -32002,
  RESOURCE_NOT_FOUND: -32003,
  AUTHENTICATION_ERROR: -32004,
  AUTHORIZATION_ERROR: -32005,
  RATE_LIMIT_ERROR: -32006,
  TIMEOUT_ERROR: -32007,
  VALIDATION_ERROR: -32008,
  DEPENDENCY_ERROR: -32009,
  CONFIGURATION_ERROR: -32010,
}
```

---

## Validation Module

### `validate<T>(schema, input, options?): T`

Validates input against Zod schema, throws `ValidationError` on failure.

```typescript
function validate<T>(
  schema: ZodSchema<T>,
  input: unknown,
  options?: ValidateOptions
): T
```

### `validateInput<TInput, TOutput>(schema, handler, options?)`

Wraps a handler with automatic input validation.

```typescript
function validateInput<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  handler: (input: TInput) => TOutput | Promise<TOutput>,
  options?: ValidateOptions
): (input: unknown) => Promise<TOutput>
```

### `ValidateOptions`

```typescript
interface ValidateOptions {
  stripUnknown?: boolean  // Remove unknown keys (default: true)
  formatError?: (error: ZodError) => string
}
```

### `schemas`

Built-in schema patterns:

```typescript
const schemas = {
  nonEmptyString: ZodString,      // .min(1)
  positiveInt: ZodNumber,         // .int().positive()
  limit: ZodNumber,               // .int().min(1).max(100).default(10)
  offset: ZodNumber,              // .int().min(0).default(0)
  url: ZodString,                 // .url()
  email: ZodString,               // .email()
  uuid: ZodString,                // .uuid()
  isoDate: ZodString,             // .datetime()
  booleanish: ZodUnion,           // boolean | 'true' | 'false'
}
```

### `Infer<T>`

Type helper to extract TypeScript type from Zod schema.

```typescript
type Infer<T extends ZodSchema> = z.infer<T>
```

---

## Logger Module

### `createLogger(service, options?): Logger`

Creates a structured JSON logger.

```typescript
function createLogger(service: string, options?: LoggerOptions): Logger

interface LoggerOptions {
  level?: LogLevel        // 'debug' | 'info' | 'warn' | 'error' (default: 'info')
  output?: (entry: LogEntry) => void  // Custom output handler
  timestamps?: boolean    // Include timestamps (default: true)
  pretty?: boolean        // Pretty print JSON (default: false)
}
```

### `Logger`

```typescript
interface Logger {
  debug(message: string, data?: Record<string, unknown>): LogEntry | undefined
  info(message: string, data?: Record<string, unknown>): LogEntry | undefined
  warn(message: string, data?: Record<string, unknown>): LogEntry | undefined
  error(message: string, data?: Record<string, unknown>): LogEntry | undefined
  child(context: Record<string, unknown>): Logger
}
```

### `LogEntry`

```typescript
interface LogEntry {
  timestamp?: string
  level: LogLevel
  service: string
  message: string
  [key: string]: unknown
}
```

---

## Server Module

### `wrapTool<TInput, TOutput>(handler, options)`

Wraps a tool handler with error handling, logging, timeouts, and telemetry.

```typescript
function wrapTool<TInput, TOutput>(
  handler: (input: TInput, ctx: ToolContext) => TOutput | Promise<TOutput>,
  options: WrapToolOptions
): (input: TInput) => Promise<TOutput>

interface WrapToolOptions {
  name: string           // Tool name (required)
  timeout?: number       // Timeout in ms (default: 30000)
  logger?: Logger        // Custom logger instance
  telemetry?: boolean    // Enable telemetry (default: true)
}
```

### `ToolContext`

Passed to wrapped handlers:

```typescript
interface ToolContext {
  callId: string    // Unique call ID
  name: string      // Tool name
  startTime: number // Start timestamp
  log: Logger       // Scoped logger with callId
}
```

### `createHealthCheck(info)`

Creates a health check endpoint.

```typescript
function createHealthCheck(info: HealthCheckInfo): () => Promise<HealthCheckResponse>

interface HealthCheckInfo {
  name: string
  version: string
  description?: string
  uptime?: () => number
  checks?: Record<string, () => Promise<boolean> | boolean>
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  name: string
  version: string
  description?: string
  uptime?: number
  timestamp: string
  checks?: Record<string, boolean>
}
```

---

## Telemetry Module

### `initTelemetry(config): Telemetry`

Initialize telemetry. Call once at startup.

```typescript
function initTelemetry(config: TelemetryConfig): Telemetry

interface TelemetryConfig {
  apiKey: string           // OpenConductor API key
  serverName: string       // Server identifier
  serverVersion?: string   // Server version
  endpoint?: string        // Custom endpoint
  batchSize?: number       // Flush after N metrics (default: 10)
  flushInterval?: number   // Flush every N ms (default: 30000)
  debug?: boolean          // Log events (default: false)
}
```

### `getTelemetry(): Telemetry | null`

Get the global telemetry instance.

### `Telemetry`

```typescript
class Telemetry {
  trackToolCall(
    tool: string,
    duration: number,
    success: boolean,
    error?: string
  ): void
  
  flush(): Promise<void>
  shutdown(): void
}
```

### `ToolMetric`

```typescript
interface ToolMetric {
  tool: string
  duration: number
  success: boolean
  error?: string
  timestamp: string
}
```
