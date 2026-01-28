# Demo Mode Implementation - Telemetry Module Changes

## File: src/telemetry/index.ts

### Add imports at top:

```typescript
import { getConfig, isDemoMode } from '../config'
import { demoLogger } from '../demo'
```

### Modify initTelemetry():

```typescript
export function initTelemetry(config?: TelemetryConfig): Telemetry {
  const sdkConfig = getConfig()
  
  // In demo mode, create a demo telemetry instance
  if (sdkConfig.demoMode) {
    globalTelemetry = new DemoTelemetry(sdkConfig.serverName, sdkConfig.serverVersion)
    return globalTelemetry
  }
  
  // Production mode - require config
  if (!config?.apiKey) {
    throw new Error('Telemetry requires apiKey in production mode')
  }
  
  globalTelemetry = new Telemetry(config)
  return globalTelemetry
}
```

### Add DemoTelemetry class:

```typescript
/**
 * Demo telemetry that logs to console instead of sending to API
 */
class DemoTelemetry extends Telemetry {
  private demoBuffer: ToolMetric[] = []
  
  constructor(serverName: string, serverVersion?: string) {
    // Create with dummy config - we won't use the API
    super({
      apiKey: 'demo',
      serverName,
      serverVersion,
      debug: true, // Always debug in demo
    })
  }
  
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
    
    this.demoBuffer.push(metric)
    
    // Log to console in demo mode
    demoLogger.telemetry('track', {
      tool,
      duration: `${duration}ms`,
      success,
      ...(error && { error }),
    })
  }
  
  async flush(): Promise<void> {
    if (this.demoBuffer.length === 0) return
    
    const count = this.demoBuffer.length
    
    // Log summary instead of sending
    demoLogger.telemetry('flush', {
      message: `Would send ${count} metrics to OpenConductor`,
      metrics: this.demoBuffer.slice(0, 3), // Show first 3
      ...(count > 3 && { more: `...and ${count - 3} more` }),
    })
    
    this.demoBuffer = []
  }
  
  /**
   * Get buffered metrics (useful for testing/inspection)
   */
  getBuffer(): ToolMetric[] {
    return [...this.demoBuffer]
  }
}
```

### Export for testing:

```typescript
export { DemoTelemetry }
```
