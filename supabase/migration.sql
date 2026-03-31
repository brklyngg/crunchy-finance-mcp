-- Crunchy Finance MCP — Phase 1 Schema
-- Run via Supabase Management API

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe
  ON api_keys (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Usage Events table
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  tool_name TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  duration_ms INT,
  error BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_monthly
  ON usage_events (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tool
  ON usage_events (tool_name, created_at DESC);

-- Monthly usage count view (for metering queries)
CREATE OR REPLACE VIEW monthly_usage AS
SELECT
  api_key_id,
  date_trunc('month', created_at) AS month,
  COUNT(*) AS call_count,
  COUNT(*) FILTER (WHERE error = false) AS success_count,
  SUM(tokens_in) AS total_tokens_in,
  SUM(tokens_out) AS total_tokens_out,
  AVG(duration_ms) AS avg_duration_ms
FROM usage_events
GROUP BY api_key_id, date_trunc('month', created_at);

-- Observability: daily stats view
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  date_trunc('day', created_at) AS day,
  tool_name,
  COUNT(*) AS calls,
  COUNT(*) FILTER (WHERE error = false) AS successes,
  COUNT(*) FILTER (WHERE error = true) AS errors,
  AVG(duration_ms) AS avg_duration_ms,
  COUNT(DISTINCT api_key_id) AS unique_users
FROM usage_events
GROUP BY date_trunc('day', created_at), tool_name;

-- RLS: service_role only (no RLS policies = service_role key access only)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
