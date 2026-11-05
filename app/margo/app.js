// Evee Studio app screens. Plain DOM rendering, mounted by MargoMount.tsx.
// Data: Supabase "docs" table (private per person). AI: /api/evee (prompts live on the server).
import { FRAMEWORKS, FW, STYLES, LENGTHS, DEFAULT_VOICE } from "@/lib/library";
import { SPINE, PRINCIPLES, PITFALLS } from "@/lib/playbook";

export function mount(root, { supabase, email }) {
  const listeners = new AbortController();
  const on = (type, fn) => document.addEventListener(type, fn, { signal: listeners.signal });

  root.innerHTML = `
  <div class="app">
    <header class="top"><div class="brand">Evee <span>Studio</span></div>
      <div class="topr"><div class="pill" id="status">Beta</div>
      <button class="me" data-go="you" aria-label="You and settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></button></div></header>
    <main id="view"></main>
  </div>
  <div class="toast" id="toast" role="status" hidden></div>
  <nav class="tabs" aria-label="Main">
    <button class="tab" data-go="today"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>Home</button>
    <button class="tab" data-go="create"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Create</button>
    <button class="tab" data-go="saved"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>Saved</button>
    <button class="tab" data-go="frameworks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Frameworks</button>
  </nav>`;
  const view = root.querySelector("#view");
  const statusEl = root.querySelector("#status");

  /* ================= helpers ================= */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const arr = (a) => (Array.isArray(a) ? a : []);
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (k, n) => { const [y, m, d] = k.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const fmtDay = (k, opts = { weekday: "long", month: "long", day: "numeric" }) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, opts); };
  const shortDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const num = (v) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(/[$,\s]/g, "")); return isFinite(n) ? n : null; };
  const money = (n) => (n == null ? "—" : "$" + Math.round(n).toLocaleString());
  const norm = (s) => String(s || "").trim().toLowerCase();
  function setPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== "object") o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
  let toastT;
  function toast(msg) { const t = root.querySelector("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2400); }
  function copy(text) { try { navigator.clipboard.writeText(text).then(() => toast("Copied"), () => toast("Couldn’t copy. Press and hold the text to copy it.")); } catch { toast("Couldn’t copy. Press and hold the text to copy it."); } }
  const blankProduct = () => ({ name: "", price: "", audience: "", details: "" });
  const blankRow = () => ({ name: "", units: "", revenue: "", videos: "" });

  /* ================= state ================= */
  let stack = ["today"];
  let userId = null, ready = false;
  const S = {
    err: "", busy: null,
    product: blankProduct(), opts: { style: "any", length: "medium", framework: "" },
    result: null, open: { 0: true },
    mode: "write", paste: "", useProduct: false, analysis: null,
    saved: {}, products: [], filter: "", confirmDel: false,
    sales: {}, log: null, // log = { date, rows } while editing
    perfDraft: null,
    vids: {}, showAll: false, period: (() => { try { const v = localStorage.getItem("evee.period"); return ["1d", "7d", "30d"].includes(v) ? v : "7d"; } catch { return "7d"; } })(),
    profile: { name: "", creator: { vibe: DEFAULT_VOICE, phrases: "", avoid: "", identity: "" } },
  };

  /* ================= data ================= */
  async function putDoc(id, data) { const { error } = await supabase.from("docs").upsert({ user_id: userId, id, data, updated_at: new Date().toISOString() }); if (error) throw error; }
  async function delDoc(id) { const { error } = await supabase.from("docs").delete().eq("id", id); if (error) throw error; }
  const saveFail = (what) => { statusEl.textContent = "Not saved"; statusEl.className = "pill warn"; toast(`Couldn’t save ${what}. Check your connection.`); };
  const saveOk = () => { if (statusEl.textContent === "Not saved") { statusEl.textContent = "Beta"; statusEl.className = "pill"; } };
  const persist = (id, data, what) => putDoc(id, clone(data)).then(saveOk, () => saveFail(what));

  async function load() {
    const { data, error } = await supabase.from("docs").select("id,data").limit(2000);
    if (error) { statusEl.textContent = "Offline"; statusEl.className = "pill warn"; ready = true; render(true); return; }
    const saved = {}, sales = {};
    for (const row of data || []) {
      const v = row.data || {};
      if (row.id === "profile") S.profile = { name: String(v.name || ""), creator: { vibe: v.creator?.vibe ?? DEFAULT_VOICE, phrases: v.creator?.phrases || "", avoid: v.creator?.avoid || "", identity: v.creator?.identity || "" } };
      else if (row.id === "products") S.products = arr(v.list);
      else if (row.id === "last" && !S.result && v.scripts) { S.result = v; S.product = { ...blankProduct(), ...(v.product || {}) }; S.opts = { ...S.opts, ...(v.opts || {}), framework: "" }; }
      else if (row.id.startsWith("k-")) saved[row.id.slice(2)] = v;
      else if (row.id.startsWith("sales-")) sales[row.id.slice(6)] = v;
      else if (row.id === "videos") S.vids = v.counts && typeof v.counts === "object" ? v.counts : {};
    }
    S.saved = saved; S.sales = sales; ready = true;
    if (!S.busy && !document.activeElement?.matches("input,textarea,select")) render(true);
  }
  function rememberProduct(p) {
    const i = S.products.findIndex((x) => norm(x.name) === norm(p.name));
    const merged = { ...blankProduct(), ...(i >= 0 ? S.products[i] : {}), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) };
    if (i >= 0) S.products.splice(i, 1);
    S.products.unshift(merged); S.products = S.products.slice(0, 40);
    persist("products", { list: S.products }, "your products");
  }

  /* ================= Evee ================= */
  async function ask(what, label, body) {
    if (S.busy) return null;
    const ctl = new AbortController(); S.busy = { what, label, ctl }; S.err = ""; render(true);
    try {
      let r;
      try { r = await fetch("/api/evee", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal }); }
      catch (e) { if (e?.name === "AbortError") return null; throw { message: "You’re offline. Evee needs a connection." }; }
      let j = null; try { j = await r.json(); } catch {}
      if (!r.ok) throw { message: j?.message || (r.status === 401 ? "You’ve been signed out. Reload to sign in again." : r.status === 504 ? "Evee took too long. Try again." : "Something went wrong. Try again.") };
      return j?.result;
    } catch (e) { S.err = e?.message || "Something went wrong. Try again."; return null; }
    finally { S.busy = null; render(true); }
  }
  const busyIs = (w) => S.busy && S.busy.what === w;
  // Shrinks a screenshot to at most 1568px on the long side as JPEG, so uploads stay small and fast.
  async function prepImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return { media_type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.78).split(",")[1] };
    } finally { URL.revokeObjectURL(url); }
  }
  async function readScreenshots(files) {
    const L = S.log; if (!L || !files.length) return;
    const list = [...files].filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|heic|webp)$/i.test(f.name)).slice(0, 8);
    if (!list.length) { S.err = "Pick screenshots (photos), not other files."; render(true); return; }
    if (files.length > 8) toast("Evee reads up to 8 screenshots at a time. Using the first 8.");
    let images;
    try { images = await Promise.all(list.map(prepImage)); }
    catch { S.err = "One of those screenshots couldn’t be opened. Try taking it again."; render(true); return; }
    const known = [...new Set([...S.products.map((p) => p.name), ...Object.values(salesByProduct()).map((p) => p.name)])].filter(Boolean);
    // Send in small batches so each upload stays well under Vercel's size limit.
    const batches = []; for (let i = 0; i < images.length; i += 3) batches.push(images.slice(i, i + 3));
    const all = []; let date = null, notes = [];
    for (let i = 0; i < batches.length; i++) {
      const label = batches.length > 1 ? `Evee is reading your screenshots (${i + 1} of ${batches.length})` : `Evee is reading ${list.length} screenshot${list.length > 1 ? "s" : ""}`;
      const part = await ask("read", label, { action: "read", images: batches[i], today: dayKey(), known: [...known, ...all.map((r) => r.name)] });
      if (!part) { if (!all.length) return; break; }
      for (const r of arr(part.rows)) { const j = all.findIndex((x) => norm(x.name) === norm(r.name)); if (j < 0) all.push(r); else if (all[j].units == null && r.units != null) all[j] = r; }
      date = date || part.date; if (part.note) notes.push(part.note);
    }
    if (!S.log) return;
    const out = { rows: all, date, note: notes.join(" ") };
    const typed = L.rows.filter((r) => String(r.name || "").trim());
    const found = arr(out.rows).map((r) => ({ name: r.name, units: r.units ?? "", revenue: r.revenue ?? "", videos: r.videos ?? "" }));
    const keep = typed.filter((r) => !found.some((f) => norm(f.name) === norm(r.name)));
    L.rows = [...found, ...keep];
    if (out.date && out.date !== L.date && !S.sales[out.date]) L.date = out.date;
    L.read = { count: found.length, note: out.note || "" };
    render(true);
    toast(`Found ${found.length} product${found.length === 1 ? "" : "s"}. Check them, then Save.`);
  }
  const busyCard = () => `<div class="card"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div><div><b>${esc(S.busy.label)}</b><p class="note">Usually 20–40 seconds.</p></div></div><button class="btn plain" data-act="stop">Stop</button></div>`;
  const errBox = () => (S.err ? `<p class="err">${esc(S.err)}</p>` : "");

  /* ================= routing ================= */
  function go(r) { stack = [r]; S.err = ""; S.confirmDel = false; render(); }
  function push(r) { stack.push(r); S.err = ""; S.confirmDel = false; render(); }
  function back() { stack.pop(); if (!stack.length) stack = ["today"]; S.err = ""; S.confirmDel = false; render(); }
  function render(keep) {
    const y = window.scrollY, cur = stack[stack.length - 1];
    view.innerHTML = cur.startsWith("k:") ? savedView(cur.slice(2)) : cur.startsWith("p:") ? productView(cur.slice(2)) : cur === "log" ? logView() : ({ today, create, saved, frameworks, you }[cur] || today)();
    const tabKey = ["today", "create", "saved", "frameworks"].includes(stack[0]) ? stack[0] : "";
    root.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.go === tabKey ? "page" : "false"));
    window.scrollTo(0, keep ? y : 0);
    const shots = root.querySelector("#shots");
    if (shots) shots.onchange = () => { const f = [...shots.files]; shots.value = ""; readScreenshots(f); };
  }

  /* ================= TODAY: best sellers + what to post ================= */
  const yesterday = () => addDays(dayKey(), -1);
  // { productKey: { name, byDay: {date: units}, rev: {date: $} } }
  function salesByProduct() {
    const out = {};
    for (const [date, doc] of Object.entries(S.sales)) for (const r of arr(doc.rows)) {
      const k = norm(r.name); if (!k) continue;
      out[k] ??= { name: r.name.trim(), byDay: {}, rev: {} };
      const u = num(r.units), v = num(r.revenue);
      if (u != null) out[k].byDay[date] = (out[k].byDay[date] || 0) + u;
      if (v != null) out[k].rev[date] = (out[k].rev[date] || 0) + v;
    }
    return out;
  }
  // Simple, explainable rules. No AI call, so it's instant and free.
  function recommendations() {
    const Y = yesterday(), days = [...Array(7)].map((_, i) => addDays(Y, -i)); // Y, Y-1, ... Y-6
    const P = salesByProduct(), recs = [];
    for (const p of Object.values(P)) {
      const u = (i) => p.byDay[days[i]] ?? 0;
      const logged = days.filter((d) => p.byDay[d] != null).length;
      const prev = days.slice(1).reduce((s, d) => s + (p.byDay[d] ?? 0), 0);
      const avgPrev = prev / 6;
      const y = u(0), y1 = u(1), y2 = u(2);
      const total7 = y + prev;
      let tag = null, why = "", score = 0;
      if (y > 0 && y > y1 && y1 > y2 && y2 > 0) { tag = "streak"; why = `Up 3 days in a row (${y2} → ${y1} → ${y}). Post 2–3 more while it’s climbing.`; score = 300 + y; }
      else if (y > 0 && p.byDay[days[1]] == null && prev === 0 && logged === 1) { tag = "new"; why = `New seller: ${y} sold yesterday. Test 3 different hooks to find what works.`; score = 200 + y; }
      else if (y > 0 && y >= Math.max(3, avgPrev * 1.5)) { tag = "jump"; why = `${y} sold yesterday vs about ${Math.round(avgPrev)} a day before. Retarget it today.`; score = 250 + y; }
      else if (prev >= 3 && y <= avgPrev * 0.4) { tag = "quiet"; why = `Sold ${prev} over the past week but ${y} yesterday. A fresh hook could wake it up.`; score = 100 + prev; }
      else if (y > 0) { tag = "steady"; why = `${y} sold yesterday, ${total7} this week. Keep 1 video a day going.`; score = y; }
      if (tag) recs.push({ ...p, tag, why, score, y, total7, spark: days.slice().reverse().map((d) => p.byDay[d] ?? 0) });
    }
    return recs.sort((a, b) => b.score - a.score);
  }
  const TAG = { streak: ["On a streak", "streak"], new: ["New winner", "new"], jump: ["Jumped", "streak"], quiet: ["Gone quiet", "quiet"], steady: ["Steady", ""] };
  function spark(vals) {
    const max = Math.max(1, ...vals);
    return `<span class="spark" aria-hidden="true">${vals.map((v, i) => `<i style="height:${Math.max(6, Math.round((v / max) * 100))}%" class="${i === vals.length - 1 ? "last" : ""}${v ? "" : " zero"}"></i>`).join("")}</span>`;
  }
  /* ---------- planner: periods, per-product stats, videos ---------- */
  const PERIODS = { "1d": ["Yesterday", 1, "vs the day before"], "7d": ["7 days", 7, "vs the 7 days before"], "30d": ["30 days", 30, "vs the 30 days before"] };
  const periodDays = (per, back = 0) => { const n = PERIODS[per][1], Y = yesterday(); return [...Array(n)].map((_, i) => addDays(Y, -(back * n) - i)); };
  const vidsOn = (d, k) => num(S.vids[d]?.[k]) || 0;
  const nameFor = (k) => S.products.find((p) => norm(p.name) === k)?.name || salesByProduct()[k]?.name || k;
  function productStats(days) {
    const P = salesByProduct(), keys = new Set(Object.keys(P)), out = {};
    for (const d of days) for (const k of Object.keys(S.vids[d] || {})) keys.add(k);
    for (const k of keys) {
      const p = P[k] || { name: nameFor(k), byDay: {}, rev: {} };
      let units = 0, gmv = 0, hasG = false, videos = 0;
      for (const d of days) { units += p.byDay[d] || 0; if (p.rev[d] != null) { gmv += p.rev[d]; hasG = true; } videos += vidsOn(d, k); }
      out[k] = { key: k, name: p.name, units, gmv: hasG ? gmv : null, videos };
    }
    return out;
  }
  const sumUp = (list) => ({ units: list.reduce((s, r) => s + r.units, 0), gmv: list.some((r) => r.gmv != null) ? list.reduce((s, r) => s + (r.gmv || 0), 0) : null, videos: list.reduce((s, r) => s + r.videos, 0) });
  const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  const delta = (p, label) => (p == null ? "" : `<span class="delta ${p > 0 ? "up" : p < 0 ? "down" : ""}">${p > 0 ? "▲" : p < 0 ? "▼" : ""} ${Math.abs(p)}%${label ? ` <span>${label}</span>` : ""}</span>`);
  const perVideo = (r) => (r.videos > 0 && r.gmv != null ? r.gmv / r.videos : null);
  function bumpVid(date, name, by) {
    const k = norm(name); if (!k) return;
    S.vids[date] ??= {};
    const n = Math.max(0, vidsOn(date, k) + by);
    if (n) S.vids[date][k] = n; else delete S.vids[date][k];
    persist("videos", { counts: S.vids }, "your videos");
    if (!S.products.some((p) => norm(p.name) === k)) rememberProduct({ name: String(name).trim() });
  }
  function setPeriod(p) { S.period = p; try { localStorage.setItem("evee.period", p); } catch {} render(true); }
  const periodSeg = () => `<div class="seg period">${Object.entries(PERIODS).map(([k, [l]]) => `<button aria-pressed="${S.period === k}" data-period="${k}">${l}</button>`).join("")}</div>`;
  const rangeLabel = (days) => (days.length === 1 ? fmtDay(days[0], { weekday: "long", month: "short", day: "numeric" }) : `${fmtDay(days[days.length - 1], { month: "short", day: "numeric" })} – ${fmtDay(days[0], { month: "short", day: "numeric" })}`);

  function today() {
    const Y = yesterday(), per = S.period, days = periodDays(per);
    const cur = productStats(days), prev = productStats(periodDays(per, 1));
    const h = new Date().getHours(), greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const hasAny = Object.keys(S.sales).length > 0;
    const head = `<p class="date">${fmtDay(dayKey())}</p><h1>${greet}${S.profile.name ? `, ${esc(S.profile.name)}` : ""}.</h1>`;
    if (ready && !hasAny) return `<div class="fade">${head}
      <section><div class="card logcta"><h2>Let’s see what’s selling</h2>
        <p class="note">Log yesterday’s sales from your TikTok Shop screenshots. Evee builds your planner: your top sellers, how many videos you made for each, and the GMV they brought in.</p>
        <button class="btn" data-log="${Y}">Log yesterday’s sales</button></div></section>
      <section class="example"><div class="sechead"><h2>Your top sellers</h2><span class="pill warn">Example</span></div>
        <div class="list">${[["Mini car vacuum", 1240, 41, 6, "streak"], ["Silk pillowcase", 860, 22, 3, ""], ["Shapewear bodysuit", 610, 14, 1, "new"]].map(([n, g, u, v, t], i) => `<div class="prow"><span class="rank">${i + 1}</span><span class="name">${n} ${t ? `<span class="chip ${TAG[t][1]}">${TAG[t][0]}</span>` : ""}<div class="meta">${v} video${v > 1 ? "s" : ""} · ${money(g / v)} per video</div><span class="bar"><i style="width:${Math.round((g / 1240) * 100)}%"></i></span></span><span class="num">${money(g)}<small class="meta">${u} sold</small></span></div>`).join("")}</div></section>
    </div>`;

    const rows = Object.values(cur).filter((r) => r.units > 0 || (r.gmv || 0) > 0);
    const useG = rows.some((r) => (r.gmv || 0) > 0), val = (r) => (useG ? r.gmv || 0 : r.units);
    rows.sort((a, b) => val(b) - val(a) || b.units - a.units);
    const T = sumUp(Object.values(cur)), TP = sumUp(Object.values(prev));
    const tags = Object.fromEntries(recommendations().map((r) => [norm(r.name), r.tag]));
    const max = Math.max(1, ...rows.map(val)), shown = rows.slice(0, S.showAll ? 10 : 5);
    const anyVids = T.videos > 0;

    // Retarget picks: best return per video, and sellers with no new videos.
    const picks = [];
    const best = rows.filter((r) => perVideo(r) != null && r.gmv > 0).sort((a, b) => perVideo(b) - perVideo(a))[0];
    if (best) picks.push({ r: best, chip: ["Best return per video", "streak"], why: `${money(perVideo(best))} per video from ${best.videos} video${best.videos > 1 ? "s" : ""}. Post another one while it’s working.` });
    const quiet = anyVids && rows.find((r) => r.videos === 0 && r !== best);
    if (quiet) picks.push({ r: quiet, chip: ["No new videos", "quiet"], why: `${useG ? money(quiet.gmv) : quiet.units + " sold"} with no new videos ${per === "1d" ? "yesterday" : "this period"}. A fresh video could push it further.` });
    const hot = rows.find((r) => ["streak", "jump", "new"].includes(tags[r.key]) && !picks.some((p) => p.r === r));
    if (hot) picks.push({ r: hot, chip: TAG[tags[hot.key]], why: recommendations().find((x) => norm(x.name) === hot.key)?.why || "" });

    return `<div class="fade">${head}
      ${!S.sales[Y] ? `<button class="banner" data-log="${Y}"><span><b>Log yesterday’s sales</b><span class="note">Screenshots or typing, about a minute</span></span><span aria-hidden="true">→</span></button>` : ""}
      <section>${periodSeg()}
        <div class="card hero">
          <div class="sechead"><span class="label">GMV · ${esc(rangeLabel(days))}</span>${delta(pct(T.gmv || 0, TP.gmv || 0))}</div>
          <b class="big">${T.gmv != null ? money(T.gmv) : "—"}</b>
          <div class="kpis">
            <div><b>${T.units.toLocaleString()}</b><span>Units sold</span></div>
            <div><b>${T.videos.toLocaleString()}</b><span>Videos posted</span></div>
            <div><b>${T.videos && T.gmv != null ? money(T.gmv / T.videos) : "—"}</b><span>GMV per video</span></div>
          </div>
          ${!anyVids ? `<p class="note">Add how many videos you posted when you log sales, so Evee can show GMV per video.</p>` : ""}
        </div></section>

      <section><div class="sechead"><h2>Top sellers</h2><small>${PERIODS[per][2]}</small></div>
        ${rows.length ? `<div class="list">${shown.map((r, i) => { const pr = prev[r.key], d = pr ? pct(val(r), val(pr)) : null, t = tags[r.key];
          return `<button class="prow" data-prod="${esc(r.key)}"><span class="rank">${i + 1}</span>
            <span class="name">${esc(r.name)}${t && t !== "steady" ? ` <span class="chip ${TAG[t][1]}">${TAG[t][0]}</span>` : ""}
              <div class="meta">${r.videos} video${r.videos === 1 ? "" : "s"}${perVideo(r) != null ? ` · ${money(perVideo(r))} per video` : ""}${d != null ? ` · ${delta(d)}` : ""}</div>
              <span class="bar"><i style="width:${Math.max(3, Math.round((val(r) / max) * 100))}%"></i></span></span>
            <span class="num">${useG ? money(r.gmv) : r.units.toLocaleString()}<small class="meta">${useG ? `${r.units.toLocaleString()} sold` : "sold"}</small></span></button>`; }).join("")}</div>
          ${rows.length > 5 ? `<button class="btn plain small" data-act="showall">${S.showAll ? "Show top 5" : `Show top ${Math.min(10, rows.length)}`}</button>` : ""}`
        : `<div class="card empty">No sales logged ${per === "1d" ? "for yesterday" : "in this period"} yet.<br><br><button class="btn" data-log="${Y}">Log yesterday’s sales</button></div>`}
      </section>

      ${picks.length ? `<section><div class="sechead"><h2>Retarget today</h2><small>from your numbers</small></div>
        ${picks.map((p) => `<div class="rt"><span class="chip ${p.chip[1]}">${p.chip[0]}</span><h2>${esc(p.r.name)}</h2><p class="why">${esc(p.why)}</p>
          <div class="btns"><button class="btn small" data-write="${esc(p.r.name)}">Write scripts</button><button class="btn ghost small" data-fwfor="${esc(p.r.name)}">Try a new framework</button></div></div>`).join("")}</section>` : ""}

      ${workingCard(true)}

      <section><div class="sechead"><h2>Sales log</h2><button class="btn plain small" data-log="${dayKey()}">Log another day</button></div>
        <div class="list">${Object.keys(S.sales).sort().reverse().slice(0, 7).map((d) => { const rs = arr(S.sales[d].rows).filter((r) => r.name); const g = rs.some((r) => num(r.revenue) != null) ? rs.reduce((s, r) => s + (num(r.revenue) || 0), 0) : null; const v = Object.values(S.vids[d] || {}).reduce((s, n) => s + (num(n) || 0), 0);
          return `<button class="row two" data-log="${d}"><span class="name">${fmtDay(d, { weekday: "short", month: "short", day: "numeric" })}<div class="meta">${rs.length} product${rs.length === 1 ? "" : "s"}${v ? ` · ${v} video${v === 1 ? "" : "s"}` : ""}</div></span><span class="num">${g != null ? money(g) : rs.reduce((s, r) => s + (num(r.units) || 0), 0) + " sold"}</span></button>`; }).join("")}</div></section>
    </div>`;
  }

  function productView(k) {
    const per = S.period, days = periodDays(per), Y = yesterday();
    const st = productStats(days)[k] || { key: k, name: nameFor(k), units: 0, gmv: null, videos: 0 };
    const pv = productStats(periodDays(per, 1))[k];
    const P = salesByProduct()[k] || { byDay: {}, rev: {} };
    const span = [...Array(per === "30d" ? 30 : 14)].map((_, i) => addDays(Y, -i)).reverse();
    const useG = span.some((d) => (P.rev[d] || 0) > 0), dv = (d) => (useG ? P.rev[d] || 0 : P.byDay[d] || 0);
    const mx = Math.max(1, ...span.map(dv));
    const scripts = Object.values(S.saved).filter((d) => norm(d.product?.name) === k).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const stepper = (d, label) => `<div class="vstep"><span>${label}</span><div><button class="x" data-vid="${d}|-1" aria-label="One fewer video">−</button><b>${vidsOn(d, k)}</b><button class="x" data-vid="${d}|1" aria-label="One more video">+</button></div></div>`;
    return `<div class="fade"><button class="back" data-act="back">← Home</button>
      <h1>${esc(st.name)}</h1>
      <section>${periodSeg()}
        <div class="card hero">
          <div class="sechead"><span class="label">GMV · ${esc(rangeLabel(days))}</span>${pv ? delta(pct(st.gmv || 0, pv.gmv || 0)) : ""}</div>
          <b class="big">${st.gmv != null ? money(st.gmv) : "—"}</b>
          <div class="kpis">
            <div><b>${st.units.toLocaleString()}</b><span>Units sold</span></div>
            <div><b>${st.videos}</b><span>Videos</span></div>
            <div><b>${perVideo(st) != null ? money(perVideo(st)) : "—"}</b><span>GMV per video</span></div>
          </div></div></section>
      <section><div class="card"><div class="sechead"><span class="label">${useG ? "Daily GMV" : "Daily units"} · last ${span.length} days</span><small class="meta"><span class="vkey">●</span> video posted</small></div>
        <div class="chart" role="img" aria-label="Daily sales for the last ${span.length} days">${span.map((d) => `<span class="col" title="${fmtDay(d, { month: "short", day: "numeric" })}: ${useG ? money(P.rev[d] || 0) : (P.byDay[d] || 0) + " sold"}${vidsOn(d, k) ? `, ${vidsOn(d, k)} video(s)` : ""}"><i class="dot${vidsOn(d, k) ? " on" : ""}"></i><i class="b${dv(d) ? "" : " zero"}" style="height:${Math.max(3, Math.round((dv(d) / mx) * 100))}%"></i></span>`).join("")}</div>
        <div class="axis"><span>${fmtDay(span[0], { month: "short", day: "numeric" })}</span><span>${fmtDay(span[span.length - 1], { month: "short", day: "numeric" })}</span></div></div></section>
      <section><div class="card"><span class="label">Videos you posted</span>${stepper(dayKey(), "Today")}${stepper(Y, "Yesterday")}
        <p class="note">Marking a saved script Posted adds it here too.</p></div></section>
      <section><div class="btns"><button class="btn" data-write="${esc(st.name)}">Write scripts for this</button><button class="btn ghost" data-fwfor="${esc(st.name)}">Try a new framework</button></div></section>
      ${scripts.length ? `<section><div class="sechead"><h2>Your scripts for this</h2></div><div class="list">${scripts.slice(0, 8).map((d) => `<button class="row two" data-saved="${d.id}"><span class="name">${esc(d.script?.title || FW[d.script?.framework]?.name)}<div class="meta">${esc(FW[d.script?.framework]?.name || "")} · ${shortDay(d.createdAt)}</div></span><span class="num"><span class="chip ${d.status || "idea"}">${STATUS[d.status || "idea"]}</span></span></button>`).join("")}</div></section>` : ""}
    </div>`;
  }
  function logView() {
    const L = S.log; if (!L) return today();
    const names = [...new Set([...S.products.map((p) => p.name), ...Object.values(salesByProduct()).map((p) => p.name)])].filter(Boolean);
    return `<div class="fade"><button class="back" data-act="back">← Back</button>
      <h1>Log sales</h1><p class="date">${fmtDay(L.date)}</p>
      <section>${busyIs("read") ? busyCard() : `<div class="card shots">
        <h2>Fill from screenshots</h2>
        <p class="note">In TikTok Shop, open Creator Center → Analytics and screenshot yesterday’s product sales (GMV and units). Add as many screenshots as you need.</p>
        <label class="drop"><input type="file" id="shots" accept="image/*" multiple>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
          <b>Choose screenshots</b><span class="note">Evee fills in the products and numbers for you</span></label>
        ${L.read ? `<p class="readok">Evee found ${L.read.count} product${L.read.count === 1 ? "" : "s"}. Check the numbers below, then Save.${L.read.note ? `<br><span class="note">${esc(L.read.note)}</span>` : ""}</p>` : ""}
      </div>`}</section>
      <section><div class="card">
        <span class="label">${L.read ? "Check and edit" : "Or type them in"}</span>
        <div class="field"><label for="ld">Day</label><input type="date" id="ld" data-bind="log.date" value="${esc(L.date)}" max="${dayKey()}"></div>
        <datalist id="known">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        ${L.rows.map((r, i) => `<div class="logrow">
          <div class="field"><label for="lr${i}n">Product</label><input type="text" id="lr${i}n" list="known" data-bind="log.rows.${i}.name" value="${esc(r.name)}" placeholder="Product name"></div>
          <div class="field"><label for="lr${i}u">Sold</label><input type="text" inputmode="numeric" id="lr${i}u" data-bind="log.rows.${i}.units" value="${esc(r.units)}" placeholder="12"></div>
          <div class="field"><label for="lr${i}r">GMV $</label><input type="text" inputmode="decimal" id="lr${i}r" data-bind="log.rows.${i}.revenue" value="${esc(r.revenue)}" placeholder="240"></div>
          <div class="field"><label for="lr${i}v">Videos</label><input type="text" inputmode="numeric" id="lr${i}v" data-bind="log.rows.${i}.videos" value="${esc(r.videos ?? "")}" placeholder="0"></div>
          ${L.rows.length > 1 ? `<button class="x" data-rmrow="${i}" aria-label="Remove row">×</button>` : `<span></span>`}
        </div>`).join("")}
        <button class="btn ghost small" data-act="addrow">+ Add product</button>
        <p class="note">Videos = how many you posted for that product that day. That’s how Evee works out GMV per video.</p>
        ${errBox()}
        <button class="btn" data-act="savelog">Save</button>
        ${S.sales[L.orig] ? `<button class="btn plain" data-act="dellog">Delete this day</button>` : ""}
      </div></section></div>`;
  }
  function openLog(date) {
    const doc = S.sales[date];
    S.log = { date, orig: date, rows: doc ? clone(arr(doc.rows)).map((r) => ({ name: r.name || "", units: r.units ?? "", revenue: r.revenue ?? "", videos: S.vids[date]?.[norm(r.name)] ?? "" })) : [blankRow(), blankRow(), blankRow()] };
    if (!S.log.rows.length) S.log.rows = [blankRow()];
    push("log");
  }
  async function saveLog() {
    const L = S.log;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(L.date)) { S.err = "Pick a day."; render(true); return; }
    const rows = L.rows.map((r) => ({ name: String(r.name || "").trim(), units: num(r.units), revenue: num(r.revenue) })).filter((r) => r.name);
    if (!rows.length) { S.err = "Add at least one product."; render(true); return; }
    if (rows.some((r) => r.units == null)) { S.err = "Add how many sold for each product (0 is fine)."; render(true); return; }
    const doc = { date: L.date, rows, updatedAt: new Date().toISOString() };
    if (L.orig !== L.date && S.sales[L.orig]) { delete S.sales[L.orig]; delDoc("sales-" + L.orig).catch(() => {}); }
    S.sales[L.date] = doc;
    persist("sales-" + L.date, doc, "your sales");
    const vrows = L.rows.filter((r) => String(r.name || "").trim() && num(r.videos) != null);
    if (vrows.length || (L.orig !== L.date && S.vids[L.orig])) {
      if (L.orig !== L.date && S.vids[L.orig]) { S.vids[L.date] = { ...S.vids[L.orig], ...(S.vids[L.date] || {}) }; delete S.vids[L.orig]; }
      S.vids[L.date] ??= {};
      for (const r of vrows) { const n = Math.max(0, Math.round(num(r.videos))); if (n) S.vids[L.date][norm(r.name)] = n; else delete S.vids[L.date][norm(r.name)]; }
      persist("videos", { counts: S.vids }, "your videos");
    }
    for (const r of rows) if (!S.products.some((p) => norm(p.name) === norm(r.name))) rememberProduct({ name: r.name });
    S.log = null; go("today"); toast("Saved");
  }
  function writeFor(name) {
    const known = S.products.find((p) => norm(p.name) === norm(name));
    S.product = { ...blankProduct(), ...(known || {}), name };
    S.opts.framework = "";
    go("create");
    toast(known?.price && known?.audience ? "Ready. Tap Write my scripts." : "Add the price and who it’s for, then tap Write my scripts.");
  }

  /* ================= script card ================= */
  const tags = (s) => arr(s.hashtags).map((h) => (String(h).startsWith("#") ? h : "#" + h)).join(" ");
  function scriptText(s, p) {
    const f = FW[s.framework], L = [];
    L.push(`${s.title || f?.name || "Script"}${p?.name ? ` · ${p.name}` : ""}`, f ? `Framework: ${f.name}` : "", "");
    if (s.intro) L.push(s.intro, "");
    L.push("HOOK TRIFECTA"); if (s.hook?.say) L.push(`Verbal: "${s.hook.say}"`); if (s.hook?.onScreen) L.push(`Text: ${s.hook.onScreen}`); if (s.hook?.visual) L.push(`Visual: ${s.hook.visual}`); L.push("");
    L.push("SCRIPT");
    let lastPart = "";
    for (const b of arr(s.body)) { if (b.part && b.part !== lastPart) { L.push(`[${(PART[b.part] || b.part).toUpperCase()}]`); lastPart = b.part; } if (b.direction) L.push(`(${b.direction})`); if (b.say) L.push(b.say); L.push(""); }
    for (const b of arr(s.beats)) { L.push(b.time || ""); if (b.say) L.push(`Say: "${b.say}"`); if (b.show) L.push(`Show: ${b.show}`); if (b.text) L.push(`On screen: ${b.text}`); L.push(""); }
    if (arr(s.ctas).length) { L.push("CTA OPTIONS"); arr(s.ctas).forEach((c, i) => L.push(`${i + 1}. ${c.label ? c.label + ": " : ""}"${c.line}"`)); L.push(""); }
    else if (s.cta) L.push(`CTA: ${s.cta}`, "");
    if (arr(s.altHooks).length) { L.push("ALTERNATIVE HOOKS TO TEST"); arr(s.altHooks).forEach((h, i) => L.push(`${i + 1}. ${[h.say && `Verbal: "${h.say}"`, h.onScreen && `Text: ${h.onScreen}`, h.visual && `Visual: ${h.visual}`].filter(Boolean).join(" / ")}`)); L.push(""); }
    if (arr(s.breakdown).length) { L.push("WHY THIS CONVERTS"); arr(s.breakdown).forEach((x) => L.push(`- ${x}`)); L.push(""); }
    if (s.caption) L.push(`Caption: ${s.caption} ${tags(s)}`.trim());
    return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  const PART = { hook: "Hook", pain: "Pain point", solution: "Solution", proof: "Proof", cta: "CTA" };
  function trifecta(h, label) {
    return `<div class="hookbox"><span class="label">${label}</span>
      ${h?.say ? `<span class="step ink"><b>Verbal</b><span class="say">“${esc(h.say)}”</span></span>` : ""}
      ${h?.onScreen ? `<span class="step ink"><b>Text</b><span>${esc(h.onScreen)}</span></span>` : ""}
      ${h?.visual ? `<span class="step"><b>Visual</b><span>${esc(h.visual)}</span></span>` : ""}</div>`;
  }
  function scriptCard(s, i, ctx) {
    const f = FW[s.framework], open = ctx.kind !== "result" || S.open[i];
    const key = ctx.kind === "saved" ? ctx.id : i;
    const head = `<div class="shead"><span class="chip acc">${esc(f?.name || "Script")}</span>${ctx.kind === "result" ? `<span class="meta">Script ${i + 1}</span>` : ""}</div>
      <h2>${esc(s.title || f?.name)}</h2>
      <p class="quote hookline">“${esc(s.hook?.say || s.hook?.onScreen)}”</p>`;
    if (!open) return `<button class="card scard closed" data-open="${i}">${head}<span class="note">Tap to see the full script</span></button>`;
    const isSaved = ctx.kind === "result" && s.savedId && S.saved[s.savedId];
    return `<div class="card scard">
      ${ctx.kind === "result" ? `<button class="sclose" data-close="${i}" aria-label="Collapse">${head}</button>` : head}
      ${s.intro || s.why ? `<p class="intro">${esc(s.intro || s.why)}</p>` : ""}
      ${trifecta(s.hook, "Hook trifecta")}
      <div><span class="label">Script</span>
        <div class="body">${arr(s.body).map((b, n, all) => `${b.part && b.part !== all[n - 1]?.part ? `<span class="part p-${esc(b.part)}">${esc(PART[b.part] || b.part)}</span>` : ""}${b.direction ? `<p class="dir">${esc(b.direction)}</p>` : ""}${b.say ? `<p class="line">${esc(b.say)}</p>` : ""}`).join("")}
        ${arr(s.beats).map((b) => `<p class="dir">${esc(b.time)}${b.show ? ` · ${esc(b.show)}` : ""}${b.text ? ` · On screen: ${esc(b.text)}` : ""}</p>${b.say ? `<p class="line">${esc(b.say)}</p>` : ""}`).join("")}</div></div>
      ${arr(s.ctas).length ? `<div><span class="label">CTA options</span><ol class="ctas">${arr(s.ctas).map((c) => `<li>${c.label ? `<b>${esc(c.label)}</b>` : ""}<span>“${esc(c.line)}”</span></li>`).join("")}</ol></div>`
        : s.cta ? `<div><span class="label">Call to action</span><p class="ctaline">${esc(s.cta)}</p></div>` : ""}
      ${arr(s.altHooks).length ? `<div class="alts"><span class="label">Alternative hooks to test</span>${arr(s.altHooks).map((h, n) => `<div class="alt"><b>${n + 1}</b><div>${h.say ? `<p class="line">“${esc(h.say)}”</p>` : ""}${h.onScreen ? `<p class="note"><b>Text:</b> ${esc(h.onScreen)}</p>` : ""}${h.visual ? `<p class="note"><b>Visual:</b> ${esc(h.visual)}</p>` : ""}</div></div>`).join("")}</div>` : ""}
      ${arr(s.breakdown).length ? `<div class="whybox conv"><span class="label">Why this converts</span><ul class="ul">${arr(s.breakdown).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${s.caption ? `<div><span class="label">Caption</span><p>${esc(s.caption)} <span class="meta">${esc(tags(s))}</span></p></div>` : ""}
      ${arr(s.filmTips).length || s.watchOut || s.closer ? `<div class="coachbox"><span class="label">Evee’s coaching</span>
        ${arr(s.filmTips).length ? `<ul class="ul">${arr(s.filmTips).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${s.watchOut ? `<p class="flag"><b>Watch out:</b> ${esc(s.watchOut)}</p>` : ""}
        ${s.closer ? `<p class="closer">${esc(s.closer)}</p>` : ""}</div>` : ""}
      <div class="btns">
        <button class="btn ghost small" data-copy="${ctx.kind}:${key}">Copy script</button>
        ${ctx.kind === "result" ? (isSaved ? `<button class="btn ghost small" disabled>Saved ✓</button>` : `<button class="btn small" data-save="${i}">Save</button>`) : ""}
        ${ctx.kind === "rewrite" ? (S.analysis?.savedId && S.saved[S.analysis.savedId] ? `<button class="btn ghost small" disabled>Saved ✓</button>` : `<button class="btn small" data-act="saverw">Save</button>`) : ""}
        ${ctx.kind === "rewrite" || busyIs("remix" + key) ? "" : `<button class="btn ghost small" data-remix="${ctx.kind}:${key}">New version</button>`}
      </div>
      ${busyIs("remix" + key) ? busyCard() : ""}
    </div>`;
  }

  /* ================= CREATE ================= */
  function create() {
    const p = S.product, o = S.opts, r = S.result, forced = FW[o.framework];
    const recent = S.products.filter((x) => x.name && norm(x.name) !== norm(p.name)).slice(0, 6);
    const modeSeg = `<div class="seg modes"><button aria-pressed="${S.mode === "write"}" data-mode="write">Write scripts</button><button aria-pressed="${S.mode === "analyze"}" data-mode="analyze">Break down a script</button></div>`;
    if (S.mode === "analyze") return analyzeView(modeSeg);
    return `<div class="fade">
      ${modeSeg}
      <h1>What are you selling?</h1>
      <p class="lede">Evee picks the best viral frameworks for your product and writes 3 ready-to-film scripts with coaching.</p>
      ${recent.length ? `<div class="opts recent">${recent.map((x) => `<button class="opt" data-recent="${esc(x.name)}">${esc(x.name)}</button>`).join("")}</div>` : ""}
      <section><div class="card">
        <div class="field"><label for="pn">Product</label><input type="text" id="pn" data-bind="product.name" value="${esc(p.name)}" placeholder="Mini cordless car vacuum"></div>
        <div class="grid2">
          <div class="field"><label for="pp">Price</label><input type="text" id="pp" inputmode="decimal" data-bind="product.price" value="${esc(p.price)}" placeholder="$29.99"></div>
          <div class="field"><label for="pa">Who it’s for</label><input type="text" id="pa" data-bind="product.audience" value="${esc(p.audience)}" placeholder="Busy moms"></div>
        </div>
        <div class="field"><label for="pd">What makes it great? <span class="hint">· optional</span></label><textarea id="pd" data-bind="product.details" placeholder="Cordless, fits in the glovebox, strong suction. I use it every week.">${esc(p.details)}</textarea></div>
        <span class="flabel">Style</span>
        <div class="opts">${Object.entries(STYLES).map(([k, l]) => `<button class="opt" aria-pressed="${o.style === k}" data-style="${k}">${esc(l)}</button>`).join("")}</div>
        <span class="flabel">Length</span>
        <div class="seg">${Object.entries(LENGTHS).map(([k, l]) => `<button aria-pressed="${o.length === k}" data-length="${k}">${esc(l)}</button>`).join("")}</div>
        ${forced ? `<p class="forced">Using the <b>${esc(forced.name)}</b> framework <button class="btn plain small" data-act="unforce">Let Evee pick instead</button></p>` : ""}
        ${errBox()}
        ${busyIs("create") ? busyCard() : `<button class="btn big" data-act="create">${r && norm(r.product?.name) === norm(p.name) ? "Write new scripts" : "Write my scripts"}</button>`}
      </div></section>
      ${r && !busyIs("create") ? results(r) : ""}
    </div>`;
  }
  function results(r) {
    const c = r.coach || {};
    return `<section id="results">
      <div class="sechead"><h2>Your scripts for ${esc(r.product?.name || "your product")}</h2><small>${esc(LENGTHS[r.opts?.length] || "")}</small></div>
      ${c.filmFirst || c.angle || c.test ? `<div class="card coach">
        <span class="label">Evee’s take</span>
        ${c.filmFirst ? `<p><b>Film first:</b> ${esc(c.filmFirst)}</p>` : ""}
        ${c.angle ? `<p><b>Your angle:</b> ${esc(c.angle)}</p>` : ""}
        ${c.test ? `<p><b>Test this:</b> ${esc(c.test)}</p>` : ""}</div>` : ""}
      ${arr(r.scripts).map((s, i) => scriptCard(s, i, { kind: "result" })).join("")}
    </section>`;
  }
  async function doCreate() {
    const p = S.product;
    if (!p.name.trim()) { S.err = "Add the product name first."; render(true); return; }
    if (!p.price.trim() || !p.audience.trim()) { S.err = "Add the price and who it’s for. Evee writes much better scripts with both."; render(true); return; }
    const product = { name: p.name.trim(), price: p.price.trim(), audience: p.audience.trim(), details: p.details.trim() }, opts = { ...S.opts };
    const out = await ask("create", "Evee is picking frameworks and writing your scripts", { action: "create", product, opts });
    if (!out) return;
    S.result = { product, opts, coach: out.coach || {}, scripts: arr(out.scripts).map((s) => ({ ...s, cid: uid() })), createdAt: new Date().toISOString() };
    S.open = { 0: true };
    persist("last", S.result, "your scripts");
    rememberProduct(product);
    render(true);
    root.querySelector("#results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ================= BREAK DOWN A SCRIPT ================= */
  const RATE = { strong: ["Strong", "streak"], ok: ["OK", ""], weak: ["Weak", "fix"], missing: ["Missing", "fix"] };
  function analyzeView(modeSeg) {
    const a = S.analysis, p = S.product;
    return `<div class="fade">
      ${modeSeg}
      <h1>Break down a script</h1>
      <p class="lede">Paste your draft, what a creator says in a video that’s selling, or describe the video. Evee shows what’s working through Hook → Pain point → Solution → CTA, then rewrites it to convert better.</p>
      <section><div class="card">
        <div class="field"><label for="ax">Script, transcript or description</label><textarea class="big" id="ax" data-bind="paste" placeholder="“Okay nobody told me about this…” or: She opens holding crumbs from her car seat, says…">${esc(S.paste)}</textarea></div>
        <label class="check"><input type="checkbox" id="ause" data-check="useProduct" ${S.useProduct ? "checked" : ""}> Rewrite it for my product${p.name ? `: <b>${esc(p.name)}</b>` : ""}</label>
        ${S.useProduct ? `<div class="grid2">
          <div class="field"><label for="apn">Product</label><input type="text" id="apn" data-bind="product.name" value="${esc(p.name)}"></div>
          <div class="field"><label for="app">Price</label><input type="text" id="app" data-bind="product.price" value="${esc(p.price)}"></div></div>
          <div class="field"><label for="apa">Who it’s for</label><input type="text" id="apa" data-bind="product.audience" value="${esc(p.audience)}"></div>` : ""}
        ${errBox()}
        ${busyIs("analyze") ? busyCard() : `<button class="btn big" data-act="analyze">Break it down</button>`}
      </div></section>
      ${a && !busyIs("analyze") ? `<section id="analysis">
        <div class="card coach"><span class="label">Evee’s verdict</span><p>${esc(a.verdict)}</p>
          ${a.frameworkName ? `<p class="note">Closest framework: <b>${esc(FW[a.framework]?.name || a.frameworkName)}</b></p>` : ""}</div>
        <div class="card"><span class="label">Part by part</span>
          ${["hook", "pain", "solution", "cta"].map((k) => { const x = a.parts?.[k] || {}, r = RATE[x.rating] || RATE.ok; return `<div class="partrow">
            <div class="sechead"><b>${PART[k]}</b><span class="chip ${r[1]}">${r[0]}</span></div>
            ${x.current ? `<p class="quote small">“${esc(x.current)}”</p>` : ""}
            ${x.why ? `<p class="note">${esc(x.why)}</p>` : ""}
            ${x.fix && x.rating !== "strong" ? `<p class="fixline"><b>Fix:</b> ${esc(x.fix)}</p>` : ""}</div>`; }).join("")}</div>
        ${arr(a.whyItWorks).length ? `<div class="card whybox conv"><span class="label">What’s already working</span><ul class="ul">${arr(a.whyItWorks).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        <div class="sechead"><h2>The stronger version</h2></div>
        ${scriptCard(a.rewrite, 0, { kind: "rewrite" })}
      </section>` : ""}
    </div>`;
  }
  async function doAnalyze() {
    const text = S.paste.trim();
    if (text.length < 40) { S.err = "Paste a little more: the script, what they say, or a description of the video."; render(true); return; }
    const p = S.product, product = S.useProduct ? { name: p.name.trim(), price: p.price.trim(), audience: p.audience.trim(), details: p.details.trim() } : null;
    if (S.useProduct && !product.name) { S.err = "Add your product name, or untick “Rewrite it for my product.”"; render(true); return; }
    const out = await ask("analyze", "Evee is breaking it down", { action: "analyze", text, product, opts: { style: S.opts.style, length: S.opts.length } });
    if (!out) return;
    S.analysis = { ...out, product, createdAt: new Date().toISOString() };
    if (product) rememberProduct(product);
    render(true);
    root.querySelector("#analysis")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ================= RESULTS: what's working for you ================= */
  const perfOf = (d) => { const p = d.perf || {}; const v = num(p.views), o = num(p.orders); return { views: v, orders: o, clicks: num(p.clicks), gmv: num(p.gmv), per1k: v > 0 && o != null ? (o / v) * 1000 : null }; };
  const hasPerf = (d) => num(d.perf?.views) > 0 && num(d.perf?.orders) != null;
  function leaderboard() {
    const agg = {};
    for (const d of Object.values(S.saved)) {
      if (!hasPerf(d)) continue; const fw = d.script?.framework; if (!FW[fw]) continue; const m = perfOf(d);
      const a = (agg[fw] ??= { fw, videos: 0, views: 0, orders: 0, gmv: 0, hasGmv: false });
      a.videos++; a.views += m.views; a.orders += m.orders; if (m.gmv != null) { a.gmv += m.gmv; a.hasGmv = true; }
    }
    return Object.values(agg).map((a) => ({ ...a, per1k: a.views ? (a.orders / a.views) * 1000 : 0 })).sort((x, y) => y.per1k - x.per1k);
  }
  const fmtShort = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n)));
  function workingCard(compact) {
    const rows = leaderboard();
    if (!rows.length) return compact ? "" : `<section><div class="card empty working"><b>What’s working for you</b><br>Mark a saved script <b>Posted</b> and add its views and orders. Evee ranks your frameworks by what actually sells for you, and leans on your winners.</div></section>`;
    const top = rows[0], total = rows.reduce((s, r) => s + r.videos, 0);
    return `<section><div class="card working">
      <div class="sechead"><h2>What’s working for you</h2><small>${total} posted video${total === 1 ? "" : "s"}</small></div>
      <p class="note">Ranked by orders per 1,000 views, the number that shows a video sells and doesn’t just get seen.</p>
      <div class="lb">${rows.slice(0, compact ? 3 : 10).map((r, i) => `<div class="lbrow"><span class="rank">${i + 1}</span>
        <span class="name">${esc(FW[r.fw].name)}<div class="meta">${r.videos} video${r.videos === 1 ? "" : "s"} · ${fmtShort(r.views)} views · ${r.orders} orders${r.hasGmv ? ` · ${money(r.gmv)}` : ""}${r.videos < 3 ? ` · <span class="early">early signal</span>` : ""}</div></span>
        <span class="num">${r.per1k.toFixed(1)}<small class="meta">per 1K</small></span></div>`).join("")}</div>
      ${top.videos >= 3 ? `<p class="note">Evee leans on <b>${esc(FW[top.fw].name)}</b> when it fits, and keeps testing others.</p>` : `<p class="note">Post a few more and the ranking gets more reliable. Under 3 videos is an early signal, not proof.</p>`}
      ${compact ? "" : `<button class="btn ghost small" data-usefw="${top.fw}">Write scripts with your top framework</button>`}
    </div></section>`;
  }
  function resultsBox(d) {
    const P = S.perfDraft || {}, m = perfOf({ perf: P });
    return `<div class="card results">
      <h2>How did it do?</h2>
      <p class="note">From TikTok analytics for this video. Views and orders matter most.</p>
      <div class="grid2">
        <div class="field"><label for="rv">Views</label><input type="text" inputmode="numeric" id="rv" data-bind="perfDraft.views" value="${esc(P.views ?? "")}" placeholder="12,400"></div>
        <div class="field"><label for="ro">Orders</label><input type="text" inputmode="numeric" id="ro" data-bind="perfDraft.orders" value="${esc(P.orders ?? "")}" placeholder="18"></div>
        <div class="field"><label for="rc">Product clicks <span class="hint">· optional</span></label><input type="text" inputmode="numeric" id="rc" data-bind="perfDraft.clicks" value="${esc(P.clicks ?? "")}"></div>
        <div class="field"><label for="rg">Sales $ <span class="hint">· optional</span></label><input type="text" inputmode="decimal" id="rg" data-bind="perfDraft.gmv" value="${esc(P.gmv ?? "")}"></div>
      </div>
      ${hasPerf(d) ? `<p class="readok">${m.per1k != null ? `<b>${m.per1k.toFixed(1)} orders per 1K views</b>` : ""}${m.clicks != null && m.views ? ` · ${((m.clicks / m.views) * 100).toFixed(1)}% clicked the product` : ""}</p>` : ""}
      <button class="btn" data-act="saveperf">Save results</button>
    </div>`;
  }

  /* ================= SAVED ================= */
  const STATUS = { idea: "To film", filmed: "Filmed", posted: "Posted" };
  function saved() {
    const all = Object.values(S.saved).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const list = all.filter((d) => !S.filter || (d.status || "idea") === S.filter);
    return `<div class="fade"><h1>Saved</h1><p class="date">${all.length} ${all.length === 1 ? "script" : "scripts"}</p>
      ${all.length ? `<div class="opts" style="margin-top:14px"><button class="opt" aria-pressed="${!S.filter}" data-filter="">All</button>${Object.entries(STATUS).map(([k, l]) => `<button class="opt" aria-pressed="${S.filter === k}" data-filter="${k}">${l}</button>`).join("")}</div>` : ""}
      ${all.length ? workingCard(false) : ""}
      <section>${!all.length ? `<div class="card empty">Scripts you save show up here, ready to film.<br><br><button class="btn" data-go="create">Write scripts</button></div>`
        : !list.length ? `<div class="card empty">Nothing here yet.</div>`
        : `<div class="list">${list.map((d) => `<button class="row two" data-saved="${d.id}"><span class="name">${esc(d.script?.title || FW[d.script?.framework]?.name)}<div class="meta">${esc(d.product?.name)} · ${esc(FW[d.script?.framework]?.name || "")} · ${shortDay(d.createdAt)}${hasPerf(d) ? ` · ${fmtShort(perfOf(d).views)} views, ${perfOf(d).orders} orders` : ""}</div></span><span class="num"><span class="chip ${d.status || "idea"}">${(d.status || "idea") === "posted" && !hasPerf(d) ? "Add results" : STATUS[d.status || "idea"]}</span></span></button>`).join("")}</div>`}</section>
    </div>`;
  }
  function savedView(id) {
    const d = S.saved[id];
    if (!d) return `<div class="fade"><button class="back" data-act="back">← Back</button><p class="empty">That script isn’t here anymore.</p></div>`;
    return `<div class="fade"><button class="back" data-act="back">← Saved</button>
      <p class="date">${esc(d.product?.name)}${d.product?.price ? ` · ${esc(d.product.price)}` : ""}</p>
      <div class="opts" style="margin-top:10px">${Object.entries(STATUS).map(([k, l]) => `<button class="opt" aria-pressed="${(d.status || "idea") === k}" data-status="${k}">${l}</button>`).join("")}</div>
      ${(d.status || "idea") === "posted" ? `<section>${resultsBox(d)}</section>` : `<p class="note" style="margin-top:10px">Mark it <b>Posted</b> after you post it to log how it did.</p>`}
      <section>${scriptCard(d.script, 0, { kind: "saved", id })}${errBox()}</section>
      <section>${S.confirmDel ? `<div class="card"><p>Delete this script for good?</p><div class="btns"><button class="btn" data-act="del">Delete</button><button class="btn ghost" data-act="canceldel">Keep it</button></div></div>` : `<button class="btn plain" data-act="askdel">Delete script</button>`}</section>
    </div>`;
  }

  /* ================= FRAMEWORKS ================= */
  function frameworks() {
    return `<div class="fade"><h1>Viral frameworks</h1>
      <p class="lede">The ${FRAMEWORKS.length} structures Evee writes with. She picks the best ones for your product, or you can choose one.</p>
      ${S.product.name ? `<p class="forced">Picking a framework for <b>${esc(S.product.name)}</b></p>` : ""}
      <section><details class="card fw formula" open><summary><span><b>The conversion formula</b><span class="note">Every script follows Hook → Pain point → Solution → CTA</span></span></summary>
        ${SPINE.map((p, n) => `<div class="spine"><span class="part p-${p.id}">${n + 1}. ${esc(p.name)}</span><p><b>${esc(p.goal)}</b></p><ul class="ul">${p.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>`).join("")}
        <div class="whybox"><span class="label">Persuasion principles Evee uses</span><ul class="ul">${PRINCIPLES.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="whybox"><span class="label">What kills conversions</span><ul class="ul">${PITFALLS.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </details></section>
      <section>${FRAMEWORKS.map((f) => `<details class="card fw"><summary><span><b>${esc(f.name)}</b><span class="note">${esc(f.oneLiner)}</span></span></summary>
        <p class="note"><b>Best for:</b> ${esc(f.bestFor)}</p>
        <ol class="ul">${f.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${f.why ? `<div class="whybox"><span class="label">Why it works</span><ul class="ul">${f.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
        <p class="coachline"><b>Evee’s tip:</b> ${esc(f.coach)}</p>
        ${f.caution ? `<p class="flag note">${esc(f.caution)}</p>` : ""}
        <button class="btn ghost small" data-usefw="${f.id}">Write scripts with this</button></details>`).join("")}</section>
    </div>`;
  }

  /* ================= YOU ================= */
  function you() {
    const c = S.profile.creator;
    return `<div class="fade"><button class="back" data-act="back">← Back</button><h1>You</h1><p class="date">${esc(email)}</p>
      <section><div class="card">
        <div class="field"><label for="yn">Your name</label><input type="text" id="yn" data-bind="profile.name" value="${esc(S.profile.name)}"></div>
        <div class="field"><label for="yv">How you come across</label><textarea id="yv" data-bind="profile.creator.vibe">${esc(c.vibe)}</textarea></div>
        <div class="field"><label for="yp">Phrases you actually say <span class="hint">· optional</span></label><textarea id="yp" data-bind="profile.creator.phrases" placeholder="“Okay wait.” “Run, don’t walk.”">${esc(c.phrases)}</textarea></div>
        <div class="field"><label for="ya">Words to never use <span class="hint">· optional</span></label><input type="text" id="ya" data-bind="profile.creator.avoid" value="${esc(c.avoid)}" placeholder="obsessed, game-changer"></div>
        <div class="field"><label for="yi">Your community or background <span class="hint">· optional</span></label><input type="text" id="yi" data-bind="profile.creator.identity" value="${esc(c.identity || "")}" placeholder="e.g. Black mom of four, hairstylist, nurse">
          <span class="hint">Only used for Cultural Insider scripts, so they speak from your own experience.</span></div>
        <button class="btn" data-act="saveprofile">Save</button>
        <p class="note">Evee uses this to make every script sound like you.</p>
      </div></section>
      <section><div class="card"><h2>Add Evee Studio to your home screen</h2>
        <p class="note"><b>iPhone:</b> open it in Safari, tap Share, then Add to Home Screen.<br><b>Android:</b> open it in Chrome, tap ⋮, then Install app.</p></div></section>
      <section><form method="post" action="/auth/signout" class="signout"><button class="btn plain">Sign out</button></form></section>
    </div>`;
  }

  /* ================= events ================= */
  on("input", (e) => { const b = e.target.dataset?.bind; if (b) setPath(S, b, e.target.value); });
  on("change", (e) => { const c = e.target.dataset?.check; if (c) { S[c] = e.target.checked; render(true); } });
  on("click", (e) => {
    if (!root.contains(e.target)) return;
    const el = e.target.closest("[data-go],[data-act],[data-style],[data-length],[data-open],[data-close],[data-save],[data-copy],[data-remix],[data-recent],[data-saved],[data-status],[data-filter],[data-usefw],[data-log],[data-rmrow],[data-write],[data-mode],[data-period],[data-prod],[data-vid],[data-fwfor]");
    if (!el) return; const d = el.dataset;
    if (d.go !== undefined) { if (d.go === "you") push("you"); else go(d.go); return; }
    if (d.log) { openLog(d.log); return; }
    if (d.mode) { S.mode = d.mode; S.err = ""; render(true); return; }
    if (d.rmrow !== undefined) { S.log.rows.splice(+d.rmrow, 1); render(true); return; }
    if (d.write) { writeFor(d.write); return; }
    if (d.period) { setPeriod(d.period); return; }
    if (d.prod) { push("p:" + d.prod); return; }
    if (d.vid) { const [dt, by] = d.vid.split("|"), k = stack[stack.length - 1].slice(2); bumpVid(dt, nameFor(k), +by); render(true); return; }
    if (d.fwfor) { const known = S.products.find((p) => norm(p.name) === norm(d.fwfor)); S.product = { ...blankProduct(), ...(known || {}), name: d.fwfor }; go("frameworks"); toast(`Pick a framework for ${d.fwfor}.`); return; }
    if (d.style) { S.opts.style = d.style; render(true); return; }
    if (d.length) { S.opts.length = d.length; render(true); return; }
    if (d.open !== undefined) { S.open[d.open] = true; render(true); return; }
    if (d.close !== undefined) { S.open[d.close] = false; render(true); return; }
    if (d.recent) { const x = S.products.find((p) => p.name === d.recent); if (x) { S.product = { ...blankProduct(), ...x }; render(true); } return; }
    if (d.saved) { S.perfDraft = clone(S.saved[d.saved]?.perf || {}); push("k:" + d.saved); return; }
    if (d.filter !== undefined) { S.filter = d.filter; render(true); return; }
    if (d.usefw) { S.opts.framework = d.usefw; go("create"); toast(S.product.name ? `Using ${FW[d.usefw].name} for ${S.product.name}.` : `Using ${FW[d.usefw].name}. Add your product.`); return; }
    if (d.status) { const id = stack[stack.length - 1].slice(2), doc = S.saved[id]; if (doc) { doc.status = d.status; if (d.status === "posted" && !doc.postedAt) { doc.postedAt = new Date().toISOString(); if (doc.product?.name) { bumpVid(dayKey(), doc.product.name, 1); toast(`Counted as a video for ${doc.product.name} today`); } } persist("k-" + id, doc, "the status"); render(true); } return; }
    if (d.save !== undefined) {
      const s = S.result?.scripts[+d.save]; if (!s) return;
      const id = uid(); const sc = clone(s); delete sc.savedId;
      const doc = { id, product: clone(S.result.product), opts: clone(S.result.opts), script: sc, status: "idea", createdAt: new Date().toISOString() };
      S.saved[id] = doc; s.savedId = id; persist("k-" + id, doc, "that script"); persist("last", S.result, "your scripts"); toast("Saved"); render(true); return;
    }
    if (d.copy) { const [kind, k] = d.copy.split(":"); if (kind === "rewrite") { if (S.analysis?.rewrite) copy(scriptText(S.analysis.rewrite, S.analysis.product)); return; } const doc = kind === "saved" ? S.saved[k] : null; const s = doc ? doc.script : S.result?.scripts[+k]; if (s) copy(scriptText(s, doc ? doc.product : S.result.product)); return; }
    if (d.remix) {
      const [kind, k] = d.remix.split(":"); const doc = kind === "saved" ? S.saved[k] : null;
      const s = doc ? doc.script : S.result?.scripts[+k]; if (!s) return;
      const product = doc ? doc.product : S.result.product, opts = doc ? doc.opts : S.result.opts;
      (async () => {
        const out = await ask("remix" + k, "Evee is writing a new version", { action: "remix", product, opts, prev: { framework: s.framework, hook: s.hook } });
        if (!out) return;
        if (doc) { doc.script = { ...out, framework: s.framework }; persist("k-" + k, doc, "that script"); toast("New version saved"); }
        else { S.result.scripts[+k] = { ...out, framework: s.framework, cid: uid() }; S.open[k] = true; persist("last", S.result, "your scripts"); toast("New version ready"); }
        render(true);
      })();
      return;
    }
    switch (d.act) {
      case "back": back(); break;
      case "stop": S.busy?.ctl.abort(); break;
      case "create": doCreate(); break;
      case "analyze": doAnalyze(); break;
      case "saverw": { const a = S.analysis; if (!a?.rewrite) break; const id = uid(); const doc = { id, product: clone(a.product || { name: a.frameworkName ? "Rewritten script" : "Script", price: "", audience: "", details: "" }), opts: { style: S.opts.style, length: S.opts.length }, script: clone(a.rewrite), status: "idea", createdAt: new Date().toISOString() };
        if (!doc.product.name) doc.product.name = "Rewritten script";
        S.saved[id] = doc; a.savedId = id; persist("k-" + id, doc, "that script"); toast("Saved"); render(true); break; }
      case "showall": S.showAll = !S.showAll; render(true); break;
      case "unforce": S.opts.framework = ""; render(true); break;
      case "addrow": S.log.rows.push(blankRow()); render(true); root.querySelector(`#lr${S.log.rows.length - 1}n`)?.focus(); break;
      case "savelog": saveLog(); break;
      case "dellog": { const dt = S.log.orig; delDoc("sales-" + dt).then(() => { delete S.sales[dt]; S.log = null; go("today"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); break; }
      case "askdel": S.confirmDel = true; render(true); break;
      case "canceldel": S.confirmDel = false; render(true); break;
      case "del": { const id = stack[stack.length - 1].slice(2); delDoc("k-" + id).then(() => { delete S.saved[id]; if (S.result) for (const s of S.result.scripts) if (s.savedId === id) delete s.savedId; go("saved"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); break; }
      case "saveperf": { const id = stack[stack.length - 1].slice(2), doc = S.saved[id]; if (!doc) break; const P = S.perfDraft || {};
        const v = num(P.views), o = num(P.orders);
        if (v == null || o == null) { S.err = "Add views and orders (0 orders is fine)."; render(true); break; }
        doc.perf = { views: v, orders: o, clicks: num(P.clicks), gmv: num(P.gmv), updatedAt: new Date().toISOString() }; S.err = "";
        persist("k-" + id, doc, "your results"); toast("Results saved. Evee will learn from this."); render(true); break; }
      case "saveprofile": persist("profile", S.profile, "your profile").then(() => toast("Saved")); break;
    }
  });
  on("visibilitychange", () => { if (document.visibilityState === "visible" && userId && !S.busy && stack[stack.length - 1] !== "log") load(); });

  /* ================= boot ================= */
  render();
  (async () => {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id || null;
    if (!userId) { window.location.replace("/login"); return; }
    await load();
  })();
  return () => { listeners.abort(); root.innerHTML = ""; };
}
