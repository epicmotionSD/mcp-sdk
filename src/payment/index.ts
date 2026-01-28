import {
  PaymentRequiredError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  ConfigurationError,
} from '../errors'
import { getConfig, isDemoMode } from '../config'
import {
  MOCK_BILLING_STATUS,
  MOCK_USER_BILLING,
  MOCK_CREDIT_PACKS,
  getMockAnalytics,
  demoLogger,
} from '../demo'

// ============================================================================
// Types
// ============================================================================

export interface PaymentConfig {
  /** OpenConductor API key for billing */
  apiKey: string
  /** Base URL for billing API (default: https://api.openconductor.ai) */
  apiUrl?: string
  /** Default upgrade URL to show users */
  upgradeUrl?: string
  /** Enable test mode (skips actual billing) */
  testMode?: boolean
}

export interface CreditRequirement {
  /** Number of credits to deduct per call */
  credits: number
}

export interface SubscriptionRequirement {
  /** Required subscription tier (e.g., 'pro', 'enterprise') */
  tier: string
  /** Alternative tiers that also grant access */
  allowedTiers?: string[]
}

export interface StripeRequirement {
  /** Stripe Price ID for per-call billing */
  priceId: string
}

export type PaymentRequirement = 
  | CreditRequirement 
  | SubscriptionRequirement 
  | StripeRequirement

export interface UserContext {
  /** User ID for billing lookup */
  userId: string
  /** Optional API key override */
  apiKey?: string
}

export interface BillingStatus {
  /** Whether the user can proceed */
  allowed: boolean
  /** Current credit balance (if applicable) */
  credits?: number
  /** Current subscription tier (if applicable) */
  tier?: string
  /** Reason for denial (if not allowed) */
  reason?: string
  /** URL for upgrade/purchase */
  actionUrl?: string
}

// ============================================================================
// Configuration
// ============================================================================

let paymentConfig: PaymentConfig | null = null

/**
 * Initialize payment/billing configuration
 * 
 * In demo mode, this is optional - mock billing will be used automatically.
 * 
 * @example
 * ```typescript
 * initPayment({
 *   apiKey: process.env.OPENCONDUCTOR_API_KEY!,
 *   upgradeUrl: 'https://myapp.com/upgrade'
 * })
 * ```
 */
export function initPayment(config?: PaymentConfig): void {
  // In demo mode, auto-configure with mocks
  if (isDemoMode()) {
    paymentConfig = {
      apiKey: 'demo_key',
      apiUrl: 'https://api.openconductor.ai',
      testMode: true,
      upgradeUrl: 'https://openconductor.ai/pricing',
    }
    return
  }
  
  // Production mode - require config
  if (!config?.apiKey) {
    throw new ConfigurationError('payment', 'Payment requires apiKey in production mode. Set OPENCONDUCTOR_API_KEY or pass apiKey to initPayment().')
  }
  
  paymentConfig = {
    apiUrl: 'https://api.openconductor.ai',
    testMode: false,
    ...config,
  }
}

/**
 * Get current payment configuration
 */
export function getPaymentConfig(): PaymentConfig | null {
  return paymentConfig
}

// ============================================================================
// Billing Client
// ============================================================================

interface CheckBillingParams {
  userId: string
  requirement: PaymentRequirement
  toolName: string
}

interface DeductCreditsParams {
  userId: string
  credits: number
  toolName: string
  callId?: string
}

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

  // Test mode - always allow
  if (config.testMode) {
    return { allowed: true, credits: 9999, tier: 'test' }
  }

  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        requirement: params.requirement,
        tool: params.toolName,
      }),
    })

    if (!response.ok) {
      // Non-2xx response - treat as billing check failed
      const errorBody = await response.text()
      console.error('[payment] Billing check failed:', response.status, errorBody)
      return {
        allowed: false,
        reason: 'Billing service unavailable',
        actionUrl: config.upgradeUrl,
      }
    }

    return await response.json() as BillingStatus
  } catch (error) {
    // Network error - fail open or closed based on config
    console.error('[payment] Billing check error:', error)
    return {
      allowed: false,
      reason: 'Unable to verify billing status',
      actionUrl: config.upgradeUrl,
    }
  }
}

