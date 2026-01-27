'use strict';

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

// src/payment/index.ts
var paymentConfig = null;
function initPayment(config) {
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

exports.canUserAccess = canUserAccess;
exports.checkLowBalance = checkLowBalance;
exports.createCreditsCheckout = createCreditsCheckout;
exports.createPaidTool = createPaidTool;
exports.createUpgradeErrorHandler = createUpgradeErrorHandler;
exports.generateUpgradePrompt = generateUpgradePrompt;
exports.getCheckoutUrl = getCheckoutUrl;
exports.getCreditPacks = getCreditPacks;
exports.getDashboardCheckoutUrl = getDashboardCheckoutUrl;
exports.getPaymentConfig = getPaymentConfig;
exports.getUserAnalytics = getUserAnalytics;
exports.getUserBillingStatus = getUserBillingStatus;
exports.initPayment = initPayment;
exports.requirePayment = requirePayment;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map