import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Billing isn't live yet." }, { status: 503 });
  }

  const { interval } = await req.json().catch(() => ({ interval: "monthly" }));
  const priceId = interval === "annual" ? STRIPE_PRICE_IDS.annual : STRIPE_PRICE_IDS.monthly;
  if (!priceId) {
    return NextResponse.json({ error: "Pricing isn't configured yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    success_url: `${origin}/pricing?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
