import type {
  ClassifiedTransaction,
  IncomeStatement,
  BalanceSheetSnapshot,
  CashFlowStatement,
  LineItem,
} from "../types/index.js";

function toPeriodKey(dateStr: string): string {
  // Parse YYYY-MM-DD directly to avoid timezone offset issues
  // (new Date("2026-01-01") parses as UTC, but getMonth() uses local time)
  const match = dateStr.match(/^(\d{4})-(\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}`;

  // Fallback: use UTC methods for ISO strings
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function groupByPeriod(
  txs: ClassifiedTransaction[],
): Map<string, ClassifiedTransaction[]> {
  const groups = new Map<string, ClassifiedTransaction[]>();
  for (const tx of txs) {
    const key = toPeriodKey(tx.date);
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }
  return groups;
}

function sumByDescription(
  txs: ClassifiedTransaction[],
): LineItem[] {
  const map = new Map<string, number>();
  for (const tx of txs) {
    const label = tx.category ?? tx.description;
    map.set(label, (map.get(label) ?? 0) + Math.abs(tx.amount));
  }
  return Array.from(map.entries()).map(([label, amount]) => ({ label, amount }));
}

export function buildIncomeStatements(
  txs: ClassifiedTransaction[],
): IncomeStatement[] {
  const periods = groupByPeriod(txs);
  const sortedKeys = Array.from(periods.keys()).sort();

  return sortedKeys.map((period) => {
    const periodTxs = periods.get(period)!;

    const revenueTxs = periodTxs.filter((t) => t.classification === "revenue");
    const cogsTxs = periodTxs.filter((t) => t.classification === "cogs");
    const opexTxs = periodTxs.filter((t) => t.classification === "operating_expense");
    const nonOpIncome = periodTxs.filter((t) => t.classification === "non_operating_income");
    const nonOpExpense = periodTxs.filter((t) => t.classification === "non_operating_expense");

    const revenue = sumByDescription(revenueTxs);
    const cogs = sumByDescription(cogsTxs);
    const operatingExpenses = sumByDescription(opexTxs);

    const totalRevenue = revenue.reduce((s, i) => s + i.amount, 0);
    const totalCogs = cogs.reduce((s, i) => s + i.amount, 0);
    const grossProfit = totalRevenue - totalCogs;
    const totalOperatingExpenses = operatingExpenses.reduce((s, i) => s + i.amount, 0);
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const nonOperatingIncome = nonOpIncome.reduce((s, t) => s + Math.abs(t.amount), 0);
    const nonOperatingExpenses = nonOpExpense.reduce((s, t) => s + Math.abs(t.amount), 0);
    const netIncome = operatingIncome + nonOperatingIncome - nonOperatingExpenses;

    return {
      period,
      revenue,
      totalRevenue,
      cogs,
      totalCogs,
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      operatingIncome,
      nonOperatingIncome,
      nonOperatingExpenses,
      netIncome,
    };
  });
}

export function buildBalanceSheetSnapshots(
  statements: IncomeStatement[],
): BalanceSheetSnapshot[] {
  let cumulativeCash = 0;
  let cumulativeRevenue = 0;
  let cumulativeExpenses = 0;

  return statements.map((stmt) => {
    cumulativeRevenue += stmt.totalRevenue + stmt.nonOperatingIncome;
    cumulativeExpenses += stmt.totalCogs + stmt.totalOperatingExpenses + stmt.nonOperatingExpenses;
    cumulativeCash += stmt.netIncome;

    return {
      period: stmt.period,
      cumulativeCashPosition: cumulativeCash,
      cumulativeRevenue,
      cumulativeExpenses,
    };
  });
}

export function buildCashFlowStatements(
  txs: ClassifiedTransaction[],
): CashFlowStatement[] {
  const periods = groupByPeriod(txs);
  const sortedKeys = Array.from(periods.keys()).sort();

  return sortedKeys.map((period) => {
    const periodTxs = periods.get(period)!;

    // Operating: revenue + cogs + opex
    const operating = periodTxs
      .filter((t) =>
        t.classification === "revenue" ||
        t.classification === "cogs" ||
        t.classification === "operating_expense",
      )
      .reduce((sum, t) => {
        if (t.classification === "revenue") return sum + Math.abs(t.amount);
        return sum - Math.abs(t.amount);
      }, 0);

    // Investing: non-operating income/expense (simplified)
    const investing = periodTxs
      .filter((t) =>
        t.classification === "non_operating_income" ||
        t.classification === "non_operating_expense",
      )
      .reduce((sum, t) => {
        if (t.classification === "non_operating_income") return sum + Math.abs(t.amount);
        return sum - Math.abs(t.amount);
      }, 0);

    // Financing: transfers
    const financing = periodTxs
      .filter((t) => t.classification === "transfer")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      period,
      operating,
      investing,
      financing,
      netCashFlow: operating + investing + financing,
    };
  });
}
