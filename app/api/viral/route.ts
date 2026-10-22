import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude, MargoError } from "@/lib/claude";
import { watchVideo } from "@/lib/gemini";
import { spendAllowance } from "@/lib/limit";
import { frameworkPrompt, watchPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const fail = (status: number, code: string, message: string) => NextResponse.json({ code, message }, { status });
const TIKTOK = /^https:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\//i;

function tiktokIdFrom(url: string, html?: string) {
  const m = url.match(/\/video\/(\d{8,25})/) || (html || "").match(/data-video-id="(\d{8,25})"/);
  return m ? m[1] : null;
}

// One endpoint, three steps:
//   lookup → reads the TikTok link (caption, creator, cover) and spots duplicates
//   watch  → Gemini watches + listens to the uploaded file, then the file is deleted
//   frame  → Claude turns those notes into the framework everyone sees
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthorized", "You’ve been signed out. Sign in again.");
  let body: any;
  try { body = await req.json(); } catch { return fail(400, "bad_request", "That request couldn’t be read."); }
  const step = body?.step;

  try {
    if (step === "lookup") {
      const url = String(body.url || "").trim().split("?")[0];
      if (!TIKTOK.test(url) || url.length > 500) return fail(400, "bad_link", "Paste a TikTok video link, like https://www.tiktok.com/@creator/video/123…");
      let o: any = null;
      try {
        const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { headers: { "user-agent": "EveeShop/1.0" }, cache: "no-store" });
        if (r.ok) o = await r.json();
      } catch {}
      const id = tiktokIdFrom(url, o?.html);
      let existing = null;
      if (id) {
        const { data } = await supabase.from("virals").select("id,status").eq("tiktok_id", id).maybeSingle();
        existing = data;
      }
      return NextResponse.json({ result: {
        tiktokId: id, url,
        caption: typeof o?.title === "string" ? o.title.slice(0, 2000) : "",
        creator: typeof o?.author_name === "string" ? o.author_name : "",
        creatorUrl: typeof o?.author_url === "string" ? o.author_url : "",
        thumbnail: typeof o?.thumbnail_url === "string" ? o.thumbnail_url : "",
        found: !!o, existing,
      } });
    }

    const id = String(body.id || "");
    const { data: v } = await supabase.from("virals").select("*").eq("id", id).maybeSingle();
    if (!v) return fail(404, "not_found", "That video isn’t in the feed anymore.");
    if (v.added_by !== user.id) return fail(403, "forbidden", "Only the person who dropped this video can run it.");

    if (step === "watch") {
      if (!v.video_path) return fail(400, "bad_request", "The video file is missing. Drop it again.");
      await spendAllowance(supabase, "watch");
      await supabase.from("virals").update({ status: "watching", error: null }).eq("id", id);
      const file = await supabase.storage.from("virals").download(v.video_path);
      if (file.error || !file.data) throw new MargoError("upstream_error", "Couldn’t open the uploaded video. Drop it again.", 502);
      const bytes = await file.data.arrayBuffer();
      try {
        const watch = await watchVideo(bytes, file.data.type || "video/mp4", watchPrompt(v.caption || ""));
        await supabase.from("virals").update({ watch, status: "framing" }).eq("id", id);
        // Evee only needs the notes; the video file itself isn't kept.
        await supabase.storage.from("virals").remove([v.video_path]);
        await supabase.from("virals").update({ video_path: null }).eq("id", id);
        return NextResponse.json({ result: { ok: true } });
      } catch (e: any) {
        await supabase.from("virals").update({ status: "failed", error: e?.message?.slice(0, 300) || "Couldn’t watch it." }).eq("id", id);
        throw e;
      }
    }

    if (step === "frame") {
      if (!v.watch) return fail(400, "bad_request", "Evee hasn’t watched this video yet.");
      await spendAllowance(supabase, "frame");
      try {
        const analysis = await askClaude(frameworkPrompt(v, v.watch), { json: true, maxTokens: 5000 });
        await supabase.from("virals").update({ analysis, status: "ready", error: null }).eq("id", id);
        return NextResponse.json({ result: { analysis } });
      } catch (e: any) {
        await supabase.from("virals").update({ status: "failed", error: e?.message?.slice(0, 300) || "Couldn’t break it down." }).eq("id", id);
        throw e;
      }
    }
    return fail(400, "bad_request", "Unknown step.");
  } catch (e: any) {
    if (e instanceof MargoError) return fail(e.status, e.code, e.message);
    console.error("viral route error", e);
    return fail(500, "upstream_error", "Something went wrong. Try again.");
  }
}
