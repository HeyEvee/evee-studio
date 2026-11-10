import "server-only";
import { admin } from "./billing";
import { FRAMEWORKS, FW } from "./library";

// Framework of the week. Rotates automatically every Monday (Los Angeles time).
// The owner (OWNER_EMAIL) can pick this week's framework and add a note from inside the app;
// that pick is stored as her own "site-featured" doc and read here with the service role key.
export type Featured = { fw: string; note: string; week: string; custom: boolean; autoFw: string };

export function weekStart(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now).map((x) => [x.type, x.value]));
  const back = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - back));
  return d.toISOString().slice(0, 10);
}

const autoFor = (week: string) => FRAMEWORKS[Math.floor(Date.parse(week) / (7 * 86400000)) % FRAMEWORKS.length].id;

let ownerId: { email: string; id: string | null; at: number } | null = null;
let cache: { at: number; value: Featured } | null = null;

async function findOwnerId() {
  const email = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const db = admin();
  if (!email || !db) return null;
  if (ownerId && ownerId.email === email && Date.now() - ownerId.at < 60 * 60_000) return ownerId.id;
  let id: string | null = null;
  for (let page = 1; page <= 10 && !id; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    id = data?.users.find((u) => (u.email || "").toLowerCase() === email)?.id || null;
    if (!data || data.users.length < 200) break;
  }
  ownerId = { email, id, at: Date.now() };
  return id;
}

export async function getFeatured(): Promise<Featured> {
  const week = weekStart(), autoFw = autoFor(week);
  if (cache && cache.value.week === week && Date.now() - cache.at < 60_000) return cache.value;
  let value: Featured = { fw: autoFw, note: "", week, custom: false, autoFw };
  try {
    const id = await findOwnerId();
    const db = admin();
    if (id && db) {
      const { data } = await db.from("docs").select("data").eq("user_id", id).eq("id", "site-featured").maybeSingle();
      const v: any = data?.data;
      if (v && v.week === week && FW[v.fw]) value = { fw: v.fw, note: String(v.note || "").slice(0, 400), week, custom: true, autoFw };
    }
  } catch (e) {
    console.error("featured lookup failed", e);
  }
  cache = { at: Date.now(), value };
  return value;
}

export const isOwner = (email?: string | null) => !!email && !!process.env.OWNER_EMAIL && email.toLowerCase() === process.env.OWNER_EMAIL.trim().toLowerCase();
