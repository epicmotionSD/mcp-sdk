'use strict';

var zod = require('zod');

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
function isInitialized() {
  return globalConfig.initialized;
}
function resetConfig() {
  globalConfig = {
    apiKey: null,
    demoMode: false,
    serverName: "mcp-server",
    serverVersion: "0.0.0",
    initialized: false
  };
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
function validate(schema, input, options = {}) {
  const { stripUnknown = true } = options;
  const result = stripUnknown ? schema.safeParse(input) : schema instanceof zod.z.ZodObject ? schema.strict().safeParse(input) : schema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const field = firstError.path.join(".") || "input";
    const reason = firstError.message;
    throw new ValidationError(
      field,
      reason,
      firstError.path.length > 0 ? getNestedValue(input, firstError.path) : input
    );
  }
  return result.data;
}
function validateInput(schema, handler, options = {}) {
  return async (input) => {
    const validated = validate(schema, input, options);
    return handler(validated);
  };
}
function getNestedValue(obj, path) {
  let current = obj;
  for (const key of path) {
    if (current === null || current === void 0) return void 0;
    current = current[key];
  }
  return current;
}
var schemas = {
  /** Non-empty string */
  nonEmptyString: zod.z.string().min(1, "Cannot be empty"),
  /** Positive integer */
  positiveInt: zod.z.number().int().positive(),
  /** Pagination limit (1-100, default 10) */
  limit: zod.z.number().int().min(1).max(100).default(10),
  /** Pagination offset (>= 0, default 0) */
  offset: zod.z.number().int().min(0).default(0),
  /** URL string */
  url: zod.z.string().url(),
  /** Email string */
  email: zod.z.string().email(),
  /** UUID string */
  uuid: zod.z.string().uuid(),
  /** ISO date string */
  isoDate: zod.z.string().datetime(),
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: zod.z.union([
    zod.z.boolean(),
    zod.z.enum(["true", "false"]).transform((v) => v === "true")
  ])
};

// src/logger/index.ts
var LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function createLogger(service, options = {}) {
  const {
    level: minLevel = "info",
    timestamps = true,
    pretty = false
  } = options;
  const shouldLog = (level) => {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
  };
  const formatEntry = (entry) => {
    return pretty ? JSON.stringify(entry, null, 2) : JSON.stringify(entry);
  };
  const log = (level, message, data) => {
    if (!shouldLog(level)) return;
    const entry = {
      ...timestamps && { timestamp: (/* @__PURE__ */ new Date()).toISOString() },
      level,
      service,
      message,
      ...data
    };
    if (options.output) {
      options.output(entry);
    } else {
      const formatted = formatEntry(entry);
      switch (level) {
        case "debug":
          console.debug(formatted);
          break;
        case "info":
          console.info(formatted);
          break;
        case "warn":
          console.warn(formatted);
          break;
        case "error":
          console.error(formatted);
          break;
      }
    }
    return entry;
  };
  return {
    debug: (message, data) => log("debug", message, data),
    info: (message, data) => log("info", message, data),
    warn: (message, data) => log("warn", message, data),
    error: (message, data) => log("error", message, data),
    /**
     * Create a child logger with additional context
     */
    child: (context) => {
      return createLogger(service, {
        ...options,
        output: (entry) => {
          const merged = { ...entry, ...context };
          if (options.output) {
            options.output(merged);
          } else {
            const formatted = pretty ? JSON.stringify(merged, null, 2) : JSON.stringify(merged);
            console[entry.level](formatted);
          }
        }
      });
    }
  };
}

