/**
 * @openconductor/mcp-sdk - Demo Mode Mock Data
 * 
 * Realistic sample data for zero-config demo experience
 */

import type { BillingStatus, UsageAnalytics, CreditPackInfo, CreditPack } from '../payment'
import type { ToolMetric } from '../telemetry'

// ============================================================================
// Mock Billing Data
// ============================================================================

export const MOCK_BILLING_STATUS: BillingStatus = {
  allowed: true,
  credits: 9999,
  tier: 'demo',
  reason: undefined,
  actionUrl: 'https://openconductor.ai/pricing',
}

export const MOCK_USER_BILLING = {
  credits: 9999,
  tier: 'demo',
  active: true,
}

export const MOCK_CREDIT_PACKS: Record<CreditPack, CreditPackInfo> = {
  starter: {
    name: 'Starter Pack',
    credits: 100,
    price: 9.99,
    perCredit: 0.0999,
    savings: 0,
    bestFor: 'Testing and small projects',
  },
  pro: {
    name: 'Pro Pack',
    credits: 500,
    price: 39.99,
    perCredit: 0.0799,
    savings: 20,
    bestFor: 'Growing projects',
    popular: true,
  },
  business: {
    name: 'Business Pack',
    credits: 2000,
    price: 119.99,
    perCredit: 0.0599,
    savings: 40,
    bestFor: 'Production workloads',
  },
}

// ============================================================================
// Mock Analytics Data
// ============================================================================

function generateMockTimeline(days: number): Array<{ date: string; used: number; purchased: number }> {
  const timeline: Array<{ date: string; used: number; purchased: number }> = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    timeline.push({
      date: date.toISOString().split('T')[0],
      used: Math.floor(Math.random() * 50) + 10,
      purchased: i % 7 === 0 ? 500 : 0, // Weekly purchases
    })
  }
  
  return timeline
}

function generateMockTransactions(count: number): UsageAnalytics['recentTransactions'] {
  const tools = ['analyze-data', 'generate-report', 'search-docs', 'summarize', 'translate']
  const transactions: UsageAnalytics['recentTransactions'] = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    const isDebit = Math.random() > 0.2
    const date = new Date(now)
    date.setHours(date.getHours() - i * 2)
    
    transactions.push({
      id: `txn_demo_${i}`,
      amount: isDebit ? -(Math.floor(Math.random() * 20) + 1) : 500,
      type: isDebit ? 'usage' : 'purchase',
      tool: isDebit ? tools[Math.floor(Math.random() * tools.length)] : null,
      createdAt: date.toISOString(),
    })
  }
  
  return transactions
}

export function getMockAnalytics(period: '24h' | '7d' | '30d' | 'all'): UsageAnalytics {
  const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90
  const timeline = generateMockTimeline(days)
  const totalUsed = timeline.reduce((sum, d) => sum + d.used, 0)
  const totalPurchased = timeline.reduce((sum, d) => sum + d.purchased, 0)
  
  return {
    period,
    balance: 9999,
    summary: {
      totalUsed,
      totalPurchased,
      netChange: totalPurchased - totalUsed,
      burnRate: totalUsed / days,
      daysRemaining: Math.floor(9999 / (totalUsed / days)),
      toolCount: 5,
      transactionCount: days * 3,
    },
    topTools: [
      { tool: 'analyze-data', calls: 156, credits: 780 },
      { tool: 'generate-report', calls: 89, credits: 445 },
      { tool: 'search-docs', calls: 234, credits: 234 },
      { tool: 'summarize', calls: 67, credits: 335 },
      { tool: 'translate', calls: 45, credits: 90 },
    ],
    usageTimeline: timeline,
    recentTransactions: generateMockTransactions(10),
  }
}

// ============================================================================
// Mock Telemetry Data
// ============================================================================

export function createMockMetric(tool: string, duration: number, success: boolean): ToolMetric {
  return {
    tool,
    duration,
    success,
    error: success ? undefined : 'Mock error for demo',
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// Demo Console Logger
// ============================================================================

const DEMO_PREFIX = '[🎮 DEMO]'

export const demoLogger = {
  telemetry: (action: string, data: Record<string, unknown>) => {
    console.log(`${DEMO_PREFIX} Telemetry ${action}:`, JSON.stringify(data, null, 2))
  },
  
  payment: (action: string, data: Record<string, unknown>) => {
    console.log(`${DEMO_PREFIX} Payment ${action}:`, JSON.stringify(data, null, 2))
  },
  
  billing: (userId: string, result: BillingStatus) => {
    console.log(`${DEMO_PREFIX} Billing check for ${userId}: ALLOWED (demo mode)`)
  },
  
  deduct: (userId: string, credits: number, tool: string) => {
    console.log(`${DEMO_PREFIX} Would deduct ${credits} credits from ${userId} for ${tool} (skipped in demo)`)
  },
}
