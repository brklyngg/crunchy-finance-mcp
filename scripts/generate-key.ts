#!/usr/bin/env tsx

/**
 * Generate a test API key and insert into Supabase.
 *
 * Usage: npx tsx scripts/generate-key.ts <email> [tier]
 * Example: npx tsx scripts/generate-key.ts test@example.com free
 */

import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { KEY_PREFIX, KEY_RANDOM_LENGTH } from "../src/types/index.js";

async function main(): Promise<void> {
  const email = process.argv[2];
  const tier = process.argv[3] ?? "free";

  if (!email) {
    console.error("Usage: npx tsx scripts/generate-key.ts <email> [tier]");
    process.exit(1);
  }

  if (tier !== "free" && tier !== "pro") {
    console.error('Tier must be "free" or "pro"');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars");
    process.exit(1);
  }

  // Generate key: crunch_live_<32 random hex chars>
  const random = randomBytes(KEY_RANDOM_LENGTH / 2).toString("hex");
  const fullKey = `${KEY_PREFIX}${random}`;
  const keyHash = createHash("sha256").update(fullKey).digest("hex");

  const supabase = createClient(url, key);
  const { error } = await supabase.from("api_keys").insert({
    user_email: email,
    key_hash: keyHash,
    key_prefix: fullKey.slice(0, 12),
    tier,
  });

  if (error) {
    console.error("Failed to insert key:", error.message);
    process.exit(1);
  }

  console.log("API key generated successfully.");
  console.log(`Key: ${fullKey}`);
  console.log(`Tier: ${tier}`);
  console.log(`Email: ${email}`);
  console.log("\nSave this key — it cannot be retrieved again.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
