import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude, MargoError, type ImageIn } from "@/lib/claude";
import { DUR, FORMATS, FW, PRODUCT_FIELDS } from "@/lib/library";
import * as P from "@/lib/prompts";
import { spendAllowance } from "@/lib/limit";

export const runtime = "nodejs";
export const maxDuration = 180;

type Obj = Record<string, any>;
const ACTIONS = ["brief", "extract", "adapt", "concepts", "angle", "script", "hooks", "cta", "timeline", "scene", "advice"] as const;
type Action = (typeof ACTIONS)[number];
const MAX_TOKENS: Record<Action, number> = { brief: 6000, extract: 2000, adapt: 9000, concepts: 9000, angle: 3000, script: 7000, hooks: 2500, cta: 1500, timeline: 4000, scene: 1200, advice: 1800 };
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const fail = (status: number, code: string, message: string) => NextResponse.json({ code, message }, { status });
const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = (a: unknown): any[] => (Array.isArray(a) ? a : []);

// Only known fields, only strings, sensible lengths. What the phone sends is never trusted as-is.
function cleanProduct(p: unknown): Obj {
  const src = (p && typeof p === "object" ? p : {}) as Obj;
  return Object.fromEntries(PRODUCT_FIELDS.map((f) => [f.k, str(src[f.k], 4000).trim()]));
}
function cleanOpts(o: unknown): Obj {
  const src = (o && typeof o === "object" ? o : {}) as Obj;
  const mode = src.mode === "series" ? "series" : "concepts";
  const count = Math.round(Number(src.count)) || 3;
  return {
    formats: arr(src.formats).filter((f) => FORMATS.includes(f)),
    frameworks: arr(src.frameworks).filter((f) => FW[f]),
    duration: DUR[src.duration] ? src.duration : "15-30",
    mode,
    count: mode === "series" ? Math.min(3, Math.max(2, count)) : Math.min(5, Math.max(3, count)),
  };
}
function cleanConcept(c: unknown): Obj {
  if (!c || typeof c !== "object") throw new MargoError("bad_request", "That concept is missing.", 400);
  if (JSON.stringify(c).length > 80_000) throw new MargoError("too_large", "That concept is too long.", 413);
  return c as Obj;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthorized", "You’ve been signed out. Sign in again.");

  let body: Obj;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "That request couldn’t be read.");
  }
  const action = body?.action as Action;
  const data = (body?.data && typeof body.data === "object" ? body.data : {}) as Obj;
  if (!ACTIONS.includes(action)) return fail(400, "bad_request", "Evee doesn’t know how to do that.");

  try {
    // Build the prompt first, so a bad request doesn't use up the daily limit.
    const profileRow = await supabase.from("docs").select("data").eq("id", "profile").maybeSingle();
    const creator = (profileRow.data?.data as Obj)?.creator || {};
    let prompt: string;
    let images: ImageIn[] | undefined;
    let json = true;

    if (action === "brief") {
      images = arr(data.images).slice(0, 6).map((i) => {
        if (!IMAGE_TYPES.includes(i?.media_type) || typeof i?.data !== "string" || i.data.length > 4_000_000) {
          throw new MargoError("bad_image", "One of the screenshots couldn’t be read. Use PNG or JPEG.", 400);
        }
        return { media_type: i.media_type, data: i.data };
      });
      if (!images.length) return fail(400, "bad_request", "Add at least one screenshot.");
      const today = /^\d{4}-\d{2}-\d{2}$/.test(data.today) ? data.today : new Date().toISOString().slice(0, 10);
      const prev = await supabase.from("docs").select("id,data").like("id", "b-%").lt("id", "b-" + today).order("id", { ascending: false }).limit(5);
      prompt = P.briefPrompt(today, str(data.note, 2000), (prev.data || []) as { id: string; data: Obj }[]);
    } else if (action === "extract") {
      const text = str(data.text, 30000).trim();
      if (!text) return fail(400, "bad_request", "Paste a listing, brief or notes first.");
      prompt = P.extractPrompt(text);
    } else if (action === "advice") {
      const rows = await supabase.from("docs").select("data").like("id", "s-%").limit(300);
      const scripts = (rows.data || []).map((r) => r.data as Obj);
      if (!scripts.some((d) => d?.perf?.views !== undefined && d?.perf?.views !== "")) return fail(400, "bad_request", "Log results for at least one video first.");
      prompt = P.advicePrompt(scripts);
      json = false;
    } else {
      const product = cleanProduct(data.product);
      if (!product.name) return fail(400, "bad_request", "Add the product name first.");
      const h: P.Ctx = { product, opts: cleanOpts(data.opts), creator };
      if (action === "adapt") {
        const { data: viral } = await supabase.from("virals").select("analysis,status").eq("id", str(data.viralId, 60)).maybeSingle();
        if (!viral?.analysis) return fail(404, "not_found", "That viral hasn’t been broken down yet.");
        prompt = P.adaptPrompt(h, viral);
      } else if (action === "concepts") prompt = P.conceptsPrompt(h);
      else if (action === "angle") {
        const others = arr(data.others).slice(0, 6).map((c) => ({ name: str(c?.name, 200), framework: str(c?.framework, 4), angle: str(c?.angle, 200) }));
        const part = Number(data.part) || null;
        prompt = P.conceptsPrompt(h, { part, others });
      } else {
        h.concept = cleanConcept(data.concept);
        if (action === "script") prompt = P.scriptPrompt(h);
        else if (action === "hooks") prompt = P.hooksPrompt(h);
        else if (action === "cta") prompt = P.ctaPrompt(h);
        else if (action === "timeline") prompt = P.timelinePrompt(h);
        else {
          const i = Math.round(Number(data.index));
          if (!(i >= 0 && i < arr(h.concept.timeline).length)) return fail(400, "bad_request", "That scene isn’t in the script.");
          prompt = P.scenePrompt(h, i);
        }
      }
    }

    await spendAllowance(supabase, action);

    const result = await askClaude(prompt, { images, maxTokens: MAX_TOKENS[action], json });
    return NextResponse.json({ result });
  } catch (e: any) {
    if (e instanceof MargoError) return fail(e.status, e.code, e.message);
    console.error("ai route error", e);
    return fail(500, "upstream_error", "Something went wrong. Try again.");
  }
}
