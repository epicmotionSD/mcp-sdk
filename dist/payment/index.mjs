// src/errors/codes.ts
var ErrorCodes = {
  CONFIGURATION_ERROR: -32010,
  PAYMENT_REQUIRED: -32011,
  INSUFFICIENT_CREDITS: -32012,
  SUBSCRIPTION_REQUIRED: -32013
};

// src/errors/index.ts
var MCPError = class extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.name = "MCPError";
    this.code = code;
    this.data = data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  /**
   * Returns JSON-RPC 2.0 formatted error object
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...this.data && { data: this.data }
    };
  }
  /**
   * Create error response for JSON-RPC
   */
  toResponse(id = null) {
    return {
      jsonrpc: "2.0",
      id,
      error: this.toJSON()
    };
  }
};
var ConfigurationError = class extends MCPError {
  constructor(setting, reason) {
    super(ErrorCodes.CONFIGURATION_ERROR, `Invalid configuration '${setting}': ${reason}`, {
      setting,
      reason
    });
    this.name = "ConfigurationError";
  }
};
var PaymentRequiredError = class extends MCPError {
  constructor(toolName, options) {
    super(ErrorCodes.PAYMENT_REQUIRED, `Payment required to use '${toolName}'`, {
      tool: toolName,
      ...options?.upgradeUrl && { upgradeUrl: options.upgradeUrl },
      ...options?.priceId && { priceId: options.priceId }
    });
    this.name = "PaymentRequiredError";
  }
};
var InsufficientCreditsError = class extends MCPError {
  constructor(required, available, options) {
    super(ErrorCodes.INSUFFICIENT_CREDITS, `Insufficient credits: need ${required}, have ${available}`, {
      required,
      available,
      ...options?.purchaseUrl && { purchaseUrl: options.purchaseUrl }
    });
    this.name = "InsufficientCreditsError";
  }
};
var SubscriptionRequiredError = class extends MCPError {
  constructor(requiredTier, currentTier, options) {
    const msg = currentTier ? `Subscription '${requiredTier}' required (current: '${currentTier}')` : `Subscription '${requiredTier}' required`;
    super(ErrorCodes.SUBSCRIPTION_REQUIRED, msg, {
      requiredTier,
      ...currentTier && { currentTier },
      ...options?.upgradeUrl && { upgradeUrl: options.upgradeUrl }
    });
    this.name = "SubscriptionRequiredError";
  }
};

// src/config/index.ts
var globalConfig = {
  apiKey: null,
  demoMode: false,
  serverName: "mcp-server",
  serverVersion: "0.0.0",
  initialized: false
};
var DEMO_BANNER = `
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502                                                                 \u2502
\u2502   \u{1F3AE}  DEMO MODE ACTIVE                                          \u2502
\u2502                                                                 \u2502
\u2502   The SDK is running without an API key.                        \u2502
\u2502   \u2022 Payment: Mock billing (always allowed, 9999 credits)        \u2502
\u2502   \u2022 Telemetry: Logging to console only                          \u2502
\u2502   \u2022 All features work - no data sent to OpenConductor           \u2502
\u2502                                                                 \u2502
\u2502   To enable production mode:                                    \u2502
\u2502   1. Get a free API key at https://openconductor.ai             \u2502
\u2502   2. Set OPENCONDUCTOR_API_KEY environment variable             \u2502
\u2502      or pass apiKey to initOpenConductor()                      \u2502
\u2502                                                                 \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`;
var PRODUCTION_BANNER = `
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502   \u2705  OpenConductor SDK initialized (production mode)           \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`;
function initOpenConductor(config = {}) {
  const apiKey = config.apiKey ?? process.env.OPENCONDUCTOR_API_KEY ?? null;
  const demoMode = config.demoMode === true || !apiKey;
  globalConfig = {
    apiKey: demoMode ? null : apiKey,
    demoMode,
    serverName: config.serverName ?? process.env.OPENCONDUCTOR_SERVER_NAME ?? "mcp-server",
    serverVersion: config.serverVersion ?? process.env.npm_package_version ?? "0.0.0",
    initialized: true
  };
  if (!config.quiet) {
    if (demoMode) {
      console.log(DEMO_BANNER);
    } else {
      console.log(PRODUCTION_BANNER);
    }
  }
  return globalConfig;
}
function getConfig() {
  if (!globalConfig.initialized) {
    return initOpenConductor({ quiet: true });
  }
  return globalConfig;
}
function isDemoMode() {
  return getConfig().demoMode;
}

