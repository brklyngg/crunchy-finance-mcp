import type { ToolDefinition, Transaction, FinancialStatementResult } from "../types/index.js";
import { classify } from "../lib/transaction-classifier.js";
import {
  buildIncomeStatements,
  buildBalanceSheetSnapshots,
  buildCashFlowStatements,
} from "../lib/financial-statement.js";
import {
  buildPeriodMetrics,
  buildTrends,
  buildCategoryBreakdown,
} from "../lib/financial-metrics.js";

const INSIGHTS_SYSTEM_PROMPT = `You are a financial analyst. Given structured financial statements, provide 3-5 concise actionable insights. Focus on:
- Margin trends and health
- Expense concentration risks
- Revenue sustainability
- Cash flow concerns

Return JSON: { "insights": ["insight 1", "insight 2", ...] }
Return ONLY valid JSON.`;

function stripBom(str: string): string {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

function parseCSV(csv: string): Transaction[] {
  const lines = stripBom(csv).trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(",").map((c) => c.trim());

  const dateIdx = cols.findIndex((c) => c === "date");
  const descIdx = cols.findIndex((c) =>
    c === "description" || c === "desc" || c === "memo" || c === "name",
  );
  const amountIdx = cols.findIndex((c) =>
    c === "amount" || c === "value" || c === "total",
  );
  const categoryIdx = cols.findIndex((c) =>
    c === "category" || c === "type" || c === "class",
  );

  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    throw new Error(
      "CSV must have columns: date, description (or desc/memo/name), amount (or value/total)",
    );
  }

  const transactions: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const amount = parseFloat(fields[amountIdx]);
    if (isNaN(amount)) continue;

    transactions.push({
      date: fields[dateIdx],
      description: fields[descIdx],
      amount,
      category: categoryIdx >= 0 ? fields[categoryIdx] : undefined,
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseTransactions(input: string): Transaction[] {
  const trimmed = input.trim();

  // Try JSON first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("Input looks like JSON but is malformed. Provide valid JSON array or CSV.");
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((item: Record<string, unknown>) => ({
      date: String(item.date ?? ""),
      description: String(item.description ?? item.desc ?? item.memo ?? item.name ?? ""),
      amount: Number(item.amount ?? item.value ?? item.total ?? 0),
      category: item.category ? String(item.category) : undefined,
    }));
  }

  // Otherwise CSV
  return parseCSV(trimmed);
}

function buildStatements(transactions: Transaction[]): FinancialStatementResult {
  const classified = classify(transactions);
  const incomeStatements = buildIncomeStatements(classified);
  const balanceSheetSnapshots = buildBalanceSheetSnapshots(incomeStatements);
  const cashFlowStatements = buildCashFlowStatements(classified);
  const periodMetrics = buildPeriodMetrics(incomeStatements);
  const trends = buildTrends(periodMetrics);
  const topExpenseCategories = buildCategoryBreakdown(incomeStatements, "expense");
  const topRevenueCategories = buildCategoryBreakdown(incomeStatements, "revenue");

  return {
    incomeStatements,
    balanceSheetSnapshots,
    cashFlowStatements,
    periodMetrics,
    trends,
    topExpenseCategories,
    topRevenueCategories,
  };
}

export const buildFinancialStatement: ToolDefinition = {
  name: "build_financial_statement",
  description:
    "Build structured financial statements (income statement, balance sheet, cash flow, trends) from transaction data. Accepts CSV or JSON transactions. Optionally generates AI-powered insights.",
  inputSchema: {
    type: "object" as const,
    properties: {
      transactions: {
        type: "string",
        description:
          "Transaction data as CSV (with date, description, amount columns) or JSON array of {date, description, amount, category?} objects.",
      },
      include_insights: {
        type: "boolean",
        description:
          "Whether to generate AI-powered narrative insights. Defaults to false. Uses one API credit when enabled.",
      },
    },
    required: ["transactions"],
  },
  handler: async (args, ctx) => {
    const rawInput = args.transactions as string;
    const includeInsights = (args.include_insights as boolean) ?? false;

    const transactions = parseTransactions(rawInput);

    if (transactions.length === 0) {
      return {
        content: JSON.stringify({
          incomeStatements: [],
          balanceSheetSnapshots: [],
          cashFlowStatements: [],
          periodMetrics: [],
          trends: [],
          topExpenseCategories: [],
          topRevenueCategories: [],
          insights: [],
        }),
        model: "local",
        tokensIn: 0,
        tokensOut: 0,
        durationMs: 0,
      };
    }

    const start = Date.now();
    const result = buildStatements(transactions);

    let insights: string[] = [];
    let model = "local";
    let tokensIn = 0;
    let tokensOut = 0;

    if (includeInsights) {
      const skillResult = await ctx.callSkill({
        toolName: "build_financial_statement",
        systemPrompt: INSIGHTS_SYSTEM_PROMPT,
        userMessage: JSON.stringify(result, null, 2),
        tier: ctx.tier,
      });

      model = skillResult.model;
      tokensIn = skillResult.tokensIn;
      tokensOut = skillResult.tokensOut;

      try {
        const parsed = JSON.parse(skillResult.content);
        insights = Array.isArray(parsed.insights) ? parsed.insights : [];
      } catch {
        insights = [skillResult.content];
      }
    }

    const durationMs = Date.now() - start;

    return {
      content: JSON.stringify({ ...result, insights }),
      model,
      tokensIn,
      tokensOut,
      durationMs,
    };
  },
};
