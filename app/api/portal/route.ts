import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/billing";

export const runtime = "nodejs";

// "Manage subscription": opens Stripe's billing page (change plan, update card, cancel).
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const { data: { user } } = await createClient().auth.getUser();
  const customer = (user?.app_metadata as any)?.billing?.customer;
  const s = stripe();
  if (!user || !customer || !s) return NextResponse.redirect(`${origin}/`, { status: 303 });
  try {
    const portal = await s.billingPortal.sessions.create({ customer, return_url: `${origin}/` });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (e) {
    console.error("portal error", e);
    return NextResponse.redirect(`${origin}/?billing=unavailable`, { status: 303 });
  }
}
