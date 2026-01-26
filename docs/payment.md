# Payment & Monetization

One-line monetization for MCP tools. Add payment gates, credit systems, or subscription tiers with minimal code.

## Quick Start

```typescript
import { initPayment, requirePayment } from '@openconductor/mcp-sdk/payment'

// Initialize once at startup
initPayment({
  apiKey: process.env.OPENCONDUCTOR_API_KEY!,
  upgradeUrl: 'https://myapp.com/upgrade'
})

// Wrap any tool handler - that's it!
const paidAnalysis = requirePayment({ credits: 10 })(
  async (input: { userId: string; data: string }) => {
    return analyzeData(input.data)
  }
)
```

## Payment Models

### Credits-Based

Deduct credits per tool call:

```typescript
const handler = requirePayment({ credits: 5 })(myHandler)
```

### Subscription Tiers

Require specific subscription level:

```typescript
const premiumHandler = requirePayment({ 
  tier: 'pro',
  allowedTiers: ['pro', 'enterprise']  // Also allow enterprise
})(myHandler)
```

### Stripe Per-Call Pricing

For per-call billing with Stripe:

```typescript
const paidHandler = requirePayment({ 
  priceId: 'price_1234xxx'  // Stripe Price ID
})(myHandler)
```

## Configuration

```typescript
import { initPayment } from '@openconductor/mcp-sdk/payment'

initPayment({
  // Required: Your OpenConductor API key
  apiKey: 'oc_live_xxx',
  
  // Optional: Custom API endpoint
  apiUrl: 'https://api.openconductor.ai',
  
  // Optional: Where to send users to upgrade
  upgradeUrl: 'https://myapp.com/pricing',
  
  // Optional: Skip billing checks (for development)
  testMode: process.env.NODE_ENV === 'development'
})
```

## Usage Patterns

### With wrapTool

Combine with `wrapTool` for full production features:

```typescript
import { wrapTool } from '@openconductor/mcp-sdk/server'
import { requirePayment } from '@openconductor/mcp-sdk/payment'

const premiumTool = wrapTool(
  requirePayment({ credits: 10 })(async (input) => {
    // Your logic here
    return result
  }),
  { name: 'premium-analysis', timeout: 30000 }
)
```

### Using createPaidTool

All-in-one convenience function:

```typescript
import { createPaidTool } from '@openconductor/mcp-sdk/payment'

const analyzeData = createPaidTool({
  name: 'analyze-data',
  payment: { credits: 10 },
  handler: async (input) => {
    return performAnalysis(input)
  }
})
```

### Custom User ID Extraction

By default, `requirePayment` looks for `userId` in the input. Override this:

```typescript
const handler = requirePayment(
  { credits: 5 },
  { 
    toolName: 'my-tool',
    getUserId: (input) => input.user?.id ?? input.customerId
  }
)(myHandler)
```

## Pre-checking Access

Check if a user can access a feature before executing:

```typescript
import { canUserAccess } from '@openconductor/mcp-sdk/payment'

const status = await canUserAccess('user_123', { credits: 10 }, 'premium-tool')

if (!status.allowed) {
  // Show upgrade prompt
  console.log(`Upgrade at: ${status.actionUrl}`)
  console.log(`Current credits: ${status.credits}`)
}
```

## Getting Billing Status

```typescript
import { getUserBillingStatus } from '@openconductor/mcp-sdk/payment'

const status = await getUserBillingStatus('user_123')
// { credits: 150, tier: 'pro', active: true }
```

## Error Handling

Payment errors are JSON-RPC 2.0 compliant:

```typescript
import { 
  PaymentRequiredError,
  InsufficientCreditsError,
  SubscriptionRequiredError 
} from '@openconductor/mcp-sdk/errors'

try {
  await paidTool(input)
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    // error.data = { required: 10, available: 3, purchaseUrl: '...' }
    showCreditPurchaseModal(error.data.purchaseUrl)
  }
  
  if (error instanceof SubscriptionRequiredError) {
    // error.data = { requiredTier: 'pro', currentTier: 'free', upgradeUrl: '...' }
    redirectToUpgrade(error.data.upgradeUrl)
  }
}
```

### Error Codes

| Error | Code | When |
|-------|------|------|
| `PaymentRequiredError` | -32011 | Generic payment required |
| `InsufficientCreditsError` | -32012 | Not enough credits |
| `SubscriptionRequiredError` | -32013 | Wrong subscription tier |

## Test Mode

For development, enable test mode to skip actual billing:

```typescript
initPayment({
  apiKey: 'oc_test_xxx',
  testMode: true  // All checks pass, no credits deducted
})
```

## Best Practices

### 1. Always Provide Upgrade URLs

```typescript
initPayment({
  apiKey: process.env.OPENCONDUCTOR_API_KEY!,
  upgradeUrl: 'https://myapp.com/pricing'  // Users see this on payment errors
})
```

### 2. Handle Errors Gracefully

```typescript
// In your MCP server
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await paidTool(request.params)
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      return {
        content: [{
          type: 'text',
          text: `This tool requires payment. Upgrade at: ${error.data?.upgradeUrl}`
        }],
        isError: true
      }
    }
    throw error
  }
})
```

### 3. Use Test Mode in Development

```typescript
initPayment({
  apiKey: process.env.OPENCONDUCTOR_API_KEY!,
  testMode: process.env.NODE_ENV !== 'production'
})
```

### 4. Deduct After Success

Credits are deducted **after** successful execution, so users aren't charged for failed calls.

## API Reference

### initPayment(config)

Initialize payment configuration. Call once at startup.

### requirePayment(requirement, options?)

Returns a middleware function that wraps handlers with payment verification.

### createPaidTool(config)

Convenience function combining handler and payment config.

### canUserAccess(userId, requirement, toolName?)

Check if user can access without executing.

### getUserBillingStatus(userId)

Get user's current credits and tier.
