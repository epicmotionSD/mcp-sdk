'use strict';

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

exports.DemoTelemetry = DemoTelemetry;
exports.Telemetry = Telemetry;
exports.getTelemetry = getTelemetry;
exports.initTelemetry = initTelemetry;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map