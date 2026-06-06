import type { ToolDefinition } from "../types/index.js";

const SYSTEM_PROMPT = `You are a financial analyst specializing in variance analysis.
Analyze the provided financial data comparing actuals to budget/forecast.

For each significant variance (>5%), explain the likely driver.

Return your analysis as JSON with this structure:
{
  "summary": "Brief overall assessment",
  "period": "The period analyzed",
  "total_budget": number,
  "total_actual": number,
  "total_variance_pct": number,
  "line_items": [
    {
      "name": "Line item name",
      "budget": number,
      "actual": number,
      "variance_dollar": number,
      "variance_pct": number,
      "favorable": boolean,
      "explanation": "Driver of variance"
    }
  ],
  "key_drivers": ["Top 3 variance drivers"],
  "recommendations": ["Actionable next steps"]
}

Return ONLY valid JSON. No markdown, no commentary outside the JSON.`;

export const analyzeVariance: ToolDefinition = {
  name: "analyze_variance",
  description:
    "Compare budget vs actual financial data and explain significant variances (>5%) with likely drivers and recommendations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      financial_data: {
        type: "string",
        description:
          "Budget and actual figures as CSV, JSON, or plain text. Include line items with budget and actual amounts.",
      },
      period: {
        type: "string",
        description:
          'Time period for analysis (e.g. "Q1 2026", "March 2026"). Defaults to "Current Period".',
      },
      threshold_pct: {
        type: "number",
        description:
          "Minimum variance percentage to flag as significant. Defaults to 5.",
      },
      focus_areas: {
        type: "string",
        description:
          'Optional comma-separated categories to focus on (e.g. "COGS, Marketing, R&D").',
      },
    },
    required: ["financial_data"],
  },
  handler: async (args, ctx) => {
    const data = args.financial_data as string;
    const period = (args.period as string) ?? "Current Period";
    const threshold = (args.threshold_pct as number) ?? 5;
    const focus = args.focus_areas as string | undefined;

    let userMessage = `Analyze this financial data for ${period}.\nVariance threshold: ${threshold}%\n\n${data}`;
    if (focus) {
      userMessage += `\n\nFocus especially on: ${focus}`;
    }

    const result = await ctx.callSkill({
      toolName: "analyze_variance",
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
