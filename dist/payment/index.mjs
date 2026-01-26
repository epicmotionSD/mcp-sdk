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
    const response = await fetch(`${config.apiUrl}/v1/billing/check`, {
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
    const response = await fetch(`${config.apiUrl}/v1/billing/deduct`, {
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
    const response = await fetch(`${config.apiUrl}/v1/billing/status/${userId}`, {
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

export { canUserAccess, createPaidTool, getPaymentConfig, getUserBillingStatus, initPayment, requirePayment };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map