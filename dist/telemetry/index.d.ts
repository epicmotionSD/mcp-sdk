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
 * Call this once at startup with your OpenConductor API key
 */
declare function initTelemetry(config: TelemetryConfig): Telemetry;
/**
 * Get the global telemetry instance (if initialized)
 */
declare function getTelemetry(): Telemetry | null;
declare class Telemetry {
    private config;
    private buffer;
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
    private log;
    private handleError;
}

export { Telemetry, type TelemetryBatch, type TelemetryConfig, type ToolMetric, getTelemetry, initTelemetry };
