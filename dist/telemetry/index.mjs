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

export { Telemetry, getTelemetry, initTelemetry };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map