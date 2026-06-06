// ── Auth Types ──────────────────────────────────────────────

export type Tier = "free" | "pro";

export interface ApiKeyRecord {
  id: string;
  user_email: string;
  key_hash: string;
  key_prefix: string;
  tier: Tier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface AuthResult {
  valid: true;
  keyId: string;
  tier: Tier;
}

export interface AuthFailure {
  valid: false;
  reason: string;
}

export type AuthOutcome = AuthResult | AuthFailure;

// ── Metering Types ──────────────────────────────────────────

export interface UsageEvent {
  api_key_id: string;
  tool_name: string;
  model_used: string;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number | null;
  error: boolean;
}

export interface QuotaCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number | null; // null = unlimited (pro)
}

// ── Engine Types ────────────────────────────────────────────

export interface SkillRequest {
  toolName: string;
  systemPrompt: string;
  userMessage: string;
  tier: Tier;
}

export interface SkillResult {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

// ── Tool Types ──────────────────────────────────────────────

export interface ToolContext {
  keyId: string;
  tier: Tier;
  callSkill: (request: SkillRequest) => Promise<SkillResult>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  durationMs: number;
}

// ── Financial Types ────────────────────────────────────────

export type TransactionType =
  | "revenue"
  | "cogs"
  | "operating_expense"
  | "non_operating_income"
  | "non_operating_expense"
  | "transfer";

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface ClassifiedTransaction extends Transaction {
  classification: TransactionType;
  confidence: "high" | "medium" | "low";
}

export interface LineItem {
  label: string;
  amount: number;
}

export interface IncomeStatement {
  period: string;
  revenue: LineItem[];
  totalRevenue: number;
  cogs: LineItem[];
  totalCogs: number;
  grossProfit: number;
  operatingExpenses: LineItem[];
  totalOperatingExpenses: number;
  operatingIncome: number;
  nonOperatingIncome: number;
  nonOperatingExpenses: number;
  netIncome: number;
}

export interface BalanceSheetSnapshot {
  period: string;
  cumulativeCashPosition: number;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
}

export interface CashFlowStatement {
  period: string;
  operating: number;
  investing: number;
  financing: number;
  netCashFlow: number;
}

export interface PeriodMetrics {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  grossMarginPct: number;
  operatingMarginPct: number;
}

export interface Trend {
  metric: string;
  direction: "up" | "down" | "flat";
  changePct: number;
  currentValue: number;
  priorValue: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  pctOfTotal: number;
  direction: "up" | "down" | "flat";
}

export interface FinancialStatementResult {
  incomeStatements: IncomeStatement[];
  balanceSheetSnapshots: BalanceSheetSnapshot[];
  cashFlowStatements: CashFlowStatement[];
  periodMetrics: PeriodMetrics[];
  trends: Trend[];
  topExpenseCategories: CategoryBreakdown[];
  topRevenueCategories: CategoryBreakdown[];
}

// ── Constants ───────────────────────────────────────────────

export const FREE_TIER_MONTHLY_LIMIT = 15;
export const KEY_PREFIX = "crunch_live_";
export const KEY_RANDOM_LENGTH = 32;
export const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const AUTH_CACHE_MAX_SIZE = 1000;
export const MAX_INPUT_BYTES = 200 * 1024; // 200KB
