'use strict';

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

exports.createLogger = createLogger;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map