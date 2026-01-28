# Demo Mode Implementation - Payment Module Changes

## File: src/payment/index.ts

### Add imports at top:

```typescript
import { getConfig, isDemoMode } from '../config'
import { 
  MOCK_BILLING_STATUS, 
  MOCK_USER_BILLING, 
  MOCK_CREDIT_PACKS,
  getMockAnalytics,
  demoLogger 
} from '../demo'
```

### Modify initPayment():

```typescript
export function initPayment(config?: PaymentConfig): void {
  const sdkConfig = getConfig()
  
  // In demo mode, auto-configure with mocks
  if (sdkConfig.demoMode) {
    paymentConfig = {
      apiKey: 'demo_key',
      apiUrl: 'https://api.openconductor.ai',
      testMode: true, // Force test mode
      upgradeUrl: 'https://openconductor.ai/pricing',
    }
    return
  }
  
  // Production mode - require config
  if (!config?.apiKey) {
    throw new ConfigurationError('payment', 'Payment requires apiKey in production mode')
  }
  
  paymentConfig = {
    apiUrl: 'https://api.openconductor.ai',
    testMode: false,
    ...config,
  }
}
```

### Modify checkBilling():

```typescript
async function checkBilling(params: CheckBillingParams): Promise<BillingStatus> {
  // Demo mode - return mock data
  if (isDemoMode()) {
    demoLogger.billing(params.userId, MOCK_BILLING_STATUS)
    return MOCK_BILLING_STATUS
  }
  
  const config = paymentConfig
  if (!config) {
    throw new ConfigurationError('payment', 'Payment not initialized. Call initPayment() first.')
  }

  // ... rest of existing implementation
}
```

### Modify deductCredits():

```typescript
async function deductCredits(params: DeductCreditsParams): Promise<boolean> {
  // Demo mode - log but don't deduct
  if (isDemoMode()) {
    demoLogger.deduct(params.userId, params.credits, params.toolName)
    return true
  }
  
  // ... rest of existing implementation
}
```

### Modify getUserBillingStatus():

```typescript
export async function getUserBillingStatus(userId: string): Promise<{
  credits: number
  tier: string
  active: boolean
} | null> {
  // Demo mode - return mock data
  if (isDemoMode()) {
    return MOCK_USER_BILLING
  }
  
  // ... rest of existing implementation
}
```

### Modify getCreditPacks():

```typescript
export async function getCreditPacks(): Promise<Record<CreditPack, CreditPackInfo> | null> {
  // Demo mode - return mock packs
  if (isDemoMode()) {
    return MOCK_CREDIT_PACKS
  }
  
  // ... rest of existing implementation
}
```

### Modify getUserAnalytics():

```typescript
export async function getUserAnalytics(
  userId: string,
  period: AnalyticsPeriod = '30d'
): Promise<UsageAnalytics | null> {
  // Demo mode - return realistic mock data
  if (isDemoMode()) {
    return getMockAnalytics(period)
  }
  
  // ... rest of existing implementation
}
```
