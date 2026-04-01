import type { ToolDefinition } from "../types/index.js";

const SYSTEM_PROMPT = `You are a financial analyst specializing in investor-ready SaaS metrics.
Calculate key metrics that investors and board members care about.

Return your analysis as JSON with this structure:
{
  "summary": "Brief investor-ready assessment",
  "period": "Analysis period",
  "revenue_metrics": {
    "mrr": number,
    "arr": number,
    "mrr_growth_rate_pct": number,
    "arr_growth_rate_pct": number
  },
  "efficiency_metrics": {
    "burn_rate_monthly": number,
    "runway_months": number,
    "rule_of_40_score": number,
    "rule_of_40_pass": boolean,
    "magic_number": number
  },
  "retention_metrics": {
    "net_dollar_retention_pct": number,
    "gross_dollar_retention_pct": number,
    "logo_churn_rate_pct": number
  },
  "growth_metrics": {
    "revenue_growth_yoy_pct": number,
    "customer_growth_rate_pct": number,
    "expansion_revenue_pct": number
  },
  "flags": ["Warning flags for investor concern areas"],
  "benchmarks": {
    "rule_of_40": ">40 is top quartile SaaS",
    "ndr": ">120% is excellent, >100% is healthy",
    "magic_number": ">0.75 indicates efficient growth"
  },
  "recommendations": ["Actions to improve investor metrics"]
}

Return ONLY valid JSON. No markdown, no commentary outside the JSON.`;

export const analyzeInvestorMetrics: ToolDefinition = {
  name: "analyze_investor_metrics",
  description:
    "Calculate investor-ready metrics: MRR/ARR, growth rate, burn rate, runway, Rule of 40, magic number, and net dollar retention.",
  inputSchema: {
    type: "object" as const,
    properties: {
      financial_data: {
        type: "string",
        description:
          "Revenue, expense, and customer data as CSV, JSON, or plain text. Include MRR/ARR figures, churn data, and operating expenses.",
      },
      period: {
        type: "string",
        description:
          'Analysis period (e.g. "Q1 2026", "YTD 2026"). Defaults to "Current Period".',
      },
      stage: {
        type: "string",
        enum: ["pre-seed", "seed", "series-a", "series-b", "growth"],
        description: "Company stage for appropriate benchmark comparison.",
      },
      prior_period_data: {
        type: "string",
        description:
          "Previous period data for calculating growth rates and trends. Recommended for accurate YoY comparisons.",
      },
    },
    required: ["financial_data"],
  },
  handler: async (args, ctx) => {
    const data = args.financial_data as string;
    const period = (args.period as string) ?? "Current Period";
    const stage = args.stage as string | undefined;
    const priorData = args.prior_period_data as string | undefined;

    let userMessage = `Calculate investor-ready metrics for ${period}.\n\n${data}`;
    if (stage) {
      userMessage += `\n\nCompany stage: ${stage} — use appropriate benchmarks.`;
    }
    if (priorData) {
      userMessage += `\n\nPrior period data for comparison:\n${priorData}`;
    }

    const result = await ctx.callSkill({
      toolName: "analyze_investor_metrics",
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tier: ctx.tier,
    });

    return {
      content: result.content,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      durationMs: result.durationMs,
    };
  },
};
