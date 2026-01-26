'use strict';

// src/errors/codes.ts
var ErrorCodes = {
  // JSON-RPC 2.0 Standard Errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // MCP-Specific Errors (-32000 to -32099 reserved for implementation)
  TOOL_NOT_FOUND: -32001,
  TOOL_EXECUTION_ERROR: -32002,
  RESOURCE_NOT_FOUND: -32003,
  AUTHENTICATION_ERROR: -32004,
  AUTHORIZATION_ERROR: -32005,
  RATE_LIMIT_ERROR: -32006,
  TIMEOUT_ERROR: -32007,
  VALIDATION_ERROR: -32008,
  DEPENDENCY_ERROR: -32009,
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
var ValidationError = class extends MCPError {
  constructor(field, reason, value) {
    super(ErrorCodes.INVALID_PARAMS, `Validation failed for '${field}': ${reason}`, {
      field,
      reason,
      ...value !== void 0 && { value }
    });
    this.name = "ValidationError";
  }
};
var ToolNotFoundError = class extends MCPError {
  constructor(toolName) {
    super(ErrorCodes.TOOL_NOT_FOUND, `Tool '${toolName}' not found`, {
      tool: toolName
    });
    this.name = "ToolNotFoundError";
  }
};
var ToolExecutionError = class extends MCPError {
  constructor(toolName, reason, cause) {
    super(ErrorCodes.TOOL_EXECUTION_ERROR, `Tool '${toolName}' failed: ${reason}`, {
      tool: toolName,
      reason,
      ...cause && { cause: cause.message }
    });
    this.name = "ToolExecutionError";
  }
};
var ResourceNotFoundError = class extends MCPError {
  constructor(resourceUri) {
    super(ErrorCodes.RESOURCE_NOT_FOUND, `Resource '${resourceUri}' not found`, {
      uri: resourceUri
    });
    this.name = "ResourceNotFoundError";
  }
};
var AuthenticationError = class extends MCPError {
  constructor(reason = "Authentication required") {
    super(ErrorCodes.AUTHENTICATION_ERROR, reason);
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends MCPError {
  constructor(action, resource) {
    const msg = resource ? `Not authorized to ${action} on '${resource}'` : `Not authorized to ${action}`;
    super(ErrorCodes.AUTHORIZATION_ERROR, msg, {
      action,
      ...resource && { resource }
    });
    this.name = "AuthorizationError";
  }
};
var RateLimitError = class extends MCPError {
  constructor(retryAfterMs) {
    super(ErrorCodes.RATE_LIMIT_ERROR, "Rate limit exceeded", {
      ...retryAfterMs && { retryAfterMs }
    });
    this.name = "RateLimitError";
  }
};
var TimeoutError = class extends MCPError {
  constructor(operation, timeoutMs) {
    super(ErrorCodes.TIMEOUT_ERROR, `Operation '${operation}' timed out after ${timeoutMs}ms`, {
      operation,
      timeoutMs
    });
    this.name = "TimeoutError";
  }
};
var DependencyError = class extends MCPError {
  constructor(dependency, reason) {
    super(ErrorCodes.DEPENDENCY_ERROR, `Dependency '${dependency}' unavailable: ${reason}`, {
      dependency,
      reason
    });
    this.name = "DependencyError";
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

exports.AuthenticationError = AuthenticationError;
exports.AuthorizationError = AuthorizationError;
exports.ConfigurationError = ConfigurationError;
exports.DependencyError = DependencyError;
exports.ErrorCodes = ErrorCodes;
exports.InsufficientCreditsError = InsufficientCreditsError;
exports.MCPError = MCPError;
exports.PaymentRequiredError = PaymentRequiredError;
exports.RateLimitError = RateLimitError;
exports.ResourceNotFoundError = ResourceNotFoundError;
exports.SubscriptionRequiredError = SubscriptionRequiredError;
exports.TimeoutError = TimeoutError;
exports.ToolExecutionError = ToolExecutionError;
exports.ToolNotFoundError = ToolNotFoundError;
exports.ValidationError = ValidationError;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map