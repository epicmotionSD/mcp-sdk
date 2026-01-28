# @openconductor/mcp-sdk

**The standard SDK for building production-ready MCP servers.**

Stop copy-pasting boilerplate. Get error handling, validation, logging, telemetry, and **one-line monetization** out of the box.

[![npm version](https://badge.fury.io/js/%40openconductor%2Fmcp-sdk.svg)](https://www.npmjs.com/package/@openconductor/mcp-sdk)
[![Downloads](https://img.shields.io/npm/dw/@openconductor/mcp-sdk)](https://www.npmjs.com/package/@openconductor/mcp-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Why This SDK?

Every MCP server needs the same things:

| Feature | Without SDK | With SDK |
|---------|-------------|----------|
| **Error Handling** | 50+ lines of JSON-RPC formatting | Built-in, spec-compliant |
| **Input Validation** | Manual checks, type-unsafe | Zod schemas, fully typed |
| **Logging** | console.log chaos | Structured JSON, log-aggregator ready |
| **Telemetry** | Flying blind | One-line setup, real dashboards |
| **Monetization** | Build your own billing | One-line `requirePayment()` |
| **Timeouts** | None (hung requests) | Automatic with configurable limits |

All in **~20kb**, zero config required.

## Install

```bash
npm install @openconductor/mcp-sdk
```

**Requirements:** Node.js 18+

## 🎮 Zero-Config Demo Mode

**New in v1.4:** Start building immediately with no API key required!

```typescript
import { initOpenConductor, initTelemetry, requirePayment } from '@openconductor/mcp-sdk'

// That's it! Demo mode activates automatically
initOpenConductor({ serverName: 'my-server' })

// All features work - telemetry logs to console, payments are mocked
const telemetry = initTelemetry()  // Logs to console in demo mode
const paidTool = requirePayment({ credits: 10 })(myHandler)  // Always allows, 9999 mock credits
```

Demo mode provides:
- ✅ **Mock billing** — Always allowed, 9999 credits, no real charges
- ✅ **Console telemetry** — All metrics logged locally for debugging
- ✅ **Full type safety** — Same types and interfaces as production
- ✅ **Zero setup** — Just import and go

When you're ready for production, just add your API key:

```typescript
initOpenConductor({ 
  apiKey: process.env.OPENCONDUCTOR_API_KEY,
  serverName: 'my-server' 
})
```

## Quick Start

```typescript
import { 
  initOpenConductor,
  wrapTool, 
  validateInput, 
  z, 
  createLogger,
  initTelemetry 
} from '@openconductor/mcp-sdk'

// Initialize the SDK (demo mode if no API key)
initOpenConductor({
  serverName: 'my-server',
  serverVersion: '1.0.0',
  // apiKey: 'oc_xxx'  // Add for production
})

// Enable observability (console in demo, API in production)
initTelemetry()

// Create a validated, wrapped tool in seconds
const searchTool = wrapTool(
  validateInput(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().positive().default(10)
    }),
    async (input) => {
      // input is typed: { query: string, limit: number }
      return { results: await db.search(input.query, input.limit) }
    }
  ),
  { name: 'search', timeout: 5000 }
)

// Automatic error handling, logging, and telemetry
const result = await searchTool({ query: 'hello', limit: 5 })
```

## Features

### 🛡️ Error Handling

JSON-RPC 2.0 compliant errors with rich context:

```typescript
import { ValidationError, ToolExecutionError } from '@openconductor/mcp-sdk/errors'

throw new ValidationError('amount', 'Must be positive', -5)
// → { code: -32602, message: "Validation failed...", data: { field, reason, value } }
```

**10 error types included:** ValidationError, ToolNotFoundError, ToolExecutionError, ResourceNotFoundError, AuthenticationError, AuthorizationError, RateLimitError, TimeoutError, DependencyError, ConfigurationError

[→ Error Handling Guide](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/errors.md)

### ✅ Validation

Zod-powered with MCP-specific helpers:

```typescript
import { validateInput, z, schemas } from '@openconductor/mcp-sdk'

const handler = validateInput(
  z.object({
    query: schemas.nonEmptyString,
    limit: schemas.limit,      // 1-100, default 10
    email: schemas.email,
    url: schemas.url,
  }),
  async (input) => doSomething(input)  // Fully typed!
)
```

[→ Validation Guide](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/validation.md)

### 📝 Logging

Structured JSON that works with any log aggregator:

```typescript
import { createLogger } from '@openconductor/mcp-sdk/logger'

const log = createLogger('my-server', { level: 'info', pretty: true })

log.info('Tool invoked', { tool: 'search', userId: 'abc' })
// {"timestamp":"...","level":"info","service":"my-server","message":"Tool invoked","tool":"search","userId":"abc"}

const toolLog = log.child({ requestId: 'req_123' })  // Scoped context
```

### 🔧 Server Utilities

Health checks and tool wrappers:

```typescript
import { createHealthCheck, wrapTool } from '@openconductor/mcp-sdk/server'

// Standard health endpoint
const healthCheck = createHealthCheck({
  name: 'my-server',
  version: '1.0.0',
  checks: {
    database: async () => db.ping(),
    redis: async () => redis.ping(),
  }
})
// → { status: 'healthy', checks: { database: true, redis: true }, ... }

// Wrap any handler with production features
const safeTool = wrapTool(myHandler, {
  name: 'my-tool',
  timeout: 5000,  // Auto-timeout
})
```

### 📊 Telemetry

Optional observability for production (console logging in demo mode):

```typescript
import { initOpenConductor, initTelemetry } from '@openconductor/mcp-sdk'

// Demo mode - logs to console
initOpenConductor({ serverName: 'my-server' })
initTelemetry()
// [🎮 DEMO] Telemetry track: { tool: "search", duration: "45ms", success: true }

// Production mode - sends to OpenConductor
initOpenConductor({
  apiKey: 'oc_xxx',
  serverName: 'my-server',
})
initTelemetry()

// All wrapped tools automatically report:
// ✓ Invocation counts
// ✓ Success/failure rates
// ✓ Latency percentiles (p50, p95, p99)
// ✓ Error messages
```

**Privacy:** Only tool names, durations, and errors are sent. Never inputs, outputs, or user data.

[→ Telemetry Guide](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/telemetry.md)

### 💰 One-Line Monetization

Charge for your MCP tools with credits, subscriptions, or per-call:

```typescript
import { initOpenConductor, initPayment, requirePayment } from '@openconductor/mcp-sdk'

// Demo mode - mock billing (always allowed, 9999 credits)
initOpenConductor({ serverName: 'my-server' })
initPayment()  // Auto-configures for demo mode

// Production mode
initOpenConductor({ apiKey: 'oc_xxx', serverName: 'my-server' })
initPayment()

// Credits-based
const paidTool = requirePayment({ credits: 10 })(myHandler)

// Subscription tier
const premiumTool = requirePayment({ tier: 'pro' })(myHandler)

// Works with wrapTool
const safePaidTool = wrapTool(
  requirePayment({ credits: 5 })(myHandler),
  { name: 'premium-analysis' }
)
```

[→ Monetization Guide](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/payment.md)

## Tree-Shakeable Imports

Import only what you need:

```typescript
// Full SDK
import { z, validate, wrapTool, createLogger, requirePayment } from '@openconductor/mcp-sdk'

// Or specific modules (smaller bundles)
import { ValidationError } from '@openconductor/mcp-sdk/errors'
import { z, validate } from '@openconductor/mcp-sdk/validate'
import { createLogger } from '@openconductor/mcp-sdk/logger'
import { wrapTool } from '@openconductor/mcp-sdk/server'
import { initTelemetry } from '@openconductor/mcp-sdk/telemetry'
import { requirePayment } from '@openconductor/mcp-sdk/payment'
```

## Documentation

- **[Getting Started](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/getting-started.md)** — Build your first server
- **[Error Handling](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/errors.md)** — All error types and usage
- **[Validation](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/validation.md)** — Schema patterns and helpers
- **[Telemetry](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/telemetry.md)** — Observability setup
- **[Monetization](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/payment.md)** — One-line payment gates
- **[API Reference](https://github.com/epicmotionSD/mcp-sdk/blob/main/docs/api-reference.md)** — Complete API docs

## Examples

### Full MCP Server

See [examples/full-server](https://github.com/epicmotionSD/mcp-sdk/tree/main/examples/full-server) for a complete implementation.

### FastMCP Integration

```typescript
import FastMCP from 'fastmcp'
import { wrapTool, validateInput, z } from '@openconductor/mcp-sdk'

const server = new FastMCP({ name: 'my-server' })

server.addTool({
  name: 'greet',
  description: 'Generate a greeting',
  parameters: z.object({ name: z.string() }),
  execute: wrapTool(
    validateInput(z.object({ name: z.string() }), async ({ name }) => {
      return `Hello, ${name}!`
    }),
    { name: 'greet', timeout: 5000 }
  )
})
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/epicmotionSD/mcp-sdk/blob/main/CONTRIBUTING.md).

## License

MIT © [OpenConductor](https://openconductor.ai)
