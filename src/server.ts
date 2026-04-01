import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateApiKey } from "./auth.js";
import { checkQuota, logUsageEvent } from "./metering.js";
import { callSkill } from "./engine/skill-engine.js";
import { formatToolResponse } from "./engine/output-formatter.js";
import type { ToolDefinition, ToolContext, SkillRequest } from "./types/index.js";
import { MAX_INPUT_BYTES } from "./types/index.js";

// ── Tool Registry ───────────────────────────────────────────

const tools: Map<string, ToolDefinition> = new Map();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

// ── Server Factory ──────────────────────────────────────────

export function createMcpServer(apiKey: string): Server {
  const server = new Server(
    { name: "crunchy-finance-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // List all registered tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Array.from(tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // Handle tool calls with auth + metering middleware
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    // ── Input size check ──
    const inputSize = Buffer.byteLength(JSON.stringify(args), "utf-8");
    if (inputSize > MAX_INPUT_BYTES) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Input too large (${Math.round(inputSize / 1024)}KB). Maximum is ${MAX_INPUT_BYTES / 1024}KB.`,
          },
        ],
        isError: true,
      };
    }

    // ── Auth ──
    const auth = await validateApiKey(apiKey);
    if (!auth.valid) {
      return {
        content: [{ type: "text" as const, text: auth.reason }],
        isError: true,
      };
    }

    // ── Quota check ──
    const quota = await checkQuota(auth.keyId, auth.tier);
    if (!quota.allowed) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Free tier limit reached (${quota.currentUsage}/${quota.limit} calls this month). Upgrade at https://crunchy.tools/pricing`,
          },
        ],
        isError: true,
      };
    }

    // ── Tool lookup ──
    const tool = tools.get(toolName);
    if (!tool) {
      return {
        content: [
          { type: "text" as const, text: `Unknown tool: ${toolName}` },
        ],
        isError: true,
      };
    }

    // ── Execute tool ──
    const ctx: ToolContext = {
      keyId: auth.keyId,
      tier: auth.tier,
      callSkill: (req: SkillRequest) => callSkill(req),
    };

    try {
      const result = await tool.handler(args, ctx);
      const formatted = formatToolResponse(result.content);

      // Log usage (fire-and-forget)
      logUsageEvent({
        api_key_id: auth.keyId,
        tool_name: toolName,
        model_used: result.model,
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        duration_ms: result.durationMs,
        error: false,
      }).catch(() => {});

      return {
        content: [{ type: "text" as const, text: formatted }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";

      // Log error usage (fire-and-forget)
      logUsageEvent({
        api_key_id: auth.keyId,
        tool_name: toolName,
        model_used: "unknown",
        tokens_in: null,
        tokens_out: null,
        duration_ms: null,
        error: true,
      }).catch(() => {});

      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${message}. If this persists, contact support@crunchy.tools`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
