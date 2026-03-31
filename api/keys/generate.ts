import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { KEY_PREFIX, KEY_RANDOM_LENGTH } from "../../src/types/index.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email } = req.body as { email?: string };
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const random = randomBytes(KEY_RANDOM_LENGTH / 2).toString("hex");
  const fullKey = `${KEY_PREFIX}${random}`;
  const keyHash = createHash("sha256").update(fullKey).digest("hex");
  const keyPrefix = fullKey.slice(0, 16);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_email: email,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      tier: "free",
    })
    .select("id")
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to create API key" });
    return;
  }

  res.status(201).json({
    key: fullKey,
    key_id: data.id,
    tier: "free",
    message: "Save this key — it cannot be retrieved again.",
  });
}
