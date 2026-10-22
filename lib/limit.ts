import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MargoError } from "./claude";

// Each tester gets AI_DAILY_LIMIT requests per rolling 24 hours. Every AI call is logged first.
export async function spendAllowance(supabase: SupabaseClient, action: string) {
  const limit = Number(process.env.AI_DAILY_LIMIT) || 60;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from("ai_calls").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= limit) throw new MargoError("rate_limited", `You’ve used Evee ${limit} times in the last 24 hours, the beta limit. Try again tomorrow.`, 429);
  const logged = await supabase.from("ai_calls").insert({ action });
  if (logged.error) throw new MargoError("upstream_error", "Evee couldn’t log that request. Try again.", 500);
}
