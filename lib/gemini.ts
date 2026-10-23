import "server-only";
import { MargoError, parseJson } from "./claude";

// Gemini watches and listens to a video (picture + sound) and reports what happens.
// Small videos go inline; bigger ones go through Gemini's Files API first.
const BASE = "https://generativelanguage.googleapis.com";
const INLINE_MAX = 18 * 1024 * 1024; // stay under the ~20 MB inline request limit

function key() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new MargoError("not_configured", "Video watching isn’t set up yet (GEMINI_API_KEY).", 503);
  return k;
}
const model = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function uploadFile(bytes: ArrayBuffer, mime: string) {
  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key(),
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "evee-viral" } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new MargoError("upstream_error", "Couldn’t send the video to be watched. Try again.", 502);
  const done = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Length": String(bytes.byteLength), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: bytes,
  });
  const j = await done.json().catch(() => null);
  const file = j?.file;
  if (!done.ok || !file?.name) throw new MargoError("upstream_error", "Couldn’t send the video to be watched. Try again.", 502);
  // Wait until Gemini has processed it (usually seconds for a short video).
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${BASE}/v1beta/${file.name}`, { headers: { "x-goog-api-key": key() } });
    const f = await r.json().catch(() => null);
    if (f?.state === "ACTIVE") return { name: f.name as string, uri: (f.uri || file.uri) as string };
    if (f?.state === "FAILED") throw new MargoError("bad_video", "That video couldn’t be processed. Try saving it again from TikTok.", 422);
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new MargoError("upstream_error", "The video took too long to process. Try again.", 504);
}

async function deleteFile(name: string) {
  await fetch(`${BASE}/v1beta/${name}`, { method: "DELETE", headers: { "x-goog-api-key": key() } }).catch(() => {});
}

// Pulls the model's text out of either response shape (Interactions or generateContent).
function textOf(j: any): string {
  if (typeof j?.output_text === "string") return j.output_text;
  const steps = Array.isArray(j?.steps) ? j.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const t = (steps[i]?.content || []).map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("");
    if (t.trim()) return t;
  }
  const outs = Array.isArray(j?.outputs) ? j.outputs : [];
  const o = outs.map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("");
  if (o.trim()) return o;
  const parts = j?.candidates?.[0]?.content?.parts || [];
  return parts.map((p: any) => p?.text || "").join("");
}

async function interactions(video: Record<string, string>, prompt: string) {
  return fetch(`${BASE}/v1beta/interactions`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({ model: model(), input: [{ type: "text", text: prompt }, { type: "video", ...video }] }),
  });
}
async function generateContent(video: { inline?: { mime: string; data: string }; file?: { mime: string; uri: string } }, prompt: string) {
  const part = video.inline ? { inline_data: { mime_type: video.inline.mime, data: video.inline.data } } : { file_data: { mime_type: video.file!.mime, file_uri: video.file!.uri } };
  return fetch(`${BASE}/v1beta/models/${model()}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [part, { text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  });
}

export async function watchVideo(bytes: ArrayBuffer, mime: string, prompt: string): Promise<any> {
  const vMime = mime === "video/quicktime" ? "video/quicktime" : mime === "video/webm" ? "video/webm" : "video/mp4";
  let uploaded: { name: string; uri: string } | null = null;
  try {
    let inline: { mime: string; data: string } | undefined;
    if (bytes.byteLength <= INLINE_MAX) inline = { mime: vMime, data: Buffer.from(bytes).toString("base64") };
    else uploaded = await uploadFile(bytes, vMime);

    // Try the current API first, then the older one. Keep Google's own error so we can show it.
    const errors: string[] = [];
    const readErr = async (r: Response) => { const t = await r.text().catch(() => ""); let m = t; try { m = JSON.parse(t)?.error?.message || t; } catch {} return `${r.status} ${String(m).slice(0, 240)}`; };
    let res = await interactions(inline ? { data: inline.data, mime_type: vMime } : { uri: uploaded!.uri, mime_type: vMime }, prompt);
    let j: any = null;
    if (res.ok) j = await res.json().catch(() => null);
    else errors.push("new API: " + (await readErr(res)));
    if (!j || !textOf(j).trim()) {
      const r2 = await generateContent(inline ? { inline } : { file: { mime: vMime, uri: uploaded!.uri } }, prompt);
      if (r2.ok) { j = await r2.json().catch(() => null); res = r2; }
      else { errors.push("classic API: " + (await readErr(r2))); res = r2; j = null; }
    }
    if (!j) {
      const all = errors.join(" | ");
      console.error("gemini error", all);
      if (/api key not valid|API_KEY_INVALID|permission|PERMISSION_DENIED|unauthenticated/i.test(all) || res.status === 401 || res.status === 403)
        throw new MargoError("not_configured", `Google rejected the video key. Check GEMINI_API_KEY in Vercel, then redeploy. (Google said: ${errors[errors.length - 1]})`, 503);
      if (/billing|quota|RESOURCE_EXHAUSTED/i.test(all) || res.status === 429)
        throw new MargoError("busy", `Google’s limit or billing stopped this. Check billing is on for your Google AI key. (Google said: ${errors[errors.length - 1]})`, 503);
      if (/not found|is not supported|NOT_FOUND/i.test(all))
        throw new MargoError("upstream_error", `That Gemini model isn’t available to your key. (Google said: ${errors[errors.length - 1]})`, 502);
      throw new MargoError("upstream_error", `Evee couldn’t watch that video. (Google said: ${errors.join(" | ").slice(0, 400)})`, 502);
    }
    const parsed = parseJson(textOf(j));
    if (!parsed || typeof parsed !== "object") throw new MargoError("invalid_json", "Evee’s notes on that video came back garbled. Try again.", 502);
    return parsed;
  } finally {
    if (uploaded) await deleteFile(uploaded.name);
  }
}
