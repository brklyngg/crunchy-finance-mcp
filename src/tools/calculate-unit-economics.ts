import type { ToolDefinition } from "../types/index.js";

const SYSTEM_PROMPT = `You are a financial analyst specializing in SaaS and startup unit economics.
Calculate unit economics from the provided data.

Clearly separate blended vs channel-specific metrics. Flag if LTV:CAC < 3:1.

Return your analysis as JSON with this structure:
{
  "summary": "Brief assessment of unit economics health",
  "metrics": {
    "cac": { "value": number, "breakdown_by_channel": [{ "channel": "string", "cac": number }] },
    "ltv": { "value": number, "method": "Description of calculation method" },
    "ltv_cac_ratio": number,
    "ltv_cac_healthy": boolean,
    "payback_period_months": number,
    "gross_margin_per_unit": { "value": number, "pct": number },
    "arpu_monthly": number
  },
  "flags": ["Warning flags (e.g. LTV:CAC < 3:1, payback > 18mo)"],
  "benchmarks": {
    "ltv_cac_benchmark": "3:1+ is healthy for SaaS",
    "payback_benchmark": "< 12 months is ideal"
  },
  "recommendations": ["Actionable next steps to improve unit economics"]
}

Return ONLY valid JSON. No markdown, no commentary outside the JSON.`;

export const calculateUnitEconomics: ToolDefinition = {
  name: "calculate_unit_economics",
  description:
    "Calculate CAC, LTV, LTV:CAC ratio, payback period, and gross margin per unit. Flags unhealthy ratios and provides channel-level breakdown.",
  inputSchema: {
    type: "object" as const,
    properties: {
      financial_data: {
        type: "string",
        description:
          "Customer acquisition costs, revenue data, churn rates, and margins as CSV, JSON, or plain text.",
      },
      channels: {
        type: "string",
        description:
          'Comma-separated acquisition channels to break down (e.g. "Organic, Paid, Referral").',
      },
      period: {
        type: "string",
        description:
          'Analysis period (e.g. "Q1 2026", "Last 12 months"). Defaults to "Current Period".',
      },
      business_model: {
        type: "string",
        enum: ["saas", "marketplace", "ecommerce", "other"],
        description: 'Business model for appropriate benchmarks. Defaults to "saas".',
      },
    },
    required: ["financial_data"],
  },
  handler: async (args, ctx) => {
    const data = args.financial_data as string;
    const channels = args.channels as string | undefined;
    const period = (args.period as string) ?? "Current Period";
    const model = (args.business_model as string) ?? "saas";

    let userMessage = `Calculate unit economics for this ${model} business (${period}).\n\n${data}`;
    if (channels) {
      userMessage += `\n\nBreak down by channels: ${channels}`;
    }

    const result = await ctx.callSkill({
      toolName: "calculate_unit_economics",
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
