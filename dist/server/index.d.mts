import { Logger } from '../logger/index.mjs';

interface HealthCheckInfo {
    name: string;
    version: string;
    description?: string;
    uptime?: () => number;
    checks?: Record<string, () => Promise<boolean> | boolean>;
}
interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    name: string;
    version: string;
    description?: string;
    uptime?: number;
    timestamp: string;
    checks?: Record<string, boolean>;
}
/**
 * Creates a standard health check response for MCP servers
 */
declare function createHealthCheck(info: HealthCheckInfo): () => Promise<HealthCheckResponse>;
interface WrapToolOptions {
    /** Tool name for logging and telemetry */
    name: string;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Custom logger instance */
    logger?: Logger;
    /** Enable telemetry reporting (default: true if telemetry initialized) */
    telemetry?: boolean;
}
interface ToolContext {
    /** Unique ID for this tool call */
    callId: string;
    /** Tool name */
    name: string;
    /** Start time of execution */
    startTime: number;
    /** Logger scoped to this call */
    log: Logger;
}
/**
 * Wraps a tool handler with automatic error handling, logging, timeouts, and telemetry
 */
declare function wrapTool<TInput, TOutput>(handler: (input: TInput, ctx: ToolContext) => TOutput | Promise<TOutput>, options: WrapToolOptions): (input: TInput) => Promise<TOutput>;

export { type HealthCheckInfo, type HealthCheckResponse, type ToolContext, type WrapToolOptions, createHealthCheck, wrapTool };
