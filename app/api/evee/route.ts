import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude, MargoError } from "@/lib/claude";
import { spendAllowance } from "@/lib/limit";
import { FW, LENGTHS, STYLES } from "@/lib/library";
import { analyzePrompt, createPrompt, readSalesPrompt, remixPrompt, type Opts, type Product } from "@/lib/studio";
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
      const rows = (Array.isArray(out?.rows) ? out.rows : []).map((r: any) => ({ name: str(r?.name, 120), units: n(r?.units), revenue: n(r?.revenue) })).filter((r: any) => r.name).slice(0, 40);
      if (!rows.length) throw new MargoError("nothing_found", "Evee couldn’t find any products in those screenshots. Try a clearer screenshot of your product sales.", 422);
      const date = typeof out?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.date) && out.date <= today ? out.date : null;
      return NextResponse.json({ result: { date, rows, note: typeof out?.note === "string" ? out.note.slice(0, 300) : null } });
    } catch (e: any) {
      if (e instanceof MargoError) return fail(e.status, e.code, e.message);
      console.error("evee read error", e);
      return fail(500, "upstream_error", "Something went wrong. Try again.");
    }
  }

  if (body?.action === "analyze") {
    try {
      const text = str(body?.text, 12000);
      if (text.length < 40) return fail(400, "bad_request", "Paste a little more: the script, what they say, or a description of the video.");
      const prod: Product = { name: str(body?.product?.name, 200), price: str(body?.product?.price, 40), audience: str(body?.product?.audience, 400), details: str(body?.product?.details, 2000) };
      const o: Opts = { style: STYLES[body?.opts?.style] ? body.opts.style : "any", length: LENGTHS[body?.opts?.length] ? body.opts.length : "medium" };
      const prof = await supabase.from("docs").select("data").eq("id", "profile").maybeSingle();
      const c = (prof.data?.data as any)?.creator || {};
      const voice = { vibe: str(c.vibe, 600), phrases: str(c.phrases, 600), avoid: str(c.avoid, 600), identity: str(c.identity, 200) };
      await spendAllowance(supabase, "analyze");
      const out: any = await askClaude(analyzePrompt(text, prod.name ? prod : null, o, voice), { json: true, maxTokens: 5000 });
      if (!out?.parts || !out?.rewrite?.hook) throw new MargoError("invalid_json", "Evee’s breakdown came back incomplete. Try again.", 502);
      if (!FW[out.rewrite.framework] && FW[out.framework]) out.rewrite.framework = out.framework;
      return NextResponse.json({ result: out });
    } catch (e: any) {
      if (e instanceof MargoError) return fail(e.status, e.code, e.message);
      console.error("evee analyze error", e);
      return fail(500, "upstream_error", "Something went wrong. Try again.");
    }
  }

  const p: Product = { name: str(body?.product?.name, 200), price: str(body?.product?.price, 40), audience: str(body?.product?.audience, 400), details: str(body?.product?.details, 2000) };
  if (!p.name) return fail(400, "bad_request", "Add the product name first.");
  const o: Opts = {
    style: STYLES[body?.opts?.style] ? body.opts.style : "any",
    length: LENGTHS[body?.opts?.length] ? body.opts.length : "medium",
    framework: FW[body?.opts?.framework] ? body.opts.framework : undefined,
  };

  try {
    const prof = await supabase.from("docs").select("data").eq("id", "profile").maybeSingle();
    const c = (prof.data?.data as any)?.creator || {};
    const voice = { vibe: str(c.vibe, 600), phrases: str(c.phrases, 600), avoid: str(c.avoid, 600), identity: str(c.identity, 200) };

    if (body?.action === "create") {
      await spendAllowance(supabase, "create");
      const out: any = await askClaude(createPrompt(p, o, voice), { json: true, maxTokens: 8500 });
      const scripts = (Array.isArray(out?.scripts) ? out.scripts : []).filter((s: any) => s && s.hook).slice(0, 3);
      if (!scripts.length) throw new MargoError("invalid_json", "Evee didn’t return any scripts. Try again.", 502);
      return NextResponse.json({ result: { coach: out.coach || {}, scripts } });
    }
    if (body?.action === "remix") {
      const prev = body?.prev || {};
      if (!FW[prev.framework]) return fail(400, "bad_request", "That script’s framework is missing.");
      await spendAllowance(supabase, "remix");
      const s: any = await askClaude(remixPrompt(p, o, voice, { framework: prev.framework, hook: prev.hook }), { json: true, maxTokens: 3200 });
      if (!s?.hook) throw new MargoError("invalid_json", "Evee’s new version came back incomplete. Try again.", 502);
      return NextResponse.json({ result: { ...s, framework: prev.framework } });
    }
    return fail(400, "bad_request", "Evee doesn’t know how to do that.");
  } catch (e: any) {
    if (e instanceof MargoError) return fail(e.status, e.code, e.message);
    console.error("evee route error", e);
    return fail(500, "upstream_error", "Something went wrong. Try again.");
  }
}
