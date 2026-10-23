import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export class MargoError extends Error {
  constructor(public code: string, message: string, public status = 500) {
    super(message);
  }
}

let client: Anthropic | null = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new MargoError("not_configured", "Evee’s AI key isn’t set up yet.", 503);
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 170_000 });
  return client;
}

export type ImageIn = { media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };

export async function askClaude(prompt: string, opts: { images?: ImageIn[]; maxTokens?: number; json?: boolean } = {}) {
  const content: Array<Anthropic.Messages.ImageBlockParam | Anthropic.Messages.TextBlockParam> = [
    ...(opts.images || []).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.media_type, data: img.data } })),
    { type: "text" as const, text: prompt },
  ];
  let res: Anthropic.Messages.Message;
  try {
    res = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.json
        ? "You are Evee, an assistant inside the Evee Studio app for TikTok Shop creators. Your reply is parsed by a program: reply with exactly one JSON value and nothing else."
        : "You are Evee, an assistant inside the Evee Studio app for TikTok Shop creators.",
      messages: [{ role: "user", content }],
    });
  } catch (e: any) {
    if (e instanceof MargoError) throw e;
    const status = e?.status as number | undefined;
    if (status === 429) throw new MargoError("busy", "Evee is busy right now. Try again in a minute.", 503);
    if (status === 400) { const d = String(e?.error?.error?.message || e?.message || "").slice(0, 200); console.error("anthropic 400", d); throw new MargoError("bad_request", `Evee couldn’t read that request (${d}).`, 400); }
    if (status === 401 || status === 403) throw new MargoError("not_configured", "Evee’s AI key isn’t working. Check ANTHROPIC_API_KEY in Vercel, then redeploy.", 503);
    const detail = String(e?.error?.error?.message || e?.message || "").slice(0, 200);
    if (status === 404) throw new MargoError("not_configured", `Evee’s AI model isn’t available to this key (${detail}). Check ANTHROPIC_MODEL in Vercel.`, 503);
    if (status === 413) throw new MargoError("too_large", "Those screenshots are too big to send at once. Try fewer.", 413);
    console.error("anthropic error", status, detail);
    throw new MargoError("upstream_error", `Evee couldn’t be reached${status ? ` (${status}${detail ? ": " + detail : ""})` : ""}. Try again.`, 502);
  }
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  if ((res.stop_reason as string) === "refusal") throw new MargoError("refused", "Evee couldn’t work with that. Try changing the details.", 422);
  if (!opts.json) {
    if (!text) throw new MargoError("empty", "Evee came back empty. Try again.", 502);
    return text;
  }
  if (res.stop_reason === "max_tokens") throw new MargoError("invalid_json", "Evee’s answer ran too long. Try asking for fewer concepts.", 502);
  const parsed = parseJson(text);
  if (parsed === undefined) throw new MargoError("invalid_json", "Evee’s answer came back garbled. Try again.", 502);
  return parsed;
}

// Tolerant reader: whole reply, else one fenced block, else first { or [ to the last } or ].
export function parseJson(text: string): unknown {
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  let v = tryParse(text);
  if (v !== undefined) return v;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    v = tryParse(fence[1].trim());
    if (v !== undefined) return v;
  }
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) return tryParse(text.slice(start, end + 1));
  return undefined;
}
