export interface TelemetryConfig {
  /** Your OpenConductor API key */
  apiKey: string
  /** Server name for identification */
  serverName: string
  /** Server version */
  serverVersion?: string
  /** Custom endpoint (default: OpenConductor production) */
  endpoint?: string
  /** Batch size before flushing (default: 10) */
  batchSize?: number
  /** Flush interval in ms (default: 30000) */
  flushInterval?: number
  /** Enable debug logging (default: false) */
  debug?: boolean
}

export interface ToolMetric {
  tool: string
  duration: number
  success: boolean
  error?: string
  timestamp: string
}

export interface TelemetryBatch {
  serverName: string
  serverVersion?: string
  metrics: ToolMetric[]
  meta: {
    sdkVersion: string
    nodeVersion: string
    platform: string
  }
}

const SDK_VERSION = '1.0.0'
const DEFAULT_ENDPOINT = 'https://api.openconductor.ai/functions/v1/telemetry'

let globalTelemetry: Telemetry | null = null

/**
 * Initialize telemetry for your MCP server
 * Call this once at startup with your OpenConductor API key
 */
export function initTelemetry(config: TelemetryConfig): Telemetry {
  globalTelemetry = new Telemetry(config)
  return globalTelemetry
}

/**
 * Get the global telemetry instance (if initialized)
 */
export function getTelemetry(): Telemetry | null {
  return globalTelemetry
}


export class Telemetry {
  private config: Required<Omit<TelemetryConfig, 'serverVersion'>> & Pick<TelemetryConfig, 'serverVersion'>
  private buffer: ToolMetric[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: TelemetryConfig) {
    this.config = {
      apiKey: config.apiKey,
      serverName: config.serverName,
      serverVersion: config.serverVersion,
      endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 30000,
      debug: config.debug ?? false,
    }

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush().catch(this.handleError.bind(this))
    }, this.config.flushInterval)

    // Flush on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.flush())
      process.on('SIGINT', () => {
        this.flush().finally(() => process.exit(0))
      })
      process.on('SIGTERM', () => {
        this.flush().finally(() => process.exit(0))
      })
    }

    this.log('Telemetry initialized', { serverName: config.serverName })
  }

  /**
   * Track a tool invocation
   */
  trackToolCall(
    tool: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const metric: ToolMetric = {
      tool,
      duration,
      success,
      ...(error && { error }),
      timestamp: new Date().toISOString(),
    }

    this.buffer.push(metric)
    this.log('Metric tracked', { ...metric })

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.batchSize) {
      this.flush().catch(this.handleError.bind(this))
    }
  }

  /**
   * Flush buffered metrics to OpenConductor
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const metrics = [...this.buffer]
    this.buffer = []

    const batch: TelemetryBatch = {
      serverName: this.config.serverName,
      serverVersion: this.config.serverVersion,
      metrics,
      meta: {
        sdkVersion: SDK_VERSION,
        nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
        platform: typeof process !== 'undefined' ? process.platform : 'unknown',
      },
    }

    this.log('Flushing metrics', { count: metrics.length })

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-OpenConductor-SDK': SDK_VERSION,
        },
        body: JSON.stringify(batch),
      })

      if (!response.ok) {
        throw new Error(`Telemetry flush failed: ${response.status} ${response.statusText}`)
      }

      this.log('Metrics flushed successfully', { count: metrics.length })
    } catch (error) {
      // Put metrics back in buffer on failure
      this.buffer.unshift(...metrics)
      throw error
    }
  }

  /**
   * Stop telemetry collection
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush().catch(this.handleError.bind(this))
    this.log('Telemetry shutdown')
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.debug(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        service: 'openconductor-telemetry',
        message,
        ...data,
      }))
    }
  }

  private handleError(error: unknown): void {
    if (this.config.debug) {
      console.error('[OpenConductor Telemetry Error]', error)
    }
  }
}
