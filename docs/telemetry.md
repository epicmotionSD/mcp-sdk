# Telemetry Guide

OpenConductor Telemetry gives you visibility into your MCP server's performance in production. Know what's working, what's failing, and how fast.

## Quick Start

```typescript
import { initTelemetry, wrapTool } from '@openconductor/mcp-sdk'

// Initialize once at startup
initTelemetry({
  apiKey: process.env.OPENCONDUCTOR_API_KEY,
  serverName: 'my-mcp-server',
  serverVersion: '1.0.0'
})

// Tools wrapped with wrapTool() automatically report metrics
const myTool = wrapTool(handler, { name: 'my-tool' })
```

That's it. All wrapped tools now report:
- Invocation counts
- Success/failure rates  
- Latency (p50, p95, p99)
- Error messages

## Configuration

```typescript
interface TelemetryConfig {
  apiKey: string           // Your OpenConductor API key
  serverName: string       // Identifies your server
  serverVersion?: string   // Your server version
  endpoint?: string        // Custom endpoint (default: production)
  batchSize?: number       // Flush after N metrics (default: 10)
  flushInterval?: number   // Flush every N ms (default: 30000)
  debug?: boolean          // Log telemetry events (default: false)
}

initTelemetry({
  apiKey: 'oc_live_xxx',
  serverName: 'search-server',
  serverVersion: '2.1.0',
  batchSize: 20,           // Batch more for high-volume servers
  flushInterval: 60000,    // Flush every minute
  debug: true              // See telemetry in local logs
})
```

## What Gets Sent

Every tool invocation sends:

```typescript
interface ToolMetric {
  tool: string      // Tool name
  duration: number  // Execution time (ms)
  success: boolean  // Did it succeed?
  error?: string    // Error message (if failed)
  timestamp: string // ISO timestamp
}
```

Batched with metadata:

```typescript
interface TelemetryBatch {
  serverName: string
  serverVersion?: string
  metrics: ToolMetric[]
  meta: {
    sdkVersion: string   // SDK version
    nodeVersion: string  // Node.js version
    platform: string     // OS platform
  }
}
```

## What's Never Sent

- Tool inputs or outputs
- User data or PII
- Request/response bodies
- Full stack traces
- Environment variables

## Manual Tracking

For custom metrics outside `wrapTool`:

```typescript
import { getTelemetry } from '@openconductor/mcp-sdk/telemetry'

const telemetry = getTelemetry()

// Track custom operation
const start = Date.now()
try {
  await customOperation()
  telemetry?.trackToolCall('custom-op', Date.now() - start, true)
} catch (error) {
  telemetry?.trackToolCall('custom-op', Date.now() - start, false, error.message)
}
```

## Flushing

Metrics batch automatically, but you can force a flush:

```typescript
const telemetry = getTelemetry()
await telemetry?.flush()
```

Automatic flush happens:
- When batch size reached
- Every `flushInterval` milliseconds
- On process exit (SIGINT, SIGTERM)

## Shutdown

Clean shutdown ensures no metrics are lost:

```typescript
const telemetry = getTelemetry()
telemetry?.shutdown()  // Flushes remaining metrics and stops timers
```

## Debug Mode

Enable debug to see telemetry in your logs:

```typescript
initTelemetry({
  apiKey: 'oc_xxx',
  serverName: 'my-server',
  debug: true  // Logs all telemetry events
})

// Console output:
// {"timestamp":"...","level":"debug","service":"openconductor-telemetry","message":"Metric tracked","tool":"search","duration":45,"success":true}
// {"timestamp":"...","level":"debug","service":"openconductor-telemetry","message":"Flushing metrics","count":10}
```

## Disable for Tests

In tests, don't initialize telemetry or use a null API key:

```typescript
// Option 1: Don't initialize
// Option 2: Use test key
if (process.env.NODE_ENV !== 'test') {
  initTelemetry({
    apiKey: process.env.OPENCONDUCTOR_API_KEY,
    serverName: 'my-server'
  })
}

// Option 3: Disable telemetry in wrapTool
const tool = wrapTool(handler, { 
  name: 'my-tool',
  telemetry: false  // Skip reporting
})
```

## Getting an API Key

1. Go to [openconductor.ai](https://openconductor.ai)
2. Sign up for free tier (10k events/month)
3. Create a project and copy your API key
4. Add to environment: `OPENCONDUCTOR_API_KEY=oc_live_xxx`

## Dashboard

View your metrics at [openconductor.dev/dashboard](https://openconductor.dev/dashboard):
- Real-time tool invocation graphs
- Error rate trends
- Latency percentiles
- Top tools by volume
- Recent errors with messages