// src/demo/index.ts
var MOCK_BILLING_STATUS = {
  allowed: true,
  credits: 9999,
  tier: "demo",
  reason: void 0,
  actionUrl: "https://openconductor.ai/pricing"
};
var MOCK_USER_BILLING = {
  credits: 9999,
  tier: "demo",
  active: true
};
var MOCK_CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    credits: 100,
    price: 9.99,
    perCredit: 0.0999,
    savings: 0,
    bestFor: "Testing and small projects"
  },
  pro: {
    name: "Pro Pack",
    credits: 500,
    price: 39.99,
    perCredit: 0.0799,
    savings: 20,
    bestFor: "Growing projects",
    popular: true
  },
  business: {
    name: "Business Pack",
    credits: 2e3,
    price: 119.99,
    perCredit: 0.0599,
    savings: 40,
    bestFor: "Production workloads"
  }
};
function generateMockTimeline(days) {
  const timeline = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeline.push({
      date: date.toISOString().split("T")[0],
      used: Math.floor(Math.random() * 50) + 10,
      purchased: i % 7 === 0 ? 500 : 0
      // Weekly purchases
    });
  }
  return timeline;
}
function generateMockTransactions(count) {
  const tools = ["analyze-data", "generate-report", "search-docs", "summarize", "translate"];
  const transactions = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = 0; i < count; i++) {
    const isDebit = Math.random() > 0.2;
    const date = new Date(now);
    date.setHours(date.getHours() - i * 2);
    transactions.push({
      id: `txn_demo_${i}`,
      amount: isDebit ? -(Math.floor(Math.random() * 20) + 1) : 500,
      type: isDebit ? "usage" : "purchase",
      tool: isDebit ? tools[Math.floor(Math.random() * tools.length)] : null,
      createdAt: date.toISOString()
    });
  }
  return transactions;
}
function getMockAnalytics(period) {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const timeline = generateMockTimeline(days);
  const totalUsed = timeline.reduce((sum, d) => sum + d.used, 0);
  const totalPurchased = timeline.reduce((sum, d) => sum + d.purchased, 0);
  return {
    period,
    balance: 9999,
    summary: {
      totalUsed,
      totalPurchased,
      netChange: totalPurchased - totalUsed,
      burnRate: totalUsed / days,
      daysRemaining: Math.floor(9999 / (totalUsed / days)),
      toolCount: 5,
      transactionCount: days * 3
    },
    topTools: [
      { tool: "analyze-data", calls: 156, credits: 780 },
      { tool: "generate-report", calls: 89, credits: 445 },
      { tool: "search-docs", calls: 234, credits: 234 },
      { tool: "summarize", calls: 67, credits: 335 },
      { tool: "translate", calls: 45, credits: 90 }
    ],
    usageTimeline: timeline,
    recentTransactions: generateMockTransactions(10)
  };
}
var DEMO_PREFIX = "[\u{1F3AE} DEMO]";
var demoLogger = {
  telemetry: (action, data) => {
    console.log(`${DEMO_PREFIX} Telemetry ${action}:`, JSON.stringify(data, null, 2));
  },
  payment: (action, data) => {
    console.log(`${DEMO_PREFIX} Payment ${action}:`, JSON.stringify(data, null, 2));
  },
  billing: (userId, result) => {
    console.log(`${DEMO_PREFIX} Billing check for ${userId}: ALLOWED (demo mode)`);
  },
  deduct: (userId, credits, tool) => {
    console.log(`${DEMO_PREFIX} Would deduct ${credits} credits from ${userId} for ${tool} (skipped in demo)`);
  }
};

