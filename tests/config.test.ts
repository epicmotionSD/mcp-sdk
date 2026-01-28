import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initOpenConductor,
  getConfig,
  isDemoMode,
  isInitialized,
  resetConfig,
} from '../src/config'

describe('Config Module', () => {
  beforeEach(() => {
    resetConfig()
    // Clear any env vars
    delete process.env.OPENCONDUCTOR_API_KEY
    delete process.env.OPENCONDUCTOR_SERVER_NAME
    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initOpenConductor', () => {
    it('enables demo mode when no API key provided', () => {
      const config = initOpenConductor({ quiet: true })
      
      expect(config.demoMode).toBe(true)
      expect(config.apiKey).toBeNull()
      expect(config.initialized).toBe(true)
    })

    it('enables production mode when API key provided', () => {
      const config = initOpenConductor({ 
        apiKey: 'test_key_123',
        quiet: true 
      })
      
      expect(config.demoMode).toBe(false)
      expect(config.apiKey).toBe('test_key_123')
      expect(config.initialized).toBe(true)
    })

    it('reads API key from environment', () => {
      process.env.OPENCONDUCTOR_API_KEY = 'env_key_456'
      const config = initOpenConductor({ quiet: true })
      
      expect(config.demoMode).toBe(false)
      expect(config.apiKey).toBe('env_key_456')
    })

    it('prefers config apiKey over environment', () => {
      process.env.OPENCONDUCTOR_API_KEY = 'env_key'
      const config = initOpenConductor({ 
        apiKey: 'config_key',
        quiet: true 
      })
      
      expect(config.apiKey).toBe('config_key')
    })

    it('can force demo mode even with API key', () => {
      const config = initOpenConductor({ 
        apiKey: 'test_key',
        demoMode: true,
        quiet: true 
      })
      
      expect(config.demoMode).toBe(true)
      expect(config.apiKey).toBeNull()
    })

    it('uses server name from config', () => {
      const config = initOpenConductor({ 
        serverName: 'my-awesome-server',
        quiet: true 
      })
      
      expect(config.serverName).toBe('my-awesome-server')
    })

    it('prints demo banner when not quiet', () => {
      initOpenConductor({})
      
      expect(console.log).toHaveBeenCalled()
    })

    it('suppresses banner when quiet', () => {
      initOpenConductor({ quiet: true })
      
      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('getConfig', () => {
    it('auto-initializes in demo mode if not initialized', () => {
      expect(isInitialized()).toBe(false)
      
      const config = getConfig()
      
      expect(config.initialized).toBe(true)
      expect(config.demoMode).toBe(true)
    })

    it('returns existing config if already initialized', () => {
      initOpenConductor({ apiKey: 'my_key', quiet: true })
      const config = getConfig()
      
      expect(config.apiKey).toBe('my_key')
    })
  })

  describe('isDemoMode', () => {
    it('returns true in demo mode', () => {
      initOpenConductor({ quiet: true })
      expect(isDemoMode()).toBe(true)
    })

    it('returns false in production mode', () => {
      initOpenConductor({ apiKey: 'key', quiet: true })
      expect(isDemoMode()).toBe(false)
    })
  })

  describe('resetConfig', () => {
    it('resets to uninitialized state', () => {
      initOpenConductor({ apiKey: 'key', quiet: true })
      expect(isInitialized()).toBe(true)
      
      resetConfig()
      
      expect(isInitialized()).toBe(false)
    })
  })
})
