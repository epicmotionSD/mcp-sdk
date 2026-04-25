'use strict';

// src/errors/codes.ts
var ErrorCodes = {
  CONFIGURATION_ERROR: -32010};

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

// src/broker/index.ts
var NotImplementedBroker = class {
  fail(method) {
    throw new ConfigurationError(
      "broker",
      `Broker.${method}() runtime not yet wired (planned for v1.5.1). Use NotImplementedBroker only for type-checking integration code.`
    );
  }
  async resolve(_req) {
    this.fail("resolve");
  }
  resolveStream(_req) {
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            throw new ConfigurationError(
              "broker",
              "Broker.resolveStream() runtime not yet wired (planned for v1.5.1)."
            );
          }
        };
      }
    };
  }
  async list(_tenantId, _filter) {
    this.fail("list");
  }
  async dryRun(_req) {
    this.fail("dryRun");
  }
};

exports.NotImplementedBroker = NotImplementedBroker;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map