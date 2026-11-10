import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { emailForCustomer, provision, saveStatus, stripe } from "@/lib/billing";

export const runtime = "nodejs";

// Stripe → Evee Studio. Creates the account when someone subscribes and keeps their access in sync.
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      // Same Stripe account as Hey Evee: only act on Evee Studio checkouts.
      if (cs.metadata?.app !== "evee-studio") return NextResponse.json({ ok: true, skipped: "other product" });
      if (cs.mode === "subscription" && cs.subscription) {
        const sub = await s.subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id);
        const email = cs.customer_details?.email || cs.customer_email || (await emailForCustomer(sub.customer));
        if (email) await provision(email, sub);
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.metadata?.app !== "evee-studio") return NextResponse.json({ ok: true, skipped: "other product" });
      if (sub.metadata?.supabase_user_id) await saveStatus(sub.metadata.supabase_user_id, sub);
      else {
        const email = await emailForCustomer(sub.customer);
        if (email) await provision(email, sub);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("stripe webhook error", event.type, e);
    return NextResponse.json({ error: "failed" }, { status: 500 }); // Stripe retries
  }
}
