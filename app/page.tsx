import { createClient } from "@/lib/supabase/server";
import MargoMount from "./margo/MargoMount";
import Landing from "./landing/Landing";
import Ended from "./landing/Ended";
import { withTimeout } from "@/lib/timeout";
import { ACTIVE, foundingLeft } from "@/lib/billing";
import { getFeatured, isOwner } from "@/lib/featured";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Signed out: the landing page. Signed in: the app (or a "your subscription ended" screen).
export default async function Home({ searchParams }: { searchParams: { checkout?: string } }) {
  const hasSession = cookies().getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSession) return <Landing foundingLeft={await foundingLeft()} notice={searchParams.checkout} />;
  const supabase = createClient();
  const res = await withTimeout(supabase.auth.getUser(), 6000);
  if (res === "timeout") redirect("/login?down=1");
  const user = res.data.user;
  if (!user) return <Landing foundingLeft={await foundingLeft()} notice={searchParams.checkout} />;
  const billing = (user.app_metadata as any)?.billing;
  // People invited by hand (beta testers) have no billing record and always get in.
  if (billing && !ACTIVE.has(billing.status)) return <Ended email={user.email ?? ""} foundingLeft={await foundingLeft()} notice={searchParams.checkout} />;
  return <MargoMount email={user.email ?? ""} billing={!!billing?.customer} featured={await getFeatured()} owner={isOwner(user.email)} />;
}
