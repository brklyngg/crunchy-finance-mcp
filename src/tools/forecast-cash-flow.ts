import type { ToolDefinition } from "../types/index.js";

const SYSTEM_PROMPT = `You are a financial analyst specializing in cash flow forecasting.
Build or analyze a cash flow forecast with the provided data.

Use a waterfall structure: Beginning Cash → Inflows → Outflows → Net Change → Ending Cash.
Highlight danger zones (< 2 months runway).

Return your analysis as JSON with this structure:
{
  "summary": "Brief overall cash position assessment",
  "beginning_cash": number,
  "forecast_periods": [
    {
      "period": "Week/Month label",
      "beginning_cash": number,
      "inflows": {
        "total": number,
        "breakdown": [{ "category": "string", "amount": number }]
      },
      "outflows": {
        "total": number,
        "breakdown": [{ "category": "string", "amount": number }]
      },
      "net_change": number,
      "ending_cash": number,
      "runway_months": number,
      "danger_zone": boolean
    }
  ],
  "total_runway_months": number,
  "burn_rate_monthly": number,
  "key_risks": ["Risk factors"],
  "recommendations": ["Actionable next steps"]
}

Return ONLY valid JSON. No markdown, no commentary outside the JSON.`;

export const forecastCashFlow: ToolDefinition = {
  name: "forecast_cash_flow",
  description:
    "Project cash position forward with weekly or monthly granularity. Calculates burn rate, runway, and flags danger zones (<2 months runway).",
  inputSchema: {
    type: "object" as const,
    properties: {
      financial_data: {
        type: "string",
        description:
          "Current cash position and historical cash flow data as CSV, JSON, or plain text.",
      },
      granularity: {
        type: "string",
        enum: ["weekly", "monthly"],
        description: 'Forecast granularity. Defaults to "monthly".',
      },
      periods: {
        type: "number",
        description: "Number of periods to forecast forward. Defaults to 13 (weeks) or 6 (months).",
      },
      assumptions: {
        type: "string",
        description:
          "Growth/decline assumptions, expected changes (e.g. new hires, contract renewals).",
      },
    },
    required: ["financial_data"],
  },
  handler: async (args, ctx) => {
    const data = args.financial_data as string;
    const granularity = (args.granularity as string) ?? "monthly";
    const periods = args.periods as number | undefined;
    const assumptions = args.assumptions as string | undefined;

    let userMessage = `Build a ${granularity} cash flow forecast from this data`;
    if (periods) {
      userMessage += ` for ${periods} ${granularity === "weekly" ? "weeks" : "months"}`;
    }
    userMessage += `.\n\n${data}`;
    if (assumptions) {
      userMessage += `\n\nAssumptions:\n${assumptions}`;
    }

    const result = await ctx.callSkill({
      toolName: "forecast_cash_flow",
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
