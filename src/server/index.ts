import { MCPError, ToolExecutionError, TimeoutError } from '../errors'
import { createLogger, type Logger } from '../logger'
import { getTelemetry } from '../telemetry'

export interface HealthCheckInfo {
  name: string
  version: string
  description?: string
  uptime?: () => number
  checks?: Record<string, () => Promise<boolean> | boolean>
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  name: string
  version: string
  description?: string
  uptime?: number
  timestamp: string
  checks?: Record<string, boolean>
}

/**
 * Creates a standard health check response for MCP servers
 */
export function createHealthCheck(info: HealthCheckInfo) {
  return async (): Promise<HealthCheckResponse> => {
    const checks: Record<string, boolean> = {}
    let allHealthy = true

    if (info.checks) {
      for (const [name, check] of Object.entries(info.checks)) {
        try {
          checks[name] = await check()
          if (!checks[name]) allHealthy = false
        } catch {
          checks[name] = false
          allHealthy = false
        }
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      name: info.name,
      version: info.version,
      ...(info.description && { description: info.description }),
      ...(info.uptime && { uptime: info.uptime() }),
      timestamp: new Date().toISOString(),
      ...(Object.keys(checks).length > 0 && { checks }),
    }
  }
}


export interface WrapToolOptions {
  /** Tool name for logging and telemetry */
  name: string
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Custom logger instance */
  logger?: Logger
  /** Enable telemetry reporting (default: true if telemetry initialized) */
  telemetry?: boolean
}

export interface ToolContext {
  /** Unique ID for this tool call */
  callId: string
  /** Tool name */
  name: string
  /** Start time of execution */
  startTime: number
  /** Logger scoped to this call */
  log: Logger
}

/**
 * Wraps a tool handler with automatic error handling, logging, timeouts, and telemetry
 */
export function wrapTool<TInput, TOutput>(
  handler: (input: TInput, ctx: ToolContext) => TOutput | Promise<TOutput>,
  options: WrapToolOptions
): (input: TInput) => Promise<TOutput> {
  const {
    name,
    timeout = 30000,
    telemetry: enableTelemetry = true,
  } = options

  const baseLogger = options.logger ?? createLogger(name)

  return async (input: TInput): Promise<TOutput> => {
    const callId = generateCallId()
    const startTime = Date.now()
    const log = baseLogger.child({ callId })

    const ctx: ToolContext = { callId, name, startTime, log }

    log.info('Tool invoked', { tool: name, input: sanitizeInput(input) })

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(name, timeout))
        }, timeout)
      })

      // Race handler against timeout
      const result = await Promise.race([
        Promise.resolve(handler(input, ctx)),
        timeoutPromise,
      ])

      const duration = Date.now() - startTime
      log.info('Tool completed', { tool: name, duration })

      // Report success to telemetry
      if (enableTelemetry) {
        const tel = getTelemetry()
        tel?.trackToolCall(name, duration, true)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      log.error('Tool failed', { 
        tool: name, 
        duration, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Report failure to telemetry
      if (enableTelemetry) {
        const tel = getTelemetry()
        tel?.trackToolCall(name, duration, false, errorMessage)
      }

      // Re-throw MCPErrors as-is, wrap others
      if (error instanceof MCPError) {
        throw error
      }

      throw new ToolExecutionError(
        name,
        errorMessage,
        error instanceof Error ? error : undefined
      )
    }
  }
}

/**
 * Generates a unique call ID
 */
function generateCallId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Sanitizes input for logging (removes sensitive fields)
 */
function sanitizeInput(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential']
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
