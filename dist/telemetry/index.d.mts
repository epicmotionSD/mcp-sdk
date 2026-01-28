interface TelemetryConfig {
    /** Your OpenConductor API key */
    apiKey: string;
    /** Server name for identification */
    serverName: string;
    /** Server version */
    serverVersion?: string;
    /** Custom endpoint (default: OpenConductor production) */
    endpoint?: string;
    /** Batch size before flushing (default: 10) */
    batchSize?: number;
    /** Flush interval in ms (default: 30000) */
    flushInterval?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}
interface ToolMetric {
    tool: string;
    duration: number;
    success: boolean;
    error?: string;
    timestamp: string;
}
interface TelemetryBatch {
    serverName: string;
    serverVersion?: string;
    metrics: ToolMetric[];
    meta: {
        sdkVersion: string;
        nodeVersion: string;
        platform: string;
    };
}
/**
 * Initialize telemetry for your MCP server
 *
 * In demo mode, this is optional - telemetry will log to console instead of API.
 * Call this once at startup with your OpenConductor API key for production.
 */
declare function initTelemetry(config?: TelemetryConfig): Telemetry | DemoTelemetry;
/**
 * Get the global telemetry instance (if initialized)
 */
declare function getTelemetry(): Telemetry | DemoTelemetry | null;
declare class Telemetry {
    private config;
    protected buffer: ToolMetric[];
    private flushTimer;
    constructor(config: TelemetryConfig);
    /**
     * Track a tool invocation
     */
    trackToolCall(tool: string, duration: number, success: boolean, error?: string): void;
    /**
     * Flush buffered metrics to OpenConductor
     */
    flush(): Promise<void>;
    /**
     * Stop telemetry collection
     */
    shutdown(): void;
    protected log(message: string, data?: Record<string, unknown>): void;
    private handleError;
}
/**
 * Demo telemetry that logs to console instead of sending to API
 * Automatically used in demo mode
 */
declare class DemoTelemetry {
    private serverName;
    private serverVersion;
    private buffer;
    constructor(serverName: string, serverVersion?: string);
    /**
     * Track a tool invocation - logs to console in demo mode
     */
    trackToolCall(tool: string, duration: number, success: boolean, error?: string): void;
    /**
     * Flush - in demo mode, just logs a summary
     */
    flush(): Promise<void>;
    /**
     * Shutdown - no-op in demo mode
     */
    shutdown(): void;
    /**
     * Get buffered metrics (useful for testing/inspection)
     */
    getBuffer(): ToolMetric[];
}

export { DemoTelemetry, Telemetry, type TelemetryBatch, type TelemetryConfig, type ToolMetric, getTelemetry, initTelemetry };
