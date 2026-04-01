import type { Transaction, ClassifiedTransaction, TransactionType } from "../types/index.js";

interface ClassificationRule {
  type: TransactionType;
  patterns: RegExp[];
  confidence: "high" | "medium";
}

const RULES: ClassificationRule[] = [
  // Revenue patterns (order matters — more specific first)
  {
    type: "revenue",
    patterns: [
      /subscription\s+revenue/i,
      /sales\s+revenue/i,
      /service\s+revenue/i,
      /consulting\s+revenue/i,
      /license\s+revenue/i,
      /^revenue$/i,
      /recurring\s+revenue/i,
      /product\s+sales/i,
      /invoice\s+payment/i,
      /client\s+payment/i,
    ],
    confidence: "high",
  },
  // COGS patterns
  {
    type: "cogs",
    patterns: [
      /cost\s+of\s+(goods|revenue|sales)/i,
      /cogs/i,
      /hosting\s+cost/i,
      /server\s+cost/i,
      /infrastructure\s+cost/i,
      /cloud\s+(compute|storage|hosting)/i,
      /aws|gcp|azure/i,
      /direct\s+(cost|material|labor)/i,
    ],
    confidence: "high",
  },
  // Operating expense patterns
  {
    type: "operating_expense",
    patterns: [
      /salary|payroll|wages|compensation/i,
      /rent|lease|office/i,
      /marketing|advertising|ads\b/i,
      /software|subscription/i,
      /insurance/i,
      /utilities/i,
      /travel|meals|entertainment/i,
      /professional\s+(services|fees)/i,
      /legal|accounting|audit/i,
      /depreciation|amortization/i,
      /equipment|supplies/i,
      /training|education/i,
      /recruiting|hiring/i,
      /contractor|freelance/i,
    ],
    confidence: "high",
  },
  // Non-operating income
  {
    type: "non_operating_income",
    patterns: [
      /interest\s+income/i,
      /dividend\s+income/i,
      /gain\s+on\s+(sale|disposal)/i,
      /investment\s+(income|return|gain)/i,
      /foreign\s+exchange\s+gain/i,
      /refund/i,
    ],
    confidence: "high",
  },
  // Non-operating expense
  {
    type: "non_operating_expense",
    patterns: [
      /interest\s+expense/i,
      /loan\s+payment/i,
      /loss\s+on\s+(sale|disposal)/i,
      /write[\s-]?off/i,
      /foreign\s+exchange\s+loss/i,
      /tax\s+(expense|payment)/i,
      /penalty|fine/i,
    ],
    confidence: "high",
  },
  // Transfers
  {
    type: "transfer",
    patterns: [
      /transfer/i,
      /internal\s+move/i,
      /owner.?\s*(draw|distribution|contribution|equity)/i,
      /capital\s+(injection|contribution)/i,
      /intercompany/i,
    ],
    confidence: "high",
  },
];

function classifyOne(tx: Transaction): ClassifiedTransaction {
  const desc = tx.description;

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(desc)) {
        return { ...tx, classification: rule.type, confidence: rule.confidence };
      }
    }
  }

  // Fallback heuristic: positive amounts with no match → revenue, negative → opex
  if (tx.amount > 0) {
    return { ...tx, classification: "revenue", confidence: "low" };
  }
  return { ...tx, classification: "operating_expense", confidence: "low" };
}

export function classify(transactions: Transaction[]): ClassifiedTransaction[] {
  return transactions.map(classifyOne);
}
