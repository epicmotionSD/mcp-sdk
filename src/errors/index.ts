import { ErrorCodes, type ErrorCode } from './codes'

export { ErrorCodes, type ErrorCode } from './codes'

/**
 * Base error class for MCP servers
 * Formats errors according to JSON-RPC 2.0 specification
 */
export class MCPError extends Error {
  public readonly code: ErrorCode
  public readonly data?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    data?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MCPError'
    this.code = code
    this.data = data

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns JSON-RPC 2.0 formatted error object
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.data && { data: this.data }),
    }
  }

  /**
   * Create error response for JSON-RPC
   */
  toResponse(id: string | number | null = null) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: this.toJSON(),
    }
  }
}

/**
 * Thrown when tool input validation fails
 */
export class ValidationError extends MCPError {
  constructor(field: string, reason: string, value?: unknown) {
    super(ErrorCodes.INVALID_PARAMS, `Validation failed for '${field}': ${reason}`, {
      field,
      reason,
      ...(value !== undefined && { value }),
    })
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when a requested tool doesn't exist
 */
export class ToolNotFoundError extends MCPError {
  constructor(toolName: string) {
    super(ErrorCodes.TOOL_NOT_FOUND, `Tool '${toolName}' not found`, {
      tool: toolName,
    })
    this.name = 'ToolNotFoundError'
  }
}

/**
 * Thrown when tool execution fails
 */
export class ToolExecutionError extends MCPError {
  constructor(toolName: string, reason: string, cause?: Error) {
    super(ErrorCodes.TOOL_EXECUTION_ERROR, `Tool '${toolName}' failed: ${reason}`, {
      tool: toolName,
      reason,
      ...(cause && { cause: cause.message }),
    })
    this.name = 'ToolExecutionError'
  }
}

/**
 * Thrown when a requested resource doesn't exist
 */
export class ResourceNotFoundError extends MCPError {
  constructor(resourceUri: string) {
    super(ErrorCodes.RESOURCE_NOT_FOUND, `Resource '${resourceUri}' not found`, {
      uri: resourceUri,
    })
    this.name = 'ResourceNotFoundError'
  }
}

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends MCPError {
  constructor(reason: string = 'Authentication required') {
    super(ErrorCodes.AUTHENTICATION_ERROR, reason)
    this.name = 'AuthenticationError'
  }
}

/**
 * Thrown when authorization fails (authenticated but not permitted)
 */
export class AuthorizationError extends MCPError {
  constructor(action: string, resource?: string) {
    const msg = resource
      ? `Not authorized to ${action} on '${resource}'`
      : `Not authorized to ${action}`
    super(ErrorCodes.AUTHORIZATION_ERROR, msg, {
      action,
      ...(resource && { resource }),
    })
    this.name = 'AuthorizationError'
  }
}

/**
 * Thrown when rate limits are exceeded
 */
export class RateLimitError extends MCPError {
  constructor(retryAfterMs?: number) {
    super(ErrorCodes.RATE_LIMIT_ERROR, 'Rate limit exceeded', {
      ...(retryAfterMs && { retryAfterMs }),
    })
    this.name = 'RateLimitError'
  }
}

/**
 * Thrown when an operation times out
 */
export class TimeoutError extends MCPError {
  constructor(operation: string, timeoutMs: number) {
    super(ErrorCodes.TIMEOUT_ERROR, `Operation '${operation}' timed out after ${timeoutMs}ms`, {
      operation,
      timeoutMs,
    })
    this.name = 'TimeoutError'
  }
}

/**
 * Thrown when a required dependency is unavailable
 */
export class DependencyError extends MCPError {
  constructor(dependency: string, reason: string) {
    super(ErrorCodes.DEPENDENCY_ERROR, `Dependency '${dependency}' unavailable: ${reason}`, {
      dependency,
      reason,
    })
    this.name = 'DependencyError'
  }
}

/**
 * Thrown when server configuration is invalid
 */
export class ConfigurationError extends MCPError {
  constructor(setting: string, reason: string) {
    super(ErrorCodes.CONFIGURATION_ERROR, `Invalid configuration '${setting}': ${reason}`, {
      setting,
      reason,
    })
    this.name = 'ConfigurationError'
  }
}

/**
 * Thrown when payment is required to access a tool
 */
export class PaymentRequiredError extends MCPError {
  constructor(toolName: string, options?: { upgradeUrl?: string; priceId?: string }) {
    super(ErrorCodes.PAYMENT_REQUIRED, `Payment required to use '${toolName}'`, {
      tool: toolName,
      ...(options?.upgradeUrl && { upgradeUrl: options.upgradeUrl }),
      ...(options?.priceId && { priceId: options.priceId }),
    })
    this.name = 'PaymentRequiredError'
  }
}

/**
 * Thrown when user doesn't have enough credits
 */
export class InsufficientCreditsError extends MCPError {
  constructor(required: number, available: number, options?: { purchaseUrl?: string }) {
    super(ErrorCodes.INSUFFICIENT_CREDITS, `Insufficient credits: need ${required}, have ${available}`, {
      required,
      available,
      ...(options?.purchaseUrl && { purchaseUrl: options.purchaseUrl }),
    })
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * Thrown when a subscription tier is required
 */
export class SubscriptionRequiredError extends MCPError {
  constructor(requiredTier: string, currentTier?: string, options?: { upgradeUrl?: string }) {
    const msg = currentTier 
      ? `Subscription '${requiredTier}' required (current: '${currentTier}')`
      : `Subscription '${requiredTier}' required`
    super(ErrorCodes.SUBSCRIPTION_REQUIRED, msg, {
      requiredTier,
      ...(currentTier && { currentTier }),
      ...(options?.upgradeUrl && { upgradeUrl: options.upgradeUrl }),
    })
    this.name = 'SubscriptionRequiredError'
  }
}