// src/telemetry/index.ts
var SDK_VERSION = "1.0.0";
var DEFAULT_ENDPOINT = "https://api.openconductor.ai/functions/v1/telemetry";
var globalTelemetry = null;
function initTelemetry(config) {
  const sdkConfig = getConfig();
  if (isDemoMode()) {
    globalTelemetry = new DemoTelemetry(
      config?.serverName ?? sdkConfig.serverName,
      config?.serverVersion ?? sdkConfig.serverVersion
    );
    return globalTelemetry;
  }
  if (!config?.apiKey) {
    throw new Error("Telemetry requires apiKey in production mode. Set OPENCONDUCTOR_API_KEY or pass apiKey to initTelemetry().");
  }
  globalTelemetry = new Telemetry(config);
  return globalTelemetry;
}
function getTelemetry() {
  return globalTelemetry;
}
var Telemetry = class {
  config;
  buffer = [];
  flushTimer = null;
  constructor(config) {
    this.config = {
      apiKey: config.apiKey,
      serverName: config.serverName,
      serverVersion: config.serverVersion,
      endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 3e4,
      debug: config.debug ?? false
    };
    this.flushTimer = setInterval(() => {
      this.flush().catch(this.handleError.bind(this));
    }, this.config.flushInterval);
    if (typeof process !== "undefined") {
      process.on("beforeExit", () => this.flush());
      process.on("SIGINT", () => {
        this.flush().finally(() => process.exit(0));
      });
      process.on("SIGTERM", () => {
        this.flush().finally(() => process.exit(0));
      });
    }
    this.log("Telemetry initialized", { serverName: config.serverName });
  }
  /**
   * Track a tool invocation
   */
  trackToolCall(tool, duration, success, error) {
    const metric = {
      tool,
      duration,
      success,
      ...error && { error },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.buffer.push(metric);
    this.log("Metric tracked", { ...metric });
    if (this.buffer.length >= this.config.batchSize) {
      this.flush().catch(this.handleError.bind(this));
    }
  }
  /**
   * Flush buffered metrics to OpenConductor
   */
  async flush() {
    if (this.buffer.length === 0) return;
    const metrics = [...this.buffer];
    this.buffer = [];
    const batch = {
      serverName: this.config.serverName,
      serverVersion: this.config.serverVersion,
      metrics,
      meta: {
        sdkVersion: SDK_VERSION,
        nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
        platform: typeof process !== "undefined" ? process.platform : "unknown"
      }
    };
    this.log("Flushing metrics", { count: metrics.length });
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
          "X-OpenConductor-SDK": SDK_VERSION
        },
        body: JSON.stringify(batch)
      });
      if (!response.ok) {
        throw new Error(`Telemetry flush failed: ${response.status} ${response.statusText}`);
      }
      this.log("Metrics flushed successfully", { count: metrics.length });
    } catch (error) {
      this.buffer.unshift(...metrics);
      throw error;
    }
  }
  /**
   * Stop telemetry collection
   */
  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush().catch(this.handleError.bind(this));
    this.log("Telemetry shutdown");
  }
  log(message, data) {
    if (this.config.debug) {
      console.debug(JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        level: "debug",
        service: "openconductor-telemetry",
        message,
        ...data
      }));
    }
  }
  handleError(error) {
    if (this.config.debug) {
      console.error("[OpenConductor Telemetry Error]", error);
    }
  }
};
var DEMO_PREFIX2 = "[\u{1F3AE} DEMO]";
var DemoTelemetry = class {
  serverName;
  serverVersion;
  buffer = [];
  constructor(serverName, serverVersion) {
    this.serverName = serverName;
    this.serverVersion = serverVersion ?? "0.0.0";
    console.log(`${DEMO_PREFIX2} Telemetry initialized (console mode) for ${serverName}`);
  }
  /**
   * Track a tool invocation - logs to console in demo mode
   */
  trackToolCall(tool, duration, success, error) {
    const metric = {
      tool,
      duration,
      success,
      ...error && { error },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.buffer.push(metric);
    demoLogger.telemetry("track", {
      tool,
      duration: `${duration}ms`,
      success,
      ...error && { error }
    });
  }
  /**
   * Flush - in demo mode, just logs a summary
   */
  async flush() {
    if (this.buffer.length === 0) return;
    const count = this.buffer.length;
    demoLogger.telemetry("flush", {
      message: `Would send ${count} metrics to OpenConductor`,
      metrics: this.buffer.slice(0, 3),
      ...count > 3 && { more: `...and ${count - 3} more` }
    });
    this.buffer = [];
  }
  /**
   * Shutdown - no-op in demo mode
   */
  shutdown() {
    console.log(`${DEMO_PREFIX2} Telemetry shutdown`);
  }
  /**
   * Get buffered metrics (useful for testing/inspection)
   */
  getBuffer() {
    return [...this.buffer];
  }
};

// src/server/index.ts
function createHealthCheck(info) {
  return async () => {
    const checks = {};
    let allHealthy = true;
    if (info.checks) {
      for (const [name, check] of Object.entries(info.checks)) {
        try {
          checks[name] = await check();
          if (!checks[name]) allHealthy = false;
        } catch {
          checks[name] = false;
          allHealthy = false;
        }
      }
    }
    return {
      status: allHealthy ? "healthy" : "degraded",
      name: info.name,
      version: info.version,
      ...info.description && { description: info.description },
      ...info.uptime && { uptime: info.uptime() },
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...Object.keys(checks).length > 0 && { checks }
    };
  };
}
function wrapTool(handler, options) {
  const {
    name,
    timeout = 3e4,
    telemetry: enableTelemetry = true
  } = options;
  const baseLogger = options.logger ?? createLogger(name);
  return async (input) => {
    const callId = generateCallId();
    const startTime = Date.now();
    const log = baseLogger.child({ callId });
    const ctx = { callId, name, startTime, log };
    log.info("Tool invoked", { tool: name, input: sanitizeInput(input) });
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(name, timeout));
        }, timeout);
      });
      const result = await Promise.race([
        Promise.resolve(handler(input, ctx)),
        timeoutPromise
      ]);
      const duration = Date.now() - startTime;
      log.info("Tool completed", { tool: name, duration });
      if (enableTelemetry) {
        const tel = getTelemetry();
        tel?.trackToolCall(name, duration, true);
      }
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error("Tool failed", {
        tool: name,
        duration,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : void 0
      });
      if (enableTelemetry) {
        const tel = getTelemetry();
        tel?.trackToolCall(name, duration, false, errorMessage);
      }
      if (error instanceof MCPError) {
        throw error;
      }
      throw new ToolExecutionError(
        name,
        errorMessage,
        error instanceof Error ? error : void 0
      );
    }
  };
}
function generateCallId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function sanitizeInput(input) {
  if (typeof input !== "object" || input === null) return input;
  const sensitiveKeys = ["password", "token", "secret", "key", "auth", "credential"];
  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

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

Object.defineProperty(exports, "ZodError", {
  enumerable: true,
  get: function () { return zod.ZodError; }
});
Object.defineProperty(exports, "z", {
  enumerable: true,
  get: function () { return zod.z; }
});
exports.AuthenticationError = AuthenticationError;
exports.AuthorizationError = AuthorizationError;
exports.ConfigurationError = ConfigurationError;
exports.DemoTelemetry = DemoTelemetry;
exports.DependencyError = DependencyError;
exports.ErrorCodes = ErrorCodes;
exports.InsufficientCreditsError = InsufficientCreditsError;
exports.MCPError = MCPError;
exports.MOCK_BILLING_STATUS = MOCK_BILLING_STATUS;
exports.MOCK_CREDIT_PACKS = MOCK_CREDIT_PACKS;
exports.MOCK_USER_BILLING = MOCK_USER_BILLING;
exports.PaymentRequiredError = PaymentRequiredError;
exports.RateLimitError = RateLimitError;
exports.ResourceNotFoundError = ResourceNotFoundError;
exports.SubscriptionRequiredError = SubscriptionRequiredError;
exports.Telemetry = Telemetry;
exports.TimeoutError = TimeoutError;
exports.ToolExecutionError = ToolExecutionError;
exports.ToolNotFoundError = ToolNotFoundError;
exports.ValidationError = ValidationError;
exports.canUserAccess = canUserAccess;
exports.createHealthCheck = createHealthCheck;
exports.createLogger = createLogger;
exports.createPaidTool = createPaidTool;
exports.demoLogger = demoLogger;
exports.getConfig = getConfig;
exports.getMockAnalytics = getMockAnalytics;
exports.getPaymentConfig = getPaymentConfig;
exports.getTelemetry = getTelemetry;
exports.getUserBillingStatus = getUserBillingStatus;
exports.initOpenConductor = initOpenConductor;
exports.initPayment = initPayment;
exports.initTelemetry = initTelemetry;
exports.isDemoMode = isDemoMode;
exports.isInitialized = isInitialized;
exports.requirePayment = requirePayment;
exports.resetConfig = resetConfig;
exports.schemas = schemas;
exports.validate = validate;
exports.validateInput = validateInput;
exports.wrapTool = wrapTool;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map