import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { api_key_id } = req.body as { api_key_id?: string };
  if (!api_key_id || !UUID_RE.test(api_key_id)) {
    res.status(400).json({ error: "Valid api_key_id required" });
    return;
  }

  // Verify key exists, is active, and not already pro
  const { data: key, error } = await supabase
    .from("api_keys")
    .select("id, tier, revoked_at")
    .eq("id", api_key_id)
    .is("revoked_at", null)
    .single();

  if (error || !key) {
    res.status(404).json({ error: "API key not found or revoked" });
    return;
  }

  if (key.tier === "pro") {
    res.status(400).json({ error: "Already on Pro tier" });
    return;
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    res.status(500).json({ error: "Stripe price not configured" });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { api_key_id },
    success_url: "https://crunchy.tools/billing/success",
    cancel_url: "https://crunchy.tools/billing/cancel",
  });

  res.status(200).json({ url: session.url });
}