// src/payment/index.ts
var paymentConfig = null;
function initPayment(config) {
  if (isDemoMode()) {
    paymentConfig = {
      apiKey: "demo_key",
      apiUrl: "https://api.openconductor.ai",
      testMode: true,
      upgradeUrl: "https://openconductor.ai/pricing"
    };
    return;
  }
  if (!config?.apiKey) {
    throw new ConfigurationError("payment", "Payment requires apiKey in production mode. Set OPENCONDUCTOR_API_KEY or pass apiKey to initPayment().");
  }
  paymentConfig = {
    apiUrl: "https://api.openconductor.ai",
    testMode: false,
    ...config
  };
}
function getPaymentConfig() {
  return paymentConfig;
}
async function checkBilling(params) {
  if (isDemoMode()) {
    demoLogger.billing(params.userId, MOCK_BILLING_STATUS);
    return MOCK_BILLING_STATUS;
  }
  const config = paymentConfig;
  if (!config) {
    throw new ConfigurationError("payment", "Payment not initialized. Call initPayment() first.");
  }
  if (config.testMode) {
    return { allowed: true, credits: 9999, tier: "test" };
  }
  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        userId: params.userId,
        requirement: params.requirement,
        tool: params.toolName
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[payment] Billing check failed:", response.status, errorBody);
      return {
        allowed: false,
        reason: "Billing service unavailable",
        actionUrl: config.upgradeUrl
      };
    }
    return await response.json();
  } catch (error) {
    console.error("[payment] Billing check error:", error);
    return {
      allowed: false,
      reason: "Unable to verify billing status",
      actionUrl: config.upgradeUrl
    };
  }
}
async function deductCredits(params) {
  if (isDemoMode()) {
    demoLogger.deduct(params.userId, params.credits, params.toolName);
    return true;
  }
  const config = paymentConfig;
  if (!config) return false;
  if (config.testMode) return true;
  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-deduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        userId: params.userId,
        credits: params.credits,
        tool: params.toolName,
        callId: params.callId
      })
    });
    return response.ok;
  } catch (error) {
    console.error("[payment] Credit deduction error:", error);
    return false;
  }
}
function isCreditRequirement(req) {
  return "credits" in req && typeof req.credits === "number";
}
function isSubscriptionRequirement(req) {
  return "tier" in req && typeof req.tier === "string";
}
function isStripeRequirement(req) {
  return "priceId" in req && typeof req.priceId === "string";
}
function requirePayment(requirement, options = {}) {
  return (handler) => {
    const { toolName = "unknown", getUserId } = options;
    return async (input) => {
      const userId = getUserId?.(input) ?? input.userId;
      if (!userId) {
        throw new PaymentRequiredError(toolName, {
          upgradeUrl: paymentConfig?.upgradeUrl
        });
      }
      const status = await checkBilling({
        userId,
        requirement,
        toolName
      });
      if (!status.allowed) {
        if (isCreditRequirement(requirement)) {
          throw new InsufficientCreditsError(
            requirement.credits,
            status.credits ?? 0,
            { purchaseUrl: status.actionUrl }
          );
        }
        if (isSubscriptionRequirement(requirement)) {
          throw new SubscriptionRequiredError(
            requirement.tier,
            status.tier,
            { upgradeUrl: status.actionUrl }
          );
        }
        throw new PaymentRequiredError(toolName, {
          upgradeUrl: status.actionUrl,
          ...isStripeRequirement(requirement) && { priceId: requirement.priceId }
        });
      }
      const result = await handler(input);
      if (isCreditRequirement(requirement)) {
        await deductCredits({
          userId,
          credits: requirement.credits,
          toolName
        });
      }
      return result;
    };
  };
}
function createPaidTool(config) {
  return requirePayment(config.payment, {
    toolName: config.name,
    getUserId: config.getUserId
  })(config.handler);
}
async function canUserAccess(userId, requirement, toolName = "check") {
  return checkBilling({ userId, requirement, toolName });
}
async function getUserBillingStatus(userId) {
  if (isDemoMode()) {
    return MOCK_USER_BILLING;
  }
  const config = paymentConfig;
  if (!config) return null;
  if (config.testMode) {
    return { credits: 9999, tier: "test", active: true };
  }
  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/billing-status/${userId}`, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
async function getCreditPacks() {
  if (isDemoMode()) {
    return MOCK_CREDIT_PACKS;
  }
  const config = paymentConfig;
  if (!config) return null;
  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/credit-packs`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.packs;
  } catch {
    return null;
  }
}
async function createCreditsCheckout(pack, options = {}) {
  const config = paymentConfig;
  if (!config) {
    console.error("[payment] Payment not initialized. Call initPayment() first.");
    return null;
  }
  try {
    const response = await fetch(`${config.apiUrl}/functions/v1/stripe-checkout-credits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        pack,
        successUrl: options.successUrl,
        cancelUrl: options.cancelUrl
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("[payment] Checkout creation failed:", error);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("[payment] Checkout error:", error);
    return null;
  }
}
async function getCheckoutUrl(pack) {
  const session = await createCreditsCheckout(pack);
  return session?.url ?? null;
}
async function generateUpgradePrompt(options = {}) {
  const { required = 0, available = 0, toolName, includeLinks = true } = options;
  const needed = Math.max(0, required - available);
  let recommendedPack = "starter";
  if (needed > 100) recommendedPack = "pro";
  if (needed > 500) recommendedPack = "business";
  const packUrls = {
    starter: null,
    pro: null,
    business: null
  };
  if (includeLinks) {
    const [starterUrl, proUrl, businessUrl] = await Promise.all([
      getCheckoutUrl("starter"),
      getCheckoutUrl("pro"),
      getCheckoutUrl("business")
    ]);
    packUrls.starter = starterUrl;
    packUrls.pro = proUrl;
    packUrls.business = businessUrl;
  }
  const toolPart = toolName ? ` to use ${toolName}` : "";
  const shortMessage = `Insufficient credits: need ${required}, have ${available}`;
  let message = `You need ${needed} more credits${toolPart}.

`;
  message += `\u{1F4B3} Quick top-up options:
`;
  message += `  \u2022 Starter: 100 credits for $9.99${packUrls.starter ? ` \u2192 ${packUrls.starter}` : ""}
`;
  message += `  \u2022 Pro: 500 credits for $39.99 (20% off)${packUrls.pro ? ` \u2192 ${packUrls.pro}` : ""}
`;
  message += `  \u2022 Business: 2,000 credits for $119.99 (40% off)${packUrls.business ? ` \u2192 ${packUrls.business}` : ""}
`;
  if (recommendedPack !== "starter") {
    message += `
\u2728 Recommended: ${recommendedPack.charAt(0).toUpperCase() + recommendedPack.slice(1)} Pack`;
  }
  return {
    message,
    shortMessage,
    recommendedPack,
    packs: {
      starter: { credits: 100, price: 9.99, url: packUrls.starter },
      pro: { credits: 500, price: 39.99, url: packUrls.pro },
      business: { credits: 2e3, price: 119.99, url: packUrls.business }
    }
  };
}
function getDashboardCheckoutUrl(options = {}) {
  const params = new URLSearchParams();
  params.set("action", "buy-credits");
  if (options.required) params.set("required", String(options.required));
  if (options.available) params.set("available", String(options.available));
  if (options.pack) params.set("pack", options.pack);
  return `https://dashboard.openconductor.ai?${params.toString()}`;
}
function createUpgradeErrorHandler(handlers) {
  return async (error) => {
    if (error instanceof InsufficientCreditsError && handlers.onInsufficientCredits) {
      const prompt = await generateUpgradePrompt({
        required: error.data?.required,
        available: error.data?.available
      });
      return handlers.onInsufficientCredits(prompt);
    }
    if (error instanceof SubscriptionRequiredError && handlers.onSubscriptionRequired) {
      return handlers.onSubscriptionRequired(error);
    }
    if (error instanceof PaymentRequiredError && handlers.onPaymentRequired) {
      return handlers.onPaymentRequired(error);
    }
    if (handlers.onOtherError) {
      return handlers.onOtherError(error);
    }
    throw error;
  };
}
async function getUserAnalytics(userId, period = "30d") {
  if (isDemoMode()) {
    return getMockAnalytics(period);
  }
  const config = paymentConfig;
  if (!config) {
    console.error("[payment] Payment not initialized. Call initPayment() first.");
    return null;
  }
  if (config.testMode) {
    return {
      period,
      balance: 9999,
      summary: {
        totalUsed: 100,
        totalPurchased: 500,
        netChange: 400,
        burnRate: 3.33,
        daysRemaining: 3e3,
        toolCount: 5,
        transactionCount: 30
      },
      topTools: [
        { tool: "test-tool", calls: 10, credits: 50 }
      ],
      usageTimeline: [],
      recentTransactions: []
    };
  }
  try {
    const response = await fetch(
      `${config.apiUrl}/functions/v1/usage-analytics/${userId}?period=${period}`,
      {
        headers: {
          "Authorization": `Bearer ${config.apiKey}`
        }
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("[payment] Analytics fetch error:", error);
    return null;
  }
}
async function checkLowBalance(userId, thresholdDays = 7) {
  const analytics = await getUserAnalytics(userId, "7d");
  if (!analytics) return null;
  const { balance, summary } = analytics;
  const { burnRate, daysRemaining } = summary;
  const isLow = daysRemaining !== null && daysRemaining <= thresholdDays;
  let recommendedPack = "starter";
  const weeklyBurn = burnRate * 7;
  if (weeklyBurn > 100) recommendedPack = "pro";
  if (weeklyBurn > 400) recommendedPack = "business";
  let message = "";
  if (isLow) {
    if (daysRemaining === 0) {
      message = `\u26A0\uFE0F Credits depleted! Balance: ${balance}. Buy more to continue.`;
    } else if (daysRemaining <= 1) {
      message = `\u26A0\uFE0F Running low! ~${daysRemaining} day of credits left at current usage.`;
    } else {
      message = `\u{1F4CA} ~${daysRemaining} days of credits remaining at current burn rate (${burnRate.toFixed(1)}/day).`;
    }
  }
  return {
    isLow,
    daysRemaining,
    balance,
    burnRate,
    message,
    recommendedPack
  };
}

export { canUserAccess, checkLowBalance, createCreditsCheckout, createPaidTool, createUpgradeErrorHandler, generateUpgradePrompt, getCheckoutUrl, getCreditPacks, getDashboardCheckoutUrl, getPaymentConfig, getUserAnalytics, getUserBillingStatus, initPayment, requirePayment };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map