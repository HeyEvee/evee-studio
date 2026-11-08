import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MargoMount from "./margo/MargoMount";
import { withTimeout } from "@/lib/timeout";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();
  const res = await withTimeout(supabase.auth.getUser(), 6000);
  if (res === "timeout") redirect("/login?down=1");
  const user = res.data.user;
  if (!user) redirect("/login");
  return <MargoMount email={user.email ?? ""} />;
}
