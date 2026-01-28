# Demo Mode Implementation - Main Exports

## File: src/index.ts

### Add new exports:

```typescript
// Configuration (NEW - single entry point)
export {
  initOpenConductor,
  getConfig,
  isDemoMode,
  isInitialized,
  resetConfig,
  type OpenConductorConfig,
  type ResolvedConfig,
} from './config'

// Demo utilities (for advanced users)
export {
  MOCK_BILLING_STATUS,
  MOCK_USER_BILLING,
  MOCK_CREDIT_PACKS,
  getMockAnalytics,
  demoLogger,
} from './demo'
```

---

# Usage Examples

## Zero-Config Demo (The Dream)

```typescript
import { initOpenConductor, requirePayment, wrapTool } from '@openconductor/mcp-sdk'

// No API key? No problem. Demo mode auto-activates.
initOpenConductor({
  serverName: 'my-awesome-server',
  serverVersion: '1.0.0'
})

// Everything just works with mock data
const paidTool = wrapTool(
  requirePayment({ credits: 10 })(async (input) => {
    return { result: 'Hello from demo!' }
  }),
  { name: 'my-tool' }
)

// Console output:
// ┌─────────────────────────────────────────────────────────────────┐
// │   🎮  DEMO MODE ACTIVE                                          │
// │   ...                                                           │
// └─────────────────────────────────────────────────────────────────┘
```

## Production Mode

```typescript
import { initOpenConductor, requirePayment, wrapTool } from '@openconductor/mcp-sdk'

// API key provided = production mode
initOpenConductor({
  apiKey: process.env.OPENCONDUCTOR_API_KEY,
  serverName: 'my-awesome-server',
  serverVersion: '1.0.0'
})

// Real billing, real telemetry
const paidTool = wrapTool(
  requirePayment({ credits: 10 })(async (input) => {
    return { result: 'Hello from production!' }
  }),
  { name: 'my-tool' }
)

// Console output:
// ┌─────────────────────────────────────────────────────────────────┐
// │   ✅  OpenConductor SDK initialized (production mode)           │
// └─────────────────────────────────────────────────────────────────┘
```

## Environment Variable Auto-Detection

```bash
# .env file
OPENCONDUCTOR_API_KEY=oc_live_xxx
OPENCONDUCTOR_SERVER_NAME=my-server
```

```typescript
import { initOpenConductor } from '@openconductor/mcp-sdk'

// Reads from env vars automatically
initOpenConductor()

// If OPENCONDUCTOR_API_KEY exists → production mode
// If missing → demo mode
```

## Force Demo Mode (Testing)

```typescript
import { initOpenConductor } from '@openconductor/mcp-sdk'

// Force demo even if API key exists
initOpenConductor({ 
  demoMode: true,
  quiet: true  // Suppress banner for tests
})
```

---

# Migration Guide

## Before (v1.x)

```typescript
// Old way - required separate init for each module
import { initPayment, initTelemetry } from '@openconductor/mcp-sdk'

initTelemetry({
  apiKey: process.env.OPENCONDUCTOR_API_KEY!,  // Would crash if missing!
  serverName: 'my-server'
})

initPayment({
  apiKey: process.env.OPENCONDUCTOR_API_KEY!,  // Would crash if missing!
})
```

## After (v2.x with Demo Mode)

```typescript
// New way - single init, auto-fallback
import { initOpenConductor } from '@openconductor/mcp-sdk'

initOpenConductor({
  serverName: 'my-server'
})
// That's it. Demo mode if no key, production if key exists.
```

---

# Implementation Checklist

- [x] Create src/config/index.ts - Global config singleton
- [x] Create src/demo/index.ts - Mock data for demo mode
- [ ] Modify src/payment/index.ts - Integrate isDemoMode() checks
- [ ] Modify src/telemetry/index.ts - Add DemoTelemetry class
- [ ] Update src/index.ts - Export new modules
- [ ] Update README.md - Document zero-config experience
- [ ] Add tests for demo mode behavior
- [ ] Bump version to 2.0.0 (breaking: new init pattern)
