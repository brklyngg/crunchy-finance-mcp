import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type Tier,
  type UsageEvent,
  type QuotaCheck,
  FREE_TIER_MONTHLY_LIMIT,
} from "./types/index.js";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function checkQuota(keyId: string, tier: Tier): Promise<QuotaCheck> {
  // Pro users have unlimited calls
  if (tier === "pro") {
    return { allowed: true, currentUsage: 0, limit: null };
  }

  const db = getSupabase();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyId)
    .gte("created_at", monthStart.toISOString());

  if (error) {
    // Fail closed: if we can't check quota, deny the request
    return { allowed: false, currentUsage: 0, limit: FREE_TIER_MONTHLY_LIMIT };
  }

  const currentUsage = count ?? 0;
  return {
    allowed: currentUsage < FREE_TIER_MONTHLY_LIMIT,
    currentUsage,
    limit: FREE_TIER_MONTHLY_LIMIT,
  };
}

export async function logUsageEvent(event: UsageEvent): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("usage_events").insert(event);
  if (error) {
    // Log but don't fail the request — usage logging is observability, not critical path
    console.error("[metering] Failed to log usage event:", error.message);
  }
}
