# crunchy-finance-mcp

MCP server for AI-powered financial analysis. Connects Claude, Cursor, and other MCP-compatible AI tools to five finance-grade analysis tools — variance analysis, cash flow forecasting, unit economics, investor metrics, and financial statement generation.

Built by [Crunchy Tools](https://crunchy.tools).

## Quick Start

```bash
npx crunchy-finance-mcp <your-api-key>
```

Or set the environment variable:

```bash
export CRUNCHY_API_KEY=crunch_live_xxxxx
npx crunchy-finance-mcp
```

Get your API key at [crunchy.tools](https://crunchy.tools).

## Setup

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "crunchy-finance": {
      "command": "npx",
      "args": ["-y", "crunchy-finance-mcp"],
      "env": {
        "CRUNCHY_API_KEY": "crunch_live_xxxxx"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "crunchy-finance": {
      "command": "npx",
      "args": ["-y", "crunchy-finance-mcp"],
      "env": {
        "CRUNCHY_API_KEY": "crunch_live_xxxxx"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add crunchy-finance -- npx -y crunchy-finance-mcp
```

Set your API key in the environment or pass it as an argument.

## Tools

### `analyze_variance`

Compare budget vs actual financial data. Flags significant variances (>5% by default), explains likely drivers, and provides recommendations.

**Input:** Budget and actual figures as CSV, JSON, or plain text with line items.

### `forecast_cash_flow`

Project cash position forward with weekly or monthly granularity. Calculates burn rate, runway, and flags danger zones (<2 months runway).

**Input:** Current cash position and historical cash flow data.

### `calculate_unit_economics`

Calculate CAC, LTV, LTV:CAC ratio, payback period, and gross margin per unit. Flags unhealthy ratios and provides channel-level breakdown.

**Input:** Customer acquisition costs, revenue data, churn rates, and margins.

### `analyze_investor_metrics`

Calculate investor-ready metrics: MRR/ARR, growth rate, burn rate, runway, Rule of 40, magic number, and net dollar retention.

**Input:** Revenue, expense, and customer data. Supports stage-appropriate benchmarks (pre-seed through growth).

### `build_financial_statement`

Build structured financial statements (income statement, balance sheet, cash flow, trends) from raw transaction data. Accepts CSV or JSON transactions. Optionally generates AI-powered narrative insights.

**Input:** Transaction data as CSV (date, description, amount columns) or JSON array.

## Pricing

- **Free tier:** 15 calls/month
- **Pro tier:** Unlimited calls — [upgrade at crunchy.tools/pricing](https://crunchy.tools/pricing)

## Requirements

- Node.js >= 18

## License

MIT
