import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type AuthOutcome,
  type ApiKeyRecord,
  AUTH_CACHE_TTL_MS,
  AUTH_CACHE_MAX_SIZE,
} from "./types/index.js";

// ── LRU Cache ───────────────────────────────────────────────

interface CacheEntry {
  result: AuthOutcome;
  expiresAt: number;
}

class AuthCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = AUTH_CACHE_MAX_SIZE, ttlMs = AUTH_CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(keyHash: string): AuthOutcome | null {
    const entry = this.cache.get(keyHash);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(keyHash);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(keyHash);
    this.cache.set(keyHash, entry);
    return entry.result;
  }

  set(keyHash: string, result: AuthOutcome): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(keyHash, {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

// ── Auth Module ─────────────────────────────────────────────

let supabase: SupabaseClient | null = null;
const cache = new AuthCache();

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

function hashKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function validateApiKey(apiKey: string): Promise<AuthOutcome> {
  if (!apiKey) {
    return { valid: false, reason: "API key is required. Get one at crunchy.tools" };
  }

  const keyHash = hashKey(apiKey);

  // Check cache first
  const cached = cache.get(keyHash);
  if (cached) return cached;

  // Query Supabase
  const db = getSupabase();
  const { data, error } = await db
    .from("api_keys")
    .select("id, tier, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    const result: AuthOutcome = {
      valid: false,
      reason: "Invalid API key. Get one at crunchy.tools",
    };
    cache.set(keyHash, result);
    return result;
  }

  const record = data as Pick<ApiKeyRecord, "id" | "tier" | "revoked_at">;
  const result: AuthOutcome = { valid: true, keyId: record.id, tier: record.tier };
  cache.set(keyHash, result);

  // Fire-and-forget: update last_used_at
  void db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id);

  return result;
}
