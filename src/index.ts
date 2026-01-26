/**
 * @openconductor/mcp-sdk
 * The standard SDK for building MCP servers
 * 
 * @packageDocumentation
 */

// Error handling
export {
  MCPError,
  ValidationError,
  ToolNotFoundError,
  ToolExecutionError,
  ResourceNotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  TimeoutError,
  DependencyError,
  ConfigurationError,
  PaymentRequiredError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  ErrorCodes,
  type ErrorCode,
} from './errors'

// Validation
export {
  z,
  validate,
  validateInput,
  schemas,
  ZodError,
  type ZodSchema,
  type Infer,
  type ValidateOptions,
} from './validate'

// Logging
export {
  createLogger,
  type Logger,
  type LogLevel,
  type LogEntry,
  type LoggerOptions,
} from './logger'

// Server utilities
export {
  createHealthCheck,
  wrapTool,
  type HealthCheckInfo,
  type HealthCheckResponse,
  type WrapToolOptions,
  type ToolContext,
} from './server'

// Telemetry
export {
  initTelemetry,
  getTelemetry,
  Telemetry,
  type TelemetryConfig,
  type ToolMetric,
  type TelemetryBatch,
} from './telemetry'

// Payment / Monetization
export {
  initPayment,
  getPaymentConfig,
  requirePayment,
  createPaidTool,
  canUserAccess,
  getUserBillingStatus,
  type PaymentConfig,
  type PaymentRequirement,
  type CreditRequirement,
  type SubscriptionRequirement,
  type StripeRequirement,
  type UserContext,
  type BillingStatus,
  type RequirePaymentOptions,
} from './payment'
