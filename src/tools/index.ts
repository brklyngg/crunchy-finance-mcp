import { registerTool } from "../server.js";
import { analyzeVariance } from "./analyze-variance.js";
import { forecastCashFlow } from "./forecast-cash-flow.js";
import { calculateUnitEconomics } from "./calculate-unit-economics.js";
import { analyzeInvestorMetrics } from "./analyze-investor-metrics.js";
import { buildFinancialStatement } from "./build-financial-statement.js";

export function registerAllTools(): void {
  registerTool(analyzeVariance);
  registerTool(forecastCashFlow);
  registerTool(calculateUnitEconomics);
  registerTool(analyzeInvestorMetrics);
  registerTool(buildFinancialStatement);
}
