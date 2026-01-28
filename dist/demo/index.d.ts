import { BillingStatus, CreditPack, CreditPackInfo, UsageAnalytics } from '../payment/index.js';
import { ToolMetric } from '../telemetry/index.js';
import '../errors/index.js';

/**
 * @openconductor/mcp-sdk - Demo Mode Mock Data
 *
 * Realistic sample data for zero-config demo experience
 */

declare const MOCK_BILLING_STATUS: BillingStatus;
declare const MOCK_USER_BILLING: {
    credits: number;
    tier: string;
    active: boolean;
};
declare const MOCK_CREDIT_PACKS: Record<CreditPack, CreditPackInfo>;
declare function getMockAnalytics(period: '24h' | '7d' | '30d' | 'all'): UsageAnalytics;
declare function createMockMetric(tool: string, duration: number, success: boolean): ToolMetric;
declare const demoLogger: {
    telemetry: (action: string, data: Record<string, unknown>) => void;
    payment: (action: string, data: Record<string, unknown>) => void;
    billing: (userId: string, result: BillingStatus) => void;
    deduct: (userId: string, credits: number, tool: string) => void;
};

export { MOCK_BILLING_STATUS, MOCK_CREDIT_PACKS, MOCK_USER_BILLING, createMockMetric, demoLogger, getMockAnalytics };
