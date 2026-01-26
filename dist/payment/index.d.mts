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

export { type BillingStatus, type CreditRequirement, type PaymentConfig, type PaymentRequirement, type RequirePaymentOptions, type StripeRequirement, type SubscriptionRequirement, type UserContext, canUserAccess, createPaidTool, getPaymentConfig, getUserBillingStatus, initPayment, requirePayment };
