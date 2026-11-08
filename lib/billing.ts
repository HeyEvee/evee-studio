import "server-only";
import Stripe from "stripe";
import { createClient as createAdmin } from "@supabase/supabase-js";

// Plans. Prices are created in Stripe automatically the first time they're needed (found again by lookup key).
export const PLANS = {
  founding: { lookup: "evee_studio_founding_monthly", amount: 700, interval: "month" as const, label: "Founding member" },
  monthly: { lookup: "evee_studio_monthly", amount: 1200, interval: "month" as const, label: "Monthly" },
  yearly: { lookup: "evee_studio_yearly", amount: 9900, interval: "year" as const, label: "Yearly" },
};
export type PlanId = keyof typeof PLANS;
export const FOUNDING_LIMIT = 50;
export const TRIAL_DAYS = 7;
// Statuses that keep the app open. past_due gives people time to fix a failed card.
export const ACTIVE = new Set(["trialing", "active", "past_due"]);

let _stripe: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 8000 });
  return _stripe;
}

export function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function product(s: Stripe) {
  const found = await s.products.search({ query: "metadata['app']:'evee-studio'" }).catch(() => null);
  if (found?.data[0]) return found.data[0].id;
  const p = await s.products.create({ name: "Evee Studio", description: "Your TikTok Shop success planner. By Hey Evee.", metadata: { app: "evee-studio" } });
  return p.id;
}

export async function priceFor(plan: PlanId) {
  const s = stripe()!;
  const P = PLANS[plan];
  const list = await s.prices.list({ lookup_keys: [P.lookup], active: true, limit: 1 });
  if (list.data[0]) return list.data[0].id;
  const price = await s.prices.create({
    product: await product(s),
    currency: "usd",
    unit_amount: P.amount,
    recurring: { interval: P.interval },
    lookup_key: P.lookup,
    nickname: `Evee Studio ${P.label}`,
    metadata: { app: "evee-studio", plan },
  });
  return price.id;
}

// Real count of founding spots left (cached for 5 minutes). null when Stripe isn't set up yet.
let foundingCache: { at: number; left: number } | null = null;
export async function foundingLeft(): Promise<number | null> {
  const s = stripe();
  if (!s) return null;
  if (foundingCache && Date.now() - foundingCache.at < 5 * 60_000) return foundingCache.left;
  try {
    const list = await s.prices.list({ lookup_keys: [PLANS.founding.lookup], limit: 1 });
    let taken = 0;
    if (list.data[0]) {
      for await (const sub of s.subscriptions.list({ price: list.data[0].id, status: "all", limit: 100 })) {
        if (!["canceled", "incomplete_expired"].includes(sub.status)) taken++;
      }
    }
    foundingCache = { at: Date.now(), left: Math.max(0, FOUNDING_LIMIT - taken) };
    return foundingCache.left;
  } catch (e) {
    console.error("founding count failed", e);
    foundingCache = null;
    return null;
  }
}

const planOf = (sub: Stripe.Subscription): PlanId | null => {
  const lk = sub.items.data[0]?.price?.lookup_key;
  return (Object.keys(PLANS) as PlanId[]).find((k) => PLANS[k].lookup === lk) || null;
};

// Makes sure the buyer has an Evee Studio account and records their subscription on it. Safe to run twice.
export async function provision(email: string, sub: Stripe.Subscription) {
  const db = admin();
  const s = stripe();
  if (!db || !s) throw new Error("billing not configured");
  email = email.trim().toLowerCase();
  let userId = sub.metadata?.supabase_user_id || "";
  if (!userId) {
    const made = await db.auth.admin.createUser({ email, email_confirm: true });
    if (made.data.user) userId = made.data.user.id;
    else {
      // Already has an account: look it up without sending any email.
      const link = await db.auth.admin.generateLink({ type: "magiclink", email });
      if (!link.data.user) throw new Error(`couldn't find or create user: ${made.error?.message || link.error?.message}`);
      userId = link.data.user.id;
    }
    await s.subscriptions.update(sub.id, { metadata: { ...sub.metadata, supabase_user_id: userId, app: "evee-studio" } });
  }
  await saveStatus(userId, sub);
  return userId;
}

export async function saveStatus(userId: string, sub: Stripe.Subscription) {
  const db = admin()!;
  const cur = await db.auth.admin.getUserById(userId);
  const meta = cur.data.user?.app_metadata || {};
  await db.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      billing: {
        status: sub.status,
        plan: planOf(sub),
        customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        subscription: sub.id,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export async function emailForCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  if (typeof customer !== "string") return "email" in customer ? customer.email || "" : "";
  const c = await stripe()!.customers.retrieve(customer);
  return "email" in c ? c.email || "" : "";
}
