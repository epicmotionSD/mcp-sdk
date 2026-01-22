/**
 * JSON-RPC 2.0 Standard Error Codes
 * https://www.jsonrpc.org/specification#error_object
 */
declare const ErrorCodes: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly TOOL_NOT_FOUND: -32001;
    readonly TOOL_EXECUTION_ERROR: -32002;
    readonly RESOURCE_NOT_FOUND: -32003;
    readonly AUTHENTICATION_ERROR: -32004;
    readonly AUTHORIZATION_ERROR: -32005;
    readonly RATE_LIMIT_ERROR: -32006;
    readonly TIMEOUT_ERROR: -32007;
    readonly VALIDATION_ERROR: -32008;
    readonly DEPENDENCY_ERROR: -32009;
    readonly CONFIGURATION_ERROR: -32010;
};
type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Base error class for MCP servers
 * Formats errors according to JSON-RPC 2.0 specification
 */
declare class MCPError extends Error {
    readonly code: ErrorCode;
    readonly data?: Record<string, unknown>;
    constructor(code: ErrorCode, message: string, data?: Record<string, unknown>);
    /**
     * Returns JSON-RPC 2.0 formatted error object
     */
    toJSON(): {
        data?: Record<string, unknown> | undefined;
        code: ErrorCode;
        message: string;
    };
    /**
     * Create error response for JSON-RPC
     */
    toResponse(id?: string | number | null): {
        jsonrpc: "2.0";
        id: string | number | null;
        error: {
            data?: Record<string, unknown> | undefined;
            code: ErrorCode;
            message: string;
        };
    };
}
/**
 * Thrown when tool input validation fails
 */
declare class ValidationError extends MCPError {
    constructor(field: string, reason: string, value?: unknown);
}
/**
 * Thrown when a requested tool doesn't exist
 */
declare class ToolNotFoundError extends MCPError {
    constructor(toolName: string);
}
/**
 * Thrown when tool execution fails
 */
declare class ToolExecutionError extends MCPError {
    constructor(toolName: string, reason: string, cause?: Error);
}
/**
 * Thrown when a requested resource doesn't exist
 */
declare class ResourceNotFoundError extends MCPError {
    constructor(resourceUri: string);
}
/**
 * Thrown when authentication fails
 */
declare class AuthenticationError extends MCPError {
    constructor(reason?: string);
}
/**
 * Thrown when authorization fails (authenticated but not permitted)
 */
declare class AuthorizationError extends MCPError {
    constructor(action: string, resource?: string);
}
/**
 * Thrown when rate limits are exceeded
 */
declare class RateLimitError extends MCPError {
    constructor(retryAfterMs?: number);
}
/**
 * Thrown when an operation times out
 */
declare class TimeoutError extends MCPError {
    constructor(operation: string, timeoutMs: number);
}
/**
 * Thrown when a required dependency is unavailable
 */
declare class DependencyError extends MCPError {
    constructor(dependency: string, reason: string);
}
/**
 * Thrown when server configuration is invalid
 */
declare class ConfigurationError extends MCPError {
    constructor(setting: string, reason: string);
}

export { AuthenticationError, AuthorizationError, ConfigurationError, DependencyError, type ErrorCode, ErrorCodes, MCPError, RateLimitError, ResourceNotFoundError, TimeoutError, ToolExecutionError, ToolNotFoundError, ValidationError };
