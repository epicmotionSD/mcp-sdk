import { SubscriptionRequiredError, PaymentRequiredError } from '../errors/index.mjs';

interface PaymentConfig {
    /** OpenConductor API key for billing */
    apiKey: string;
    /** Base URL for billing API (default: https://api.openconductor.ai) */
    apiUrl?: string;
    /** Default upgrade URL to show users */
    upgradeUrl?: string;
    /** Enable test mode (skips actual billing) */
    testMode?: boolean;
}
interface CreditRequirement {
    /** Number of credits to deduct per call */
    credits: number;
}
interface SubscriptionRequirement {
    /** Required subscription tier (e.g., 'pro', 'enterprise') */
    tier: string;
    /** Alternative tiers that also grant access */
    allowedTiers?: string[];
}
interface StripeRequirement {
    /** Stripe Price ID for per-call billing */
    priceId: string;
}
type PaymentRequirement = CreditRequirement | SubscriptionRequirement | StripeRequirement;
interface UserContext {
    /** User ID for billing lookup */
    userId: string;
    /** Optional API key override */
    apiKey?: string;
}
interface BillingStatus {
    /** Whether the user can proceed */
    allowed: boolean;
    /** Current credit balance (if applicable) */
    credits?: number;
    /** Current subscription tier (if applicable) */
    tier?: string;
    /** Reason for denial (if not allowed) */
    reason?: string;
    /** URL for upgrade/purchase */
    actionUrl?: string;
}
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
declare function initPayment(config: PaymentConfig): void;
/**
 * Get current payment configuration
 */
declare function getPaymentConfig(): PaymentConfig | null;
interface RequirePaymentOptions {
    /** Tool name for billing records */
    toolName?: string;
    /** Function to extract user ID from input */
    getUserId?: (input: unknown) => string | undefined;
    /** Custom error handler */
    onPaymentError?: (error: Error) => void;
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
declare function requirePayment<TInput extends {
    userId?: string;
}, TOutput>(requirement: PaymentRequirement, options?: RequirePaymentOptions): (handler: (input: TInput) => TOutput | Promise<TOutput>) => ((input: TInput) => Promise<TOutput>);
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
declare function createPaidTool<TInput extends {
    userId?: string;
}, TOutput>(config: {
    name: string;
    payment: PaymentRequirement;
    handler: (input: TInput) => TOutput | Promise<TOutput>;
    getUserId?: (input: TInput) => string | undefined;
}): (input: TInput) => Promise<TOutput>;
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
declare function canUserAccess(userId: string, requirement: PaymentRequirement, toolName?: string): Promise<BillingStatus>;
/**
 * Get user's current billing status
 */
declare function getUserBillingStatus(userId: string): Promise<{
    credits: number;
    tier: string;
    active: boolean;
} | null>;
type CreditPack = 'starter' | 'pro' | 'business';
interface CreditPackInfo {
    name: string;
    credits: number;
    price: number;
    perCredit: number;
    savings: number;
    bestFor: string;
    popular?: boolean;
}
interface CheckoutSession {
    sessionId: string;
    url: string;
    pack: CreditPack;
    credits: number;
    price: number;
    perCredit: number;
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
declare function getCreditPacks(): Promise<Record<CreditPack, CreditPackInfo> | null>;
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
declare function createCreditsCheckout(pack: CreditPack, options?: {
    successUrl?: string;
    cancelUrl?: string;
}): Promise<CheckoutSession | null>;
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
declare function getCheckoutUrl(pack: CreditPack): Promise<string | null>;
interface UpgradePromptOptions {
    /** Required credits for the blocked action */
    required?: number;
    /** Currently available credits */
    available?: number;
    /** Tool that was blocked */
    toolName?: string;
    /** Include direct checkout links */
    includeLinks?: boolean;
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
declare function generateUpgradePrompt(options?: UpgradePromptOptions): Promise<{
    message: string;
    shortMessage: string;
    recommendedPack: CreditPack;
    packs: Record<CreditPack, {
        credits: number;
        price: number;
        url: string | null;
    }>;
}>;
/**
 * Get a simple checkout URL for the dashboard
 * Useful when you don't want to create a full Stripe session
 */
declare function getDashboardCheckoutUrl(options?: {
    required?: number;
    available?: number;
    pack?: CreditPack;
}): string;
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
declare function createUpgradeErrorHandler(handlers: {
    onInsufficientCredits?: (prompt: Awaited<ReturnType<typeof generateUpgradePrompt>>) => unknown;
    onSubscriptionRequired?: (error: SubscriptionRequiredError) => unknown;
    onPaymentRequired?: (error: PaymentRequiredError) => unknown;
    onOtherError?: (error: Error) => unknown;
}): (error: Error) => Promise<unknown>;
type AnalyticsPeriod = '24h' | '7d' | '30d' | 'all';
interface UsageAnalytics {
    period: AnalyticsPeriod;
    balance: number;
    summary: {
        totalUsed: number;
        totalPurchased: number;
        netChange: number;
        burnRate: number;
        daysRemaining: number | null;
        toolCount: number;
        transactionCount: number;
    };
    topTools: Array<{
        tool: string;
        calls: number;
        credits: number;
    }>;
    usageTimeline: Array<{
        date: string;
        used: number;
        purchased: number;
    }>;
    recentTransactions: Array<{
        id: string;
        amount: number;
        type: string;
        tool: string | null;
        createdAt: string;
    }>;
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
declare function getUserAnalytics(userId: string, period?: AnalyticsPeriod): Promise<UsageAnalytics | null>;
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
declare function checkLowBalance(userId: string, thresholdDays?: number): Promise<{
    isLow: boolean;
    daysRemaining: number | null;
    balance: number;
    burnRate: number;
    message: string;
    recommendedPack: CreditPack;
} | null>;

export { type AnalyticsPeriod, type BillingStatus, type CheckoutSession, type CreditPack, type CreditPackInfo, type CreditRequirement, type PaymentConfig, type PaymentRequirement, type RequirePaymentOptions, type StripeRequirement, type SubscriptionRequirement, type UpgradePromptOptions, type UsageAnalytics, type UserContext, canUserAccess, checkLowBalance, createCreditsCheckout, createPaidTool, createUpgradeErrorHandler, generateUpgradePrompt, getCheckoutUrl, getCreditPacks, getDashboardCheckoutUrl, getPaymentConfig, getUserAnalytics, getUserBillingStatus, initPayment, requirePayment };