async function deductCredits(params: DeductCreditsParams): Promise<boolean> {
  // Demo mode - log but don't deduct
  if (isDemoMode()) {
    demoLogger.deduct(params.userId, params.credits, params.toolName)
    return true
  }

  const config = paymentConfig
  if (!config) return false

  // Test mode - don't actually deduct
  if (config.testMode) return true

  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        credits: params.credits,
        tool: params.toolName,
        callId: params.callId,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('[payment] Credit deduction error:', error)
    return false
  }
}

// ============================================================================
// Type Guards
// ============================================================================

function isCreditRequirement(req: PaymentRequirement): req is CreditRequirement {
  return 'credits' in req && typeof req.credits === 'number'
}

function isSubscriptionRequirement(req: PaymentRequirement): req is SubscriptionRequirement {
  return 'tier' in req && typeof req.tier === 'string'
}

function isStripeRequirement(req: PaymentRequirement): req is StripeRequirement {
  return 'priceId' in req && typeof req.priceId === 'string'
}

// ============================================================================
// Main Middleware
// ============================================================================

export interface RequirePaymentOptions {
  /** Tool name for billing records */
  toolName?: string
  /** Function to extract user ID from input */
  getUserId?: (input: unknown) => string | undefined
  /** Custom error handler */
  onPaymentError?: (error: Error) => void
}

/**
 * One-line payment middleware for MCP tools
 * 
 * @example Credits-based billing
 * ```typescript
 * const paidTool = requirePayment({ credits: 10 })(myHandler)
 * ```
 * 
 * @example Subscription tier requirement
 * ```typescript
 * const premiumTool = requirePayment({ tier: 'pro' })(myHandler)
 * ```
 * 
 * @example With wrapTool
 * ```typescript
 * const safePaidTool = wrapTool(
 *   requirePayment({ credits: 5 })(myHandler),
 *   { name: 'premium-analysis' }
 * )
 * ```
 */
