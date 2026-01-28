import { describe, it, expect, vi } from 'vitest'
import {
  MOCK_BILLING_STATUS,
  MOCK_USER_BILLING,
  MOCK_CREDIT_PACKS,
  getMockAnalytics,
  demoLogger,
} from '../src/demo'

describe('Demo Module', () => {
  describe('Mock Data', () => {
    it('provides valid mock billing status', () => {
      expect(MOCK_BILLING_STATUS.allowed).toBe(true)
      expect(MOCK_BILLING_STATUS.credits).toBe(9999)
      expect(MOCK_BILLING_STATUS.tier).toBe('demo')
    })

    it('provides valid mock user billing', () => {
      expect(MOCK_USER_BILLING.credits).toBe(9999)
      expect(MOCK_USER_BILLING.active).toBe(true)
    })

    it('provides all credit pack tiers', () => {
      expect(MOCK_CREDIT_PACKS.starter).toBeDefined()
      expect(MOCK_CREDIT_PACKS.pro).toBeDefined()
      expect(MOCK_CREDIT_PACKS.business).toBeDefined()
      
      expect(MOCK_CREDIT_PACKS.starter.credits).toBe(100)
      expect(MOCK_CREDIT_PACKS.pro.credits).toBe(500)
      expect(MOCK_CREDIT_PACKS.business.credits).toBe(2000)
    })
  })

  describe('getMockAnalytics', () => {
    it('generates analytics for 24h period', () => {
      const analytics = getMockAnalytics('24h')
      
      expect(analytics.period).toBe('24h')
      expect(analytics.balance).toBe(9999)
      expect(analytics.usageTimeline.length).toBe(1)
    })

    it('generates analytics for 7d period', () => {
      const analytics = getMockAnalytics('7d')
      
      expect(analytics.period).toBe('7d')
      expect(analytics.usageTimeline.length).toBe(7)
    })

    it('generates analytics for 30d period', () => {
      const analytics = getMockAnalytics('30d')
      
      expect(analytics.period).toBe('30d')
      expect(analytics.usageTimeline.length).toBe(30)
    })

    it('includes top tools', () => {
      const analytics = getMockAnalytics('7d')
      
      expect(analytics.topTools.length).toBeGreaterThan(0)
      expect(analytics.topTools[0]).toHaveProperty('tool')
      expect(analytics.topTools[0]).toHaveProperty('calls')
      expect(analytics.topTools[0]).toHaveProperty('credits')
    })

    it('includes recent transactions', () => {
      const analytics = getMockAnalytics('7d')
      
      expect(analytics.recentTransactions.length).toBe(10)
      expect(analytics.recentTransactions[0]).toHaveProperty('id')
      expect(analytics.recentTransactions[0]).toHaveProperty('amount')
    })
  })

  describe('demoLogger', () => {
    it('logs telemetry events', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      demoLogger.telemetry('track', { tool: 'test', duration: 100 })
      
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.calls[0][0]).toContain('DEMO')
      
      spy.mockRestore()
    })

    it('logs payment events', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      demoLogger.payment('check', { userId: 'user_123' })
      
      expect(spy).toHaveBeenCalled()
      
      spy.mockRestore()
    })
  })
})
