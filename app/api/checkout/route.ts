import { NextResponse } from "next/server";
import { PLANS, TRIAL_DAYS, foundingLeft, priceFor, stripe, type PlanId } from "@/lib/billing";

export const runtime = "nodejs";

// The pricing buttons post here. Sends the visitor to Stripe Checkout with a 7-day free trial.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const back = (why: string) => NextResponse.redirect(`${origin}/?checkout=${why}#pricing`, { status: 303 });
  const s = stripe();
  if (!s) return back("unavailable");
  const form = await req.formData().catch(() => null);
  const plan = String(form?.get("plan") || "") as PlanId;
  if (!PLANS[plan]) return back("unavailable");
  if (plan === "founding" && (await foundingLeft()) === 0) return back("founding-full");
  const email = String(form?.get("email") || "").trim();
  try {
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: await priceFor(plan), quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_DAYS, metadata: { app: "evee-studio", plan } },
      allow_promotion_codes: true,
      custom_text: { submit: { message: `Free for 7 days. Cancel anytime before then and you won’t be charged. After that, payments are non-refundable, but you can cancel anytime. Terms: ${origin}/terms` } },
      ...(email.includes("@") ? { customer_email: email } : {}),
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      metadata: { app: "evee-studio", plan },
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (e) {
    console.error("checkout error", e);
    return back("error");
  }
}
