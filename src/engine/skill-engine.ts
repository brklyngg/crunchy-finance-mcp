import Anthropic from "@anthropic-ai/sdk";
import type { SkillRequest, SkillResult, Tier } from "../types/index.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY must be set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function selectModel(tier: Tier): string {
  return tier === "pro" ? "claude-opus-4-6" : "claude-sonnet-4-6";
}

export async function callSkill(request: SkillRequest): Promise<SkillResult> {
  const anthropic = getClient();
  const model = selectModel(request.tier);
  const start = Date.now();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userMessage }],
      });

      const durationMs = Date.now() - start;
      const textBlock = response.content.find((b) => b.type === "text");
      const content = textBlock ? textBlock.text : "";

      return {
        content,
        model,
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
        durationMs,
      };
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        // Backoff before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError;
}
