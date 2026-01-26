import {
  PaymentRequiredError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  ConfigurationError,
} from '../errors'

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
 * @example
 * ```typescript
 * initPayment({
 *   apiKey: process.env.OPENCONDUCTOR_API_KEY!,
 *   upgradeUrl: 'https://myapp.com/upgrade'
 * })
 * ```
 */
export function initPayment(config: PaymentConfig): void {
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
  const config = paymentConfig
  if (!config) {
    throw new ConfigurationError('payment', 'Payment not initialized. Call initPayment() first.')
  }

  // Test mode - always allow
  if (config.testMode) {
    return { allowed: true, credits: 9999, tier: 'test' }
  }

  try {
    const response = await fetch(`${config.apiUrl}/v1/billing/check`, {
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
  const config = paymentConfig
  if (!config) return false

  // Test mode - don't actually deduct
  if (config.testMode) return true

  try {
    const response = await fetch(`${config.apiUrl}/v1/billing/deduct`, {
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
  const config = paymentConfig
  if (!config) return null

  if (config.testMode) {
    return { credits: 9999, tier: 'test', active: true }
  }

  try {
    const response = await fetch(`${config.apiUrl}/v1/billing/status/${userId}`, {
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
