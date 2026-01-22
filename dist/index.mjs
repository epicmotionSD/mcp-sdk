import { z } from 'zod';
export { ZodError, z } from 'zod';

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
  CONFIGURATION_ERROR: -32010
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
function validate(schema, input, options = {}) {
  const { stripUnknown = true } = options;
  const result = stripUnknown ? schema.safeParse(input) : schema instanceof z.ZodObject ? schema.strict().safeParse(input) : schema.safeParse(input);
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
  nonEmptyString: z.string().min(1, "Cannot be empty"),
  /** Positive integer */
  positiveInt: z.number().int().positive(),
  /** Pagination limit (1-100, default 10) */
  limit: z.number().int().min(1).max(100).default(10),
  /** Pagination offset (>= 0, default 0) */
  offset: z.number().int().min(0).default(0),
  /** URL string */
  url: z.string().url(),
  /** Email string */
  email: z.string().email(),
  /** UUID string */
  uuid: z.string().uuid(),
  /** ISO date string */
  isoDate: z.string().datetime(),
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: z.union([
    z.boolean(),
    z.enum(["true", "false"]).transform((v) => v === "true")
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

export { AuthenticationError, AuthorizationError, ConfigurationError, DependencyError, ErrorCodes, MCPError, RateLimitError, ResourceNotFoundError, Telemetry, TimeoutError, ToolExecutionError, ToolNotFoundError, ValidationError, createHealthCheck, createLogger, getTelemetry, initTelemetry, schemas, validate, validateInput, wrapTool };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map