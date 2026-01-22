export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp?: string
  level: LogLevel
  service: string
  message: string
  [key: string]: unknown
}

export interface LoggerOptions {
  /** Minimum log level to output (default: 'info') */
  level?: LogLevel
  /** Custom output function (default: console methods) */
  output?: (entry: LogEntry) => void
  /** Include timestamps (default: true) */
  timestamps?: boolean
  /** Pretty print JSON (default: false, use true for local dev) */
  pretty?: boolean
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Creates a structured logger for MCP servers
 */
export function createLogger(service: string, options: LoggerOptions = {}) {
  const {
    level: minLevel = 'info',
    timestamps = true,
    pretty = false,
  } = options

  const shouldLog = (level: LogLevel): boolean => {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel]
  }

  const formatEntry = (entry: LogEntry): string => {
    return pretty ? JSON.stringify(entry, null, 2) : JSON.stringify(entry)
  }

  const log = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    if (!shouldLog(level)) return

    const entry: LogEntry = {
      ...(timestamps && { timestamp: new Date().toISOString() }),
      level,
      service,
      message,
      ...data,
    }

    if (options.output) {
      options.output(entry)
    } else {
      const formatted = formatEntry(entry)
      switch (level) {
        case 'debug':
          console.debug(formatted)
          break
        case 'info':
          console.info(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        case 'error':
          console.error(formatted)
          break
      }
    }

    return entry
  }

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
    
    /**
     * Create a child logger with additional context
     */
    child: (context: Record<string, unknown>) => {
      return createLogger(service, {
        ...options,
        output: (entry) => {
          const merged = { ...entry, ...context }
          if (options.output) {
            options.output(merged)
          } else {
            const formatted = pretty ? JSON.stringify(merged, null, 2) : JSON.stringify(merged)
            console[entry.level](formatted)
          }
        },
      })
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
