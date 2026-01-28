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

exports.getConfig = getConfig;
exports.initOpenConductor = initOpenConductor;
exports.isDemoMode = isDemoMode;
exports.isInitialized = isInitialized;
exports.resetConfig = resetConfig;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map