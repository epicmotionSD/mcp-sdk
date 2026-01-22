type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogEntry {
    timestamp?: string;
    level: LogLevel;
    service: string;
    message: string;
    [key: string]: unknown;
}
interface LoggerOptions {
    /** Minimum log level to output (default: 'info') */
    level?: LogLevel;
    /** Custom output function (default: console methods) */
    output?: (entry: LogEntry) => void;
    /** Include timestamps (default: true) */
    timestamps?: boolean;
    /** Pretty print JSON (default: false, use true for local dev) */
    pretty?: boolean;
}
/**
 * Creates a structured logger for MCP servers
 */
declare function createLogger(service: string, options?: LoggerOptions): {
    debug: (message: string, data?: Record<string, unknown>) => LogEntry | undefined;
    info: (message: string, data?: Record<string, unknown>) => LogEntry | undefined;
    warn: (message: string, data?: Record<string, unknown>) => LogEntry | undefined;
    error: (message: string, data?: Record<string, unknown>) => LogEntry | undefined;
    /**
     * Create a child logger with additional context
     */
    child: (context: Record<string, unknown>) => /*elided*/ any;
};
type Logger = ReturnType<typeof createLogger>;

export { type LogEntry, type LogLevel, type Logger, type LoggerOptions, createLogger };
