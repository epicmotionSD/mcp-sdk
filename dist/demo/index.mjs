// src/demo/index.ts
var MOCK_BILLING_STATUS = {
  allowed: true,
  credits: 9999,
  tier: "demo",
  reason: void 0,
  actionUrl: "https://openconductor.ai/pricing"
};
var MOCK_USER_BILLING = {
  credits: 9999,
  tier: "demo",
  active: true
};
var MOCK_CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    credits: 100,
    price: 9.99,
    perCredit: 0.0999,
    savings: 0,
    bestFor: "Testing and small projects"
  },
  pro: {
    name: "Pro Pack",
    credits: 500,
    price: 39.99,
    perCredit: 0.0799,
    savings: 20,
    bestFor: "Growing projects",
    popular: true
  },
  business: {
    name: "Business Pack",
    credits: 2e3,
    price: 119.99,
    perCredit: 0.0599,
    savings: 40,
    bestFor: "Production workloads"
  }
};
function generateMockTimeline(days) {
  const timeline = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeline.push({
      date: date.toISOString().split("T")[0],
      used: Math.floor(Math.random() * 50) + 10,
      purchased: i % 7 === 0 ? 500 : 0
      // Weekly purchases
    });
  }
  return timeline;
}
function generateMockTransactions(count) {
  const tools = ["analyze-data", "generate-report", "search-docs", "summarize", "translate"];
  const transactions = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = 0; i < count; i++) {
    const isDebit = Math.random() > 0.2;
    const date = new Date(now);
    date.setHours(date.getHours() - i * 2);
    transactions.push({
      id: `txn_demo_${i}`,
      amount: isDebit ? -(Math.floor(Math.random() * 20) + 1) : 500,
      type: isDebit ? "usage" : "purchase",
      tool: isDebit ? tools[Math.floor(Math.random() * tools.length)] : null,
      createdAt: date.toISOString()
    });
  }
  return transactions;
}
function getMockAnalytics(period) {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const timeline = generateMockTimeline(days);
  const totalUsed = timeline.reduce((sum, d) => sum + d.used, 0);
  const totalPurchased = timeline.reduce((sum, d) => sum + d.purchased, 0);
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
      transactionCount: days * 3
    },
    topTools: [
      { tool: "analyze-data", calls: 156, credits: 780 },
      { tool: "generate-report", calls: 89, credits: 445 },
      { tool: "search-docs", calls: 234, credits: 234 },
      { tool: "summarize", calls: 67, credits: 335 },
      { tool: "translate", calls: 45, credits: 90 }
    ],
    usageTimeline: timeline,
    recentTransactions: generateMockTransactions(10)
  };
}
function createMockMetric(tool, duration, success) {
  return {
    tool,
    duration,
    success,
    error: success ? void 0 : "Mock error for demo",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var DEMO_PREFIX = "[\u{1F3AE} DEMO]";
var demoLogger = {
  telemetry: (action, data) => {
    console.log(`${DEMO_PREFIX} Telemetry ${action}:`, JSON.stringify(data, null, 2));
  },
  payment: (action, data) => {
    console.log(`${DEMO_PREFIX} Payment ${action}:`, JSON.stringify(data, null, 2));
  },
  billing: (userId, result) => {
    console.log(`${DEMO_PREFIX} Billing check for ${userId}: ALLOWED (demo mode)`);
  },
  deduct: (userId, credits, tool) => {
    console.log(`${DEMO_PREFIX} Would deduct ${credits} credits from ${userId} for ${tool} (skipped in demo)`);
  }
};

export { MOCK_BILLING_STATUS, MOCK_CREDIT_PACKS, MOCK_USER_BILLING, createMockMetric, demoLogger, getMockAnalytics };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map