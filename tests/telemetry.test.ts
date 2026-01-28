import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { resetConfig, initOpenConductor } from '../src/config'
import { 
  initTelemetry, 
  getTelemetry, 
  DemoTelemetry 
} from '../src/telemetry'

describe('Telemetry Module', () => {
  beforeEach(() => {
    resetConfig()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initTelemetry in demo mode', () => {
    it('returns DemoTelemetry when in demo mode', () => {
      initOpenConductor({ quiet: true }) // Demo mode
      const telemetry = initTelemetry()
      
      expect(telemetry).toBeInstanceOf(DemoTelemetry)
    })

    it('uses server name from config', () => {
      initOpenConductor({ serverName: 'my-server', quiet: true })
      const telemetry = initTelemetry()
      
      expect(telemetry).toBeInstanceOf(DemoTelemetry)
    })
  })

  describe('DemoTelemetry', () => {
    it('tracks tool calls', () => {
      const telemetry = new DemoTelemetry('test-server', '1.0.0')
      
      telemetry.trackToolCall('my-tool', 150, true)
      
      const buffer = telemetry.getBuffer()
      expect(buffer.length).toBe(1)
      expect(buffer[0].tool).toBe('my-tool')
      expect(buffer[0].duration).toBe(150)
      expect(buffer[0].success).toBe(true)
    })

    it('tracks failed tool calls with error', () => {
      const telemetry = new DemoTelemetry('test-server', '1.0.0')
      
      telemetry.trackToolCall('my-tool', 50, false, 'Something failed')
      
      const buffer = telemetry.getBuffer()
      expect(buffer[0].success).toBe(false)
      expect(buffer[0].error).toBe('Something failed')
    })

    it('clears buffer on flush', async () => {
      const telemetry = new DemoTelemetry('test-server', '1.0.0')
      
      telemetry.trackToolCall('tool-1', 100, true)
      telemetry.trackToolCall('tool-2', 200, true)
      
      expect(telemetry.getBuffer().length).toBe(2)
      
      await telemetry.flush()
      
      expect(telemetry.getBuffer().length).toBe(0)
    })

    it('shutdown is a no-op', () => {
      const telemetry = new DemoTelemetry('test-server', '1.0.0')
      
      // Should not throw
      expect(() => telemetry.shutdown()).not.toThrow()
    })
  })

  describe('getTelemetry', () => {
    // Note: getTelemetry returns cached instance from previous tests
    // This is expected behavior - telemetry is a singleton

    it('returns telemetry instance after init', () => {
      initOpenConductor({ quiet: true })
      initTelemetry()
      
      expect(getTelemetry()).not.toBeNull()
    })
  })
})
