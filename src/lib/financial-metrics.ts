import type {
  IncomeStatement,
  PeriodMetrics,
  Trend,
  CategoryBreakdown,
} from "../types/index.js";

function pctSafe(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function direction(current: number, prior: number): "up" | "down" | "flat" {
  if (current > prior) return "up";
  if (current < prior) return "down";
  return "flat";
}

export function buildPeriodMetrics(statements: IncomeStatement[]): PeriodMetrics[] {
  return statements.map((stmt) => ({
    period: stmt.period,
    revenue: stmt.totalRevenue,
    expenses: stmt.totalCogs + stmt.totalOperatingExpenses + stmt.nonOperatingExpenses,
    netIncome: stmt.netIncome,
    grossMarginPct: pctSafe(stmt.grossProfit, stmt.totalRevenue),
    operatingMarginPct: pctSafe(stmt.operatingIncome, stmt.totalRevenue),
  }));
}

export function buildTrends(metrics: PeriodMetrics[]): Trend[] {
  if (metrics.length < 2) return [];

  const current = metrics[metrics.length - 1];
  const prior = metrics[metrics.length - 2];

  const pairs: [string, number, number][] = [
    ["revenue", current.revenue, prior.revenue],
    ["expenses", current.expenses, prior.expenses],
    ["netIncome", current.netIncome, prior.netIncome],
    ["grossMarginPct", current.grossMarginPct, prior.grossMarginPct],
    ["operatingMarginPct", current.operatingMarginPct, prior.operatingMarginPct],
  ];

  return pairs.map(([metric, cur, pri]) => ({
    metric,
    direction: direction(cur, pri),
    changePct: pctSafe(cur - pri, Math.abs(pri)),
    currentValue: cur,
    priorValue: pri,
  }));
}

export function buildCategoryBreakdown(
  statements: IncomeStatement[],
  type: "expense" | "revenue",
): CategoryBreakdown[] {
  // Aggregate across all periods
  const totals = new Map<string, number>();
  const priorTotals = new Map<string, number>();
  const hasPrior = statements.length >= 2;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const items =
      type === "expense"
        ? [...stmt.cogs, ...stmt.operatingExpenses]
        : stmt.revenue;

    const target = i === statements.length - 1 && hasPrior ? totals : (hasPrior ? priorTotals : totals);

    for (const item of items) {
      target.set(item.label, (target.get(item.label) ?? 0) + item.amount);
    }
  }

  // If only one period, use totals for both
  if (!hasPrior) {
    for (const [k, v] of totals) {
      priorTotals.set(k, v);
    }
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      pctOfTotal: pctSafe(amount, grandTotal),
      direction: direction(amount, priorTotals.get(category) ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);
}
