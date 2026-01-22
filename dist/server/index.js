'use strict';

// src/errors/codes.ts
var ErrorCodes = {
  TOOL_EXECUTION_ERROR: -32002,
  TIMEOUT_ERROR: -32007};

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
var TimeoutError = class extends MCPError {
  constructor(operation, timeoutMs) {
    super(ErrorCodes.TIMEOUT_ERROR, `Operation '${operation}' timed out after ${timeoutMs}ms`, {
      operation,
      timeoutMs
    });
    this.name = "TimeoutError";
  }
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
var globalTelemetry = null;
function getTelemetry() {
  return globalTelemetry;
}

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

exports.createHealthCheck = createHealthCheck;
exports.wrapTool = wrapTool;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map