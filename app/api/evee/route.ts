import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude, MargoError } from "@/lib/claude";
import { spendAllowance } from "@/lib/limit";
import { readSalesPrompt, tailorPrompt } from "@/lib/studio";
import { FW } from "@/lib/library";
import type { ImageIn } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 120;

const fail = (status: number, code: string, message: string) => NextResponse.json({ code, message }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthorized", "You’ve been signed out. Sign in again.");
  let body: any;
  try { body = await req.json(); } catch { return fail(400, "bad_request", "That request couldn’t be read."); }

  if (body?.action === "read") {
    try {
      const images: ImageIn[] = (Array.isArray(body.images) ? body.images : []).slice(0, 8).map((i: any) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(i?.media_type) || typeof i?.data !== "string" || i.data.length > 3_000_000)
          throw new MargoError("bad_image", "One of the screenshots couldn’t be read. Try a PNG or JPEG.", 400);
        return { media_type: i.media_type, data: i.data };
      });
      if (!images.length) return fail(400, "bad_request", "Add at least one screenshot.");
      const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
      const known = (Array.isArray(body.known) ? body.known : []).map((n: unknown) => str(n, 120)).filter(Boolean).slice(0, 60);
      await spendAllowance(supabase, "read");
      const out: any = await askClaude(readSalesPrompt(today, known), { images, json: true, maxTokens: 2500 });
      const n = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : null);
      const rows = (Array.isArray(out?.rows) ? out.rows : []).map((r: any) => ({ name: str(r?.name, 120), units: n(r?.units), revenue: n(r?.revenue), videos: n(r?.videos) })).filter((r: any) => r.name).slice(0, 40);
      if (!rows.length) throw new MargoError("nothing_found", "Evee couldn’t find any products in those screenshots. Try a clearer screenshot of your product sales.", 422);
      const date = typeof out?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.date) && out.date <= today ? out.date : null;
      return NextResponse.json({ result: { date, rows, note: typeof out?.note === "string" ? out.note.slice(0, 300) : null } });
    } catch (e: any) {
      if (e instanceof MargoError) return fail(e.status, e.code, e.message);
      console.error("evee read error", e);
      return fail(500, "upstream_error", "Something went wrong. Try again.");
    }
  }

  if (body?.action === "tailor") {
    try {
      const fw = typeof body?.framework === "string" && FW[body.framework] ? body.framework : null;
      if (!fw) return fail(400, "bad_request", "Pick a framework first.");
      const p = { name: str(body?.product?.name, 200), price: str(body?.product?.price, 40), audience: str(body?.product?.audience, 400), details: str(body?.product?.details, 1000) };
      if (!p.name) return fail(400, "bad_request", "Add your product first.");
      await spendAllowance(supabase, "tailor");
      const out: any = await askClaude(tailorPrompt(fw, p), { json: true, maxTokens: 2200, fast: true });
      const beats = (Array.isArray(out?.beats) ? out.beats : []).filter((b: any) => b && (b.show || b.talk)).slice(0, 10);
      const hooks = (Array.isArray(out?.hooks) ? out.hooks : []).filter((h: any) => h && (h.visual || h.say)).slice(0, 3);
      if (!beats.length) throw new MargoError("invalid_json", "Evee’s walkthrough came back incomplete. Try again.", 502);
      return NextResponse.json({ result: { v: 2, fit: out.fit || "", hooks, beats, tip: out.tip || "" } });
    } catch (e: any) {
      if (e instanceof MargoError) return fail(e.status, e.code, e.message);
      console.error("evee tailor error", e);
      return fail(500, "upstream_error", "Something went wrong. Try again.");
    }
  }

  return fail(400, "bad_request", "Evee doesn’t know how to do that.");
}
