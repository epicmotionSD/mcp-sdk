# Getting Started with @openconductor/mcp-sdk

Build production-ready MCP servers in minutes. This guide walks you through installation, basic usage, and key concepts.

## Installation

```bash
npm install @openconductor/mcp-sdk
```

**Requirements:** Node.js 18+ 

## Zero-Config Demo Mode (New in v1.4)

Start building immediately with no API key required:

```typescript
import { initOpenConductor, initTelemetry } from '@openconductor/mcp-sdk'

// Demo mode activates automatically - no API key needed!
initOpenConductor({ serverName: 'my-server' })
initTelemetry()  // Logs to console in demo mode

// All features work:
// ✅ Telemetry → Console logging
// ✅ Payment → Mock billing (9999 credits, always allowed)
// ✅ Full type safety
```

When ready for production, just add your API key:

```typescript
initOpenConductor({ 
  apiKey: process.env.OPENCONDUCTOR_API_KEY,
  serverName: 'my-server' 
})
```

## Your First MCP Server

Here's a complete, production-ready MCP server in under 50 lines:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  wrapTool, 
  validateInput, 
  z, 
  createLogger,
  createHealthCheck,
  initTelemetry 
} from '@openconductor/mcp-sdk'

// 1. Initialize telemetry (optional but recommended)
initTelemetry({
  apiKey: process.env.OPENCONDUCTOR_API_KEY || 'oc_dev',
  serverName: 'my-first-server',
  serverVersion: '1.0.0'
})

// 2. Create a logger
const log = createLogger('my-first-server', { level: 'info', pretty: true })

// 3. Define your tool with validation
const greetTool = wrapTool(
  validateInput(
    z.object({
      name: z.string().min(1, 'Name is required'),
      formal: z.boolean().default(false)
    }),
    async (input) => {
      const greeting = input.formal 
        ? `Good day, ${input.name}. How may I assist you?`
        : `Hey ${input.name}! What's up?`
      return { greeting }
    }
  ),
  { name: 'greet', timeout: 5000 }
)

// 4. Create health check
const healthCheck = createHealthCheck({
  name: 'my-first-server',
  version: '1.0.0',
  uptime: () => process.uptime()
})

// 5. Wire it up to MCP
const server = new Server({ name: 'my-first-server', version: '1.0.0' }, {
  capabilities: { tools: {} }
})

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'greet',
    description: 'Generate a greeting',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Person to greet' },
        formal: { type: 'boolean', description: 'Use formal tone' }
      },
      required: ['name']
    }
  }]
}))

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'greet') {
    const result = await greetTool(request.params.arguments)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
  throw new Error('Tool not found')
})

// Start server
const transport = new StdioServerTransport()
server.connect(transport)
log.info('Server started')
```

## Core Concepts

### 1. Tool Wrapping

`wrapTool()` adds production features to any handler:

```typescript
const myTool = wrapTool(handler, {
  name: 'my-tool',      // Required: for logging/telemetry
  timeout: 5000,        // Auto-cancel after 5s
  telemetry: true       // Report metrics to OpenConductor
})
```

What you get automatically:
- **Timeout handling** - No more hanging requests
- **Error normalization** - All errors become JSON-RPC compliant
- **Logging** - Every call logged with duration and status
- **Telemetry** - Success rates, latency, error tracking

### 2. Input Validation

Never trust user input. `validateInput()` makes validation painless:

```typescript
const handler = validateInput(
  z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(100).default(10)
  }),
  async (input) => {
    // `input` is fully typed and validated
    // TypeScript knows: { query: string, limit: number }
    return search(input.query, input.limit)
  }
)
```

### 3. Structured Logging

JSON logs that work with any log aggregator:

```typescript
const log = createLogger('my-server', { 
  level: 'info',
  pretty: true  // Human-readable in dev
})

log.info('Processing request', { userId: '123', tool: 'search' })
// {"timestamp":"2025-01-22T...","level":"info","service":"my-server","message":"Processing request","userId":"123","tool":"search"}
```

### 4. Error Handling

Structured errors that clients can understand:

```typescript
import { ValidationError, ToolExecutionError } from '@openconductor/mcp-sdk/errors'

// Validation error with field context
throw new ValidationError('email', 'Invalid format', 'not-an-email')

// Execution error with cause tracking
throw new ToolExecutionError('fetch-data', 'API timeout', originalError)
```

## Next Steps

- **[Error Handling Guide](./errors.md)** - All error types and when to use them
- **[Validation Guide](./validation.md)** - Schema patterns and custom validators
- **[Telemetry Guide](./telemetry.md)** - Observability setup and dashboards
- **[API Reference](./api-reference.md)** - Complete API documentation