export function requirePayment<TInput extends { userId?: string }, TOutput>(
  requirement: PaymentRequirement,
  options: RequirePaymentOptions = {}
) {
  return (
    handler: (input: TInput) => TOutput | Promise<TOutput>
  ): ((input: TInput) => Promise<TOutput>) => {
    
    const { toolName = 'unknown', getUserId } = options

    return async (input: TInput): Promise<TOutput> => {
      // Extract user ID
      const userId = getUserId?.(input) ?? input.userId
      
      if (!userId) {
        throw new PaymentRequiredError(toolName, {
          upgradeUrl: paymentConfig?.upgradeUrl,
        })
      }

      // Check billing status
      const status = await checkBilling({
        userId,
        requirement,
        toolName,
      })

      if (!status.allowed) {
        // Throw appropriate error based on requirement type
        if (isCreditRequirement(requirement)) {
          throw new InsufficientCreditsError(
            requirement.credits,
            status.credits ?? 0,
            { purchaseUrl: status.actionUrl }
          )
        }

        if (isSubscriptionRequirement(requirement)) {
          throw new SubscriptionRequiredError(
            requirement.tier,
            status.tier,
            { upgradeUrl: status.actionUrl }
          )
        }

        // Generic payment required
        throw new PaymentRequiredError(toolName, {
          upgradeUrl: status.actionUrl,
          ...(isStripeRequirement(requirement) && { priceId: requirement.priceId }),
        })
      }

      // Execute the handler
      const result = await handler(input)

      // Deduct credits after successful execution (if credit-based)
      if (isCreditRequirement(requirement)) {
        await deductCredits({
          userId,
          credits: requirement.credits,
          toolName,
        })
      }

      return result
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a paid tool with built-in payment verification
 * 
 * @example
 * ```typescript
 * const analyzeData = createPaidTool({
 *   name: 'analyze-data',
 *   payment: { credits: 10 },
 *   handler: async (input) => {
 *     // Your tool logic
 *     return result
 *   }
 * })
 * ```
 */
export function createPaidTool<TInput extends { userId?: string }, TOutput>(config: {
  name: string
  payment: PaymentRequirement
  handler: (input: TInput) => TOutput | Promise<TOutput>
  getUserId?: (input: TInput) => string | undefined
}): (input: TInput) => Promise<TOutput> {
  return requirePayment<TInput, TOutput>(config.payment, {
    toolName: config.name,
    getUserId: config.getUserId as (input: unknown) => string | undefined,
  })(config.handler)
}

/**
 * Check if a user can access a paid feature without executing it
 * Useful for UI gating
 * 
 * @example
 * ```typescript
 * const canAccess = await canUserAccess('user_123', { credits: 10 }, 'premium-tool')
 * if (!canAccess.allowed) {
 *   showUpgradePrompt(canAccess.actionUrl)
 * }
 * ```
 */
export async function canUserAccess(
  userId: string,
  requirement: PaymentRequirement,
  toolName: string = 'check'
): Promise<BillingStatus> {
  return checkBilling({ userId, requirement, toolName })
}

/**
 * Get user's current billing status
 */
export async function getUserBillingStatus(userId: string): Promise<{
  credits: number
  tier: string
  active: boolean
} | null> {
  // Demo mode - return mock data
  if (isDemoMode()) {
    return MOCK_USER_BILLING
  }

  const config = paymentConfig
  if (!config) return null

  if (config.testMode) {
    return { credits: 9999, tier: 'test', active: true }
  }

  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-status/${userId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// ============================================================================
// Checkout Helpers
// ============================================================================

export type CreditPack = 'starter' | 'pro' | 'business'

export interface CreditPackInfo {
  name: string
  credits: number
  price: number
  perCredit: number
  savings: number
  bestFor: string
  popular?: boolean
}

export interface CheckoutSession {
  sessionId: string
  url: string
  pack: CreditPack
  credits: number
  price: number
  perCredit: number
}

/**
 * Get available credit packs and pricing
 * 
 * @example
 * ```typescript
 * const packs = await getCreditPacks()
 * console.log(packs.pro) // { name: 'Pro Pack', credits: 500, price: 39.99, ... }
 * ```
 */
export async function getCreditPacks(): Promise<Record<CreditPack, CreditPackInfo> | null> {
  // Demo mode - return mock packs
  if (isDemoMode()) {
    return MOCK_CREDIT_PACKS
  }

  const config = paymentConfig
  if (!config) return null

  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/credit-packs`)
    if (!response.ok) return null
    const data = await response.json()
    return data.packs
  } catch {
    return null
  }
}

/**
 * Create a Stripe checkout session for purchasing credits
 * Returns a URL to redirect the user to for payment
 * 
 * @example
 * ```typescript
 * const checkout = await createCreditsCheckout('pro', {
 *   successUrl: 'https://myapp.com/success',
 *   cancelUrl: 'https://myapp.com/pricing',
 * })
 * 
 * // Redirect user to checkout
 * window.location.href = checkout.url
 * ```
 */
export async function createCreditsCheckout(
  pack: CreditPack,
  options: {
    successUrl?: string
    cancelUrl?: string
  } = {}
): Promise<CheckoutSession | null> {
  const config = paymentConfig
  if (!config) {
    console.error('[payment] Payment not initialized. Call initPayment() first.')
    return null
  }

  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/stripe-checkout-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        pack,
        successUrl: options.successUrl,
        cancelUrl: options.cancelUrl,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[payment] Checkout creation failed:', error)
      return null
    }

    return await response.json() as CheckoutSession
  } catch (error) {
    console.error('[payment] Checkout error:', error)
    return null
  }
}

/**
 * Generate a direct checkout URL for embedding in upgrade prompts
 * 
 * @example In an error handler:
 * ```typescript
 * catch (error) {
 *   if (error instanceof InsufficientCreditsError) {
 *     const checkoutUrl = await getCheckoutUrl('pro')
 *     return { error: `Insufficient credits. Buy more: ${checkoutUrl}` }
 *   }
 * }
 * ```
 */
export async function getCheckoutUrl(pack: CreditPack): Promise<string | null> {
  const session = await createCreditsCheckout(pack)
  return session?.url ?? null
}

// ============================================================================
// Upgrade Prompts
// ============================================================================

export interface UpgradePromptOptions {
  /** Required credits for the blocked action */
  required?: number
  /** Currently available credits */
  available?: number
  /** Tool that was blocked */
  toolName?: string
  /** Include direct checkout links */
  includeLinks?: boolean
}

/**
 * Generate a user-friendly upgrade prompt message
 * Use this in your error handlers to show helpful messages
 * 
 * @example
 * ```typescript
 * catch (error) {
 *   if (error instanceof InsufficientCreditsError) {
 *     const prompt = await generateUpgradePrompt({
 *       required: error.data.required,
 *       available: error.data.available,
 *       toolName: 'analyze-data'
 *     })
 *     console.log(prompt.message)
 *     // "You need 10 more credits to use analyze-data. 
 *     //  Buy the Pro Pack (500 credits) for $39.99 → https://..."
 *   }
 * }
 * ```
 */
export async function generateUpgradePrompt(
  options: UpgradePromptOptions = {}
): Promise<{
  message: string
  shortMessage: string
  recommendedPack: CreditPack
  packs: Record<CreditPack, { credits: number; price: number; url: string | null }>
}> {
  const { required = 0, available = 0, toolName, includeLinks = true } = options
  const needed = Math.max(0, required - available)
  
  // Determine recommended pack based on needed credits
  let recommendedPack: CreditPack = 'starter'
  if (needed > 100) recommendedPack = 'pro'
  if (needed > 500) recommendedPack = 'business'
  
  // Get pack URLs if requested
  const packUrls: Record<CreditPack, string | null> = {
    starter: null,
    pro: null,
    business: null,
  }
  
  if (includeLinks) {
    const [starterUrl, proUrl, businessUrl] = await Promise.all([
      getCheckoutUrl('starter'),
      getCheckoutUrl('pro'),
      getCheckoutUrl('business'),
    ])
    packUrls.starter = starterUrl
    packUrls.pro = proUrl
    packUrls.business = businessUrl
  }
  
  // Build message
  const toolPart = toolName ? ` to use ${toolName}` : ''
  const shortMessage = `Insufficient credits: need ${required}, have ${available}`
  
  let message = `You need ${needed} more credits${toolPart}.\n\n`
  message += `💳 Quick top-up options:\n`
  message += `  • Starter: 100 credits for $9.99${packUrls.starter ? ` → ${packUrls.starter}` : ''}\n`
  message += `  • Pro: 500 credits for $39.99 (20% off)${packUrls.pro ? ` → ${packUrls.pro}` : ''}\n`
  message += `  • Business: 2,000 credits for $119.99 (40% off)${packUrls.business ? ` → ${packUrls.business}` : ''}\n`
  
  if (recommendedPack !== 'starter') {
    message += `\n✨ Recommended: ${recommendedPack.charAt(0).toUpperCase() + recommendedPack.slice(1)} Pack`
  }
  
  return {
    message,
    shortMessage,
    recommendedPack,
    packs: {
      starter: { credits: 100, price: 9.99, url: packUrls.starter },
      pro: { credits: 500, price: 39.99, url: packUrls.pro },
      business: { credits: 2000, price: 119.99, url: packUrls.business },
    },
  }
}

/**
 * Get a simple checkout URL for the dashboard
 * Useful when you don't want to create a full Stripe session
 */
export function getDashboardCheckoutUrl(options: {
  required?: number
  available?: number
  pack?: CreditPack
} = {}): string {
  const params = new URLSearchParams()
  params.set('action', 'buy-credits')
  if (options.required) params.set('required', String(options.required))
  if (options.available) params.set('available', String(options.available))
  if (options.pack) params.set('pack', options.pack)
  return `https://dashboard.openconductor.ai?${params.toString()}`
}

/**
 * Create an error handler that automatically generates upgrade prompts
 * 
 * @example
 * ```typescript
 * const handleError = createUpgradeErrorHandler({
 *   onInsufficientCredits: (prompt) => {
 *     return { error: prompt.shortMessage, upgradeUrl: prompt.packs.pro.url }
 *   }
 * })
 * 
 * // In your tool:
 * try {
 *   return await paidHandler(input)
 * } catch (error) {
 *   return handleError(error)
 * }
 * ```
 */
export function createUpgradeErrorHandler(handlers: {
  onInsufficientCredits?: (prompt: Awaited<ReturnType<typeof generateUpgradePrompt>>) => unknown
  onSubscriptionRequired?: (error: SubscriptionRequiredError) => unknown
  onPaymentRequired?: (error: PaymentRequiredError) => unknown
  onOtherError?: (error: Error) => unknown
}) {
  return async (error: Error): Promise<unknown> => {
    if (error instanceof InsufficientCreditsError && handlers.onInsufficientCredits) {
      const prompt = await generateUpgradePrompt({
        required: error.data?.required as number,
        available: error.data?.available as number,
      })
      return handlers.onInsufficientCredits(prompt)
    }
    
    if (error instanceof SubscriptionRequiredError && handlers.onSubscriptionRequired) {
      return handlers.onSubscriptionRequired(error)
    }
    
    if (error instanceof PaymentRequiredError && handlers.onPaymentRequired) {
      return handlers.onPaymentRequired(error)
    }
    
    if (handlers.onOtherError) {
      return handlers.onOtherError(error)
    }
    
    throw error
  }
}

// ============================================================================
// Usage Analytics
// ============================================================================

export type AnalyticsPeriod = '24h' | '7d' | '30d' | 'all'

export interface UsageAnalytics {
  period: AnalyticsPeriod
  balance: number
  summary: {
    totalUsed: number
    totalPurchased: number
    netChange: number
    burnRate: number
    daysRemaining: number | null
    toolCount: number
    transactionCount: number
  }
  topTools: Array<{
    tool: string
    calls: number
    credits: number
  }>
  usageTimeline: Array<{
    date: string
    used: number
    purchased: number
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    type: string
    tool: string | null
    createdAt: string
  }>
}

/**
 * Get usage analytics for a user
 * 
 * @example
 * ```typescript
 * const analytics = await getUserAnalytics('user_123', '30d')
 * console.log(`Burn rate: ${analytics.summary.burnRate} credits/day`)
 * console.log(`Days remaining: ${analytics.summary.daysRemaining}`)
 * ```
 */
export async function getUserAnalytics(
  userId: string,
  period: AnalyticsPeriod = '30d'
): Promise<UsageAnalytics | null> {
  // Demo mode - return realistic mock data
  if (isDemoMode()) {
    return getMockAnalytics(period)
  }

  const config = paymentConfig
  if (!config) {
    console.error('[payment] Payment not initialized. Call initPayment() first.')
    return null
  }

  if (config.testMode) {
    // Return mock data in test mode
    return {
      period,
      balance: 9999,
      summary: {
        totalUsed: 100,
        totalPurchased: 500,
        netChange: 400,
        burnRate: 3.33,
        daysRemaining: 3000,
        toolCount: 5,
        transactionCount: 30,
      },
      topTools: [
        { tool: 'test-tool', calls: 10, credits: 50 },
      ],
      usageTimeline: [],
      recentTransactions: [],
    }
  }

  try {
    const response = await fetch(
      `${config.apiUrl}/functions/v1/usage-analytics/${userId}?period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      }
    )

    if (!response.ok) return null
    return await response.json() as UsageAnalytics
  } catch (error) {
    console.error('[payment] Analytics fetch error:', error)
    return null
  }
}

/**
 * Check if user's credits are running low based on burn rate
 * Returns recommended action if low
 * 
 * @example
 * ```typescript
 * const warning = await checkLowBalance('user_123')
 * if (warning) {
 *   sendNotification(warning.message)
 * }
 * ```
 */
export async function checkLowBalance(
  userId: string,
  thresholdDays: number = 7
): Promise<{
  isLow: boolean
  daysRemaining: number | null
  balance: number
  burnRate: number
  message: string
  recommendedPack: CreditPack
} | null> {
  const analytics = await getUserAnalytics(userId, '7d')
  if (!analytics) return null

  const { balance, summary } = analytics
  const { burnRate, daysRemaining } = summary
  
  const isLow = daysRemaining !== null && daysRemaining <= thresholdDays
  
  // Recommend pack based on burn rate
  let recommendedPack: CreditPack = 'starter'
  const weeklyBurn = burnRate * 7
  if (weeklyBurn > 100) recommendedPack = 'pro'
  if (weeklyBurn > 400) recommendedPack = 'business'
  
  let message = ''
  if (isLow) {
    if (daysRemaining === 0) {
      message = `⚠️ Credits depleted! Balance: ${balance}. Buy more to continue.`
    } else if (daysRemaining <= 1) {
      message = `⚠️ Running low! ~${daysRemaining} day of credits left at current usage.`
    } else {
      message = `📊 ~${daysRemaining} days of credits remaining at current burn rate (${burnRate.toFixed(1)}/day).`
    }
  }
  
  return {
    isLow,
    daysRemaining,
    balance,
    burnRate,
    message,
    recommendedPack,
  }
}
