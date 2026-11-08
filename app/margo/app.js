// Evee Studio app screens. Plain DOM rendering, mounted by MargoMount.tsx.
// Data: Supabase "docs" table (private per person). AI: /api/evee (prompts live on the server).
import { FRAMEWORKS, FW } from "@/lib/library";
import { AFFIRMATIONS, affirmationIndex } from "@/lib/affirmations";
import { SPINE, PRINCIPLES, PITFALLS } from "@/lib/playbook";

export function mount(root, { supabase, email, billing = false }) {
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
    <button class="tab" data-go="products"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>Products</button>
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
    err: "", busy: null, q: "", aff: 0,
    tl: { fw: null, product: { name: "", price: "", audience: "" } }, tlCache: {},
    products: [], sales: {}, log: null, // log = { date, rows } while editing
    vids: {}, showAll: false, period: (() => { try { const v = localStorage.getItem("evee.period"); return ["0d", "1d", "7d", "30d"].includes(v) ? v : "7d"; } catch { return "7d"; } })(),
    profile: { name: "" }, profileRaw: {},
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
    const sales = {};
    for (const row of data || []) {
      const v = row.data || {};
      if (row.id === "profile") { S.profileRaw = v; S.profile = { name: String(v.name || "") }; }
      else if (row.id === "products") S.products = arr(v.list);
      else if (row.id.startsWith("sales-")) sales[row.id.slice(6)] = v;
      else if (row.id === "tailored") S.tlCache = v.items && typeof v.items === "object" ? v.items : {};
      else if (row.id === "videos") S.vids = v.counts && typeof v.counts === "object" ? v.counts : {};
    }
    S.sales = sales; ready = true;
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
  function go(r) { stack = [r]; S.err = ""; render(); }
  function push(r) { stack.push(r); S.err = ""; render(); }
  function back() { stack.pop(); if (!stack.length) stack = ["today"]; S.err = ""; render(); }
  function render(keep) {
    const y = window.scrollY, cur = stack[stack.length - 1];
    view.innerHTML = cur.startsWith("p:") ? productView(cur.slice(2)) : cur === "log" ? logView() : ({ today, products: productsTab, frameworks, you, tailor: tailorView }[cur] || today)();
    const tabKey = ["today", "products", "frameworks"].includes(stack[0]) ? stack[0] : "";
    root.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.go === tabKey ? "page" : "false"));
    window.scrollTo(0, keep ? y : 0);
    const shots = root.querySelector("#shots");
    if (shots) shots.onchange = () => { const f = [...shots.files]; shots.value = ""; readScreenshots(f); };
    const hs = root.querySelector("#homeshots");
    if (hs) hs.onchange = () => { const f = [...hs.files]; hs.value = ""; if (!f.length) return; openLog(yesterday()); readScreenshots(f); };
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
  const PERIODS = { "0d": ["Today", 1, "vs yesterday"], "1d": ["Yesterday", 1, "vs the day before"], "7d": ["7 days", 7, "vs the 7 days before"], "30d": ["30 days", 30, "vs the 30 days before"] };
  // "Today" shows only once today has been logged. Yesterday, 7 and 30 days use full days, so a half-finished today never drags the totals down.
  const todayLogged = () => !!S.sales[dayKey()];
  const curPeriod = () => (S.period === "0d" && !todayLogged() ? "1d" : S.period);
  const periodDays = (per, back = 0) => {
    const n = PERIODS[per][1], end = per === "0d" ? dayKey() : yesterday();
    return [...Array(n)].map((_, i) => addDays(end, -(back * n) - i));
  };
  const periodWord = (per) => (per === "0d" ? "today" : per === "1d" ? "yesterday" : "this period");
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
  function setTlProduct(name) { const k = S.products.find((x) => norm(x.name) === norm(name)); S.tl.product = { name, price: k?.price || "", audience: k?.audience || "" }; }
  function setPeriod(p) { S.period = p; try { localStorage.setItem("evee.period", p); } catch {} render(true); }
  const periodSeg = () => `<div class="seg period">${Object.entries(PERIODS).filter(([k]) => k !== "0d" || todayLogged()).map(([k, [l]]) => `<button aria-pressed="${curPeriod() === k}" data-period="${k}">${l}</button>`).join("")}</div>`;
  const rangeLabel = (days) => (days.length === 1 ? fmtDay(days[0], { weekday: "long", month: "short", day: "numeric" }) : `${fmtDay(days[days.length - 1], { month: "short", day: "numeric" })} – ${fmtDay(days[0], { month: "short", day: "numeric" })}`);

  const dropBtn = (Y) => `<div class="dropwrap"><label class="dropbtn"><input type="file" id="homeshots" accept="image/*" multiple>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
      <span><b>Drop yesterday’s stats</b><span>Upload your TikTok Shop screenshots</span></span></label>
      <button class="btn plain small" data-log="${Y}">or type them in</button></div>`;
  function today() {
    const Y = yesterday(), per = curPeriod(), days = periodDays(per);
    const cur = productStats(days), prev = productStats(periodDays(per, 1));
    const h = new Date().getHours(), greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const hasAny = Object.keys(S.sales).length > 0;
    const affText = AFFIRMATIONS[(affirmationIndex(dayKey()) + S.aff) % AFFIRMATIONS.length];
    const top = `<p class="date">${fmtDay(dayKey())}</p><h1>${greet}${S.profile.name ? `, ${esc(S.profile.name)}` : ""}.</h1>`;
    const affCard = `<div class="aff"><span class="label">${S.aff ? "Affirmation" : "Today’s affirmation"}</span><p>${esc(affText)}</p>
        <div class="btns"><button class="btn plain small" data-act="nextaff">Another one</button><button class="btn plain small" data-act="copyaff">Copy</button></div></div>`;
    const head = top + affCard;
    if (ready && !hasAny) return `<div class="fade">${head}
      <section><div class="card logcta"><h2>Let’s see what’s selling</h2>
        <p class="note">In TikTok Shop, open Creator Center → Analytics and screenshot yesterday’s product sales. Drop them here and Evee builds your planner: your top sellers, how many videos you made for each, and the GMV they brought in.</p>
        ${dropBtn(Y)}</div></section>
      <section class="example"><div class="sechead"><h2>Your top sellers</h2><span class="pill warn">Example</span></div>
        <div class="list">${[["Mini car vacuum", 1240, 41, 6, "streak"], ["Silk pillowcase", 860, 22, 3, ""], ["Shapewear bodysuit", 610, 14, 1, "new"]].map(([n, g, u, v, t], i) => `<div class="prow"><span class="rank">${i + 1}</span><span class="name">${n} ${t ? `<span class="chip ${TAG[t][1]}">${TAG[t][0]}</span>` : ""}<div class="meta">${v} video${v > 1 ? "s" : ""} · ${money(g / v)} GMV per video</div><span class="bar"><i style="width:${Math.round((g / 1240) * 100)}%"></i></span></span><span class="num">${money(g)}<small class="meta">GMV · ${u} sold</small></span></div>`).join("")}</div></section>
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
    if (best) picks.push({ r: best, chip: ["Best GMV per video", "streak"], why: `${money(perVideo(best))} GMV per video from ${best.videos} video${best.videos > 1 ? "s" : ""}. Post another one while it’s working.` });
    const quiet = anyVids && rows.find((r) => r.videos === 0 && r !== best);
    if (quiet) picks.push({ r: quiet, chip: ["No new videos", "quiet"], why: `${useG ? money(quiet.gmv) + " GMV" : quiet.units + " sold"} with no new videos ${periodWord(per)}. A fresh video could push it further.` });
    const hot = rows.find((r) => ["streak", "jump", "new"].includes(tags[r.key]) && !picks.some((p) => p.r === r));
    if (hot) picks.push({ r: hot, chip: TAG[tags[hot.key]], why: recommendations().find((x) => norm(x.name) === hot.key)?.why || "" });

    return `<div class="fade">${top}
      ${!S.sales[Y] ? `<section class="first">${dropBtn(Y)}</section>` : `<button class="banner done" data-log="${Y}"><span><b>✓ Yesterday’s stats are in</b><span class="note">Tap to check or add more screenshots</span></span><span aria-hidden="true">→</span></button>`}
      ${affCard}
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
              <div class="meta">${r.videos} video${r.videos === 1 ? "" : "s"}${perVideo(r) != null ? ` · ${money(perVideo(r))} GMV per video` : ""}${d != null ? ` · ${delta(d)}` : ""}</div>
              <span class="bar"><i style="width:${Math.max(3, Math.round((val(r) / max) * 100))}%"></i></span></span>
            <span class="num">${useG ? money(r.gmv) : r.units.toLocaleString()}<small class="meta">${useG ? `GMV · ${r.units.toLocaleString()} sold` : "sold"}</small></span></button>`; }).join("")}</div>
          ${rows.length > 5 ? `<button class="btn plain small" data-act="showall">${S.showAll ? "Show top 5" : `Show top ${Math.min(10, rows.length)}`}</button>` : ""}`
        : `<div class="card empty">No sales logged ${per === "0d" || per === "1d" ? "for " + periodWord(per) : "in this period"} yet.<br><br><button class="btn" data-log="${Y}">Log yesterday’s sales</button></div>`}
      </section>

      ${picks.length ? `<section><div class="sechead"><h2>Retarget today</h2><small>from your numbers</small></div>
        ${picks.map((p) => `<div class="rt"><span class="chip ${p.chip[1]}">${p.chip[0]}</span><h2>${esc(p.r.name)}</h2><p class="why">${esc(p.why)}</p>
          <div class="btns"><button class="btn small" data-prod="${esc(p.r.key)}">See its numbers</button><button class="btn ghost small" data-fwfor="${esc(p.r.name)}">Pick a framework</button></div></div>`).join("")}</section>` : ""}


      <section><div class="sechead"><h2>Sales log</h2><button class="btn plain small" data-log="${dayKey()}">Log another day</button></div>
        <div class="list">${Object.keys(S.sales).sort().reverse().slice(0, 7).map((d) => { const rs = arr(S.sales[d].rows).filter((r) => r.name); const g = rs.some((r) => num(r.revenue) != null) ? rs.reduce((s, r) => s + (num(r.revenue) || 0), 0) : null; const v = Object.values(S.vids[d] || {}).reduce((s, n) => s + (num(n) || 0), 0);
          return `<button class="row two" data-log="${d}"><span class="name">${fmtDay(d, { weekday: "short", month: "short", day: "numeric" })}<div class="meta">${rs.length} product${rs.length === 1 ? "" : "s"}${v ? ` · ${v} video${v === 1 ? "" : "s"}` : ""}</div></span><span class="num">${g != null ? money(g) : rs.reduce((s, r) => s + (num(r.units) || 0), 0) + " sold"}</span></button>`; }).join("")}</div></section>
    </div>`;
  }

  function productView(k) {
    const per = curPeriod(), days = periodDays(per), Y = yesterday();
    const st = productStats(days)[k] || { key: k, name: nameFor(k), units: 0, gmv: null, videos: 0 };
    const pv = productStats(periodDays(per, 1))[k];
    const P = salesByProduct()[k] || { byDay: {}, rev: {} };
    const span = [...Array(per === "30d" ? 30 : 14)].map((_, i) => addDays(Y, -i)).reverse();
    const useG = span.some((d) => (P.rev[d] || 0) > 0), dv = (d) => (useG ? P.rev[d] || 0 : P.byDay[d] || 0);
    const mx = Math.max(1, ...span.map(dv));
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
      <section><button class="btn ghost" data-fwfor="${esc(st.name)}">Pick a framework for your next video</button></section>
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


  /* ================= FRAMEWORKS ================= */
  function frameworks() {
    return `<div class="fade"><h1>Viral frameworks</h1>
      <p class="lede">${FRAMEWORKS.length} proven video structures that sell on TikTok Shop. Study them, pick one for your next video, and switch formats when a product stalls.</p>
      <section><details class="card fw formula"><summary><span><b>The conversion formula</b><span class="note">Every video that sells follows Hook → Pain point → Solution → CTA</span></span></summary>
        ${SPINE.map((p, n) => `<div class="spine"><span class="part p-${p.id}">${n + 1}. ${esc(p.name)}</span><p><b>${esc(p.goal)}</b></p><ul class="ul">${p.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>`).join("")}
        <div class="whybox"><span class="label">Persuasion principles that drive sales</span><ul class="ul">${PRINCIPLES.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="whybox"><span class="label">What kills conversions</span><ul class="ul">${PITFALLS.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </details></section>
      ${S.tl.product.name ? `<p class="forced">Showing frameworks for <b>${esc(S.tl.product.name)}</b> <button class="btn plain small" data-act="tlclear">Clear</button></p>` : ""}
      <section>${FRAMEWORKS.map((f) => `<details class="card fw"><summary><span><b>${esc(f.name)}</b><span class="note">${esc(f.oneLiner)}</span></span></summary>
        <p class="note"><b>Best for:</b> ${esc(f.bestFor)}</p>
        <ol class="ul">${f.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${f.why ? `<div class="whybox"><span class="label">Why it works</span><ul class="ul">${f.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
        <p class="coachline"><b>Evee’s tip:</b> ${esc(f.coach)}</p>
        ${f.caution ? `<p class="flag note">${esc(f.caution)}</p>` : ""}
        <div class="btns"><button class="btn small" data-tailor="${f.id}">See it with ${S.tl.product.name ? esc(S.tl.product.name) : "my product"}</button><button class="btn ghost small" data-copyfw="${f.id}">Copy</button></div></details>`).join("")}</section>
    </div>`;
  }

  /* ================= SEE IT WITH MY PRODUCT ================= */
  const tlKey = () => { const p = S.tl.product; return ["v2", S.tl.fw, norm(p.name), String(p.price || "").trim(), norm(p.audience)].join("|"); };
  function tailorView() {
    const f = FW[S.tl.fw]; if (!f) return frameworks();
    const p = S.tl.product, res = S.tlCache[tlKey()];
    const top = Object.values(productStats(periodDays("30d"))).filter((r) => r.units > 0 || (r.gmv || 0) > 0).sort((a, b) => (b.gmv || 0) - (a.gmv || 0) || b.units - a.units).map((r) => r.name);
    const names = [...new Set([...top, ...S.products.map((x) => x.name)])].filter(Boolean).slice(0, 8);
    return `<div class="fade"><button class="back" data-act="back">← Frameworks</button>
      <p class="date">See it with my product</p><h1>${esc(f.name)}</h1>
      <p class="lede">${esc(f.oneLiner)}</p>
      <section><div class="card">
        ${names.length ? `<span class="label">Your products</span><div class="chips">${names.map((n) => `<button class="opt" aria-pressed="${norm(n) === norm(p.name)}" data-tlpick="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
        <div class="field"><label for="tn">Product</label><input type="text" id="tn" data-bind="tl.product.name" value="${esc(p.name)}" placeholder="e.g. Mini car vacuum"></div>
        <div class="row2"><div class="field"><label for="tp">Price <span class="hint">optional</span></label><input type="text" inputmode="decimal" id="tp" data-bind="tl.product.price" value="${esc(p.price || "")}" placeholder="29.99"></div>
        <div class="field"><label for="ta">Who it’s for <span class="hint">optional</span></label><input type="text" id="ta" data-bind="tl.product.audience" value="${esc(p.audience || "")}" placeholder="busy moms"></div></div>
        ${busyIs("tailor") || res ? "" : `<button class="btn" data-act="tailor">Show me how it works</button>`}
      </div></section>
      ${busyIs("tailor") ? `<section>${busyCard()}</section>` : errBox()}
      ${res && !busyIs("tailor") ? `<section><div class="card tl">
        ${res.fit ? `<p class="fit">${esc(res.fit)}</p>` : ""}
        <span class="label">3 hooks to try</span>
        <div class="hooks">${arr(res.hooks).map((h, i) => `<div class="hookbox"><span class="hstyle">${i + 1}. ${esc(h.style || "Hook")}</span>
          ${h.visual ? `<p><b>Show:</b> ${esc(h.visual)}</p>` : ""}${h.say ? `<p><b>Say:</b> “${esc(h.say)}”</p>` : ""}${h.onScreen ? `<p><b>On screen:</b> ${esc(h.onScreen)}</p>` : ""}</div>`).join("")}</div>
        <span class="label">The structure</span>
        <ol class="beats">${arr(res.beats).map((b) => `<li><b>${esc(b.beat || "")}</b>${b.show ? `<p><span class="k">Show</span> ${esc(b.show)}</p>` : ""}${b.talk ? `<p><span class="k">Talk about</span> ${esc(b.talk)}</p>` : ""}${b.why ? `<p class="bwhy">${esc(b.why)}</p>` : ""}</li>`).join("")}</ol>
        ${res.tip ? `<p class="coachline"><b>Evee’s tip:</b> ${esc(res.tip)}</p>` : ""}
        <p class="note">These are talking points, not a script. Say it your way, in your own words, so your video sounds like you.</p>
        <div class="btns"><button class="btn ghost small" data-act="tlcopy">Copy</button><button class="btn plain small" data-go="frameworks">Try another framework</button></div>
      </div></section>` : ""}
    </div>`;
  }
  async function runTailor() {
    const p = S.tl.product;
    if (!String(p.name || "").trim()) { S.err = "Add your product first."; render(true); return; }
    const key = tlKey();
    const out = await ask("tailor", `Showing how ${FW[S.tl.fw].name} works for ${p.name}…`, { action: "tailor", framework: S.tl.fw, product: { name: p.name, price: p.price, audience: p.audience, details: S.products.find((x) => norm(x.name) === norm(p.name))?.details || "" } });
    if (out) {
      S.tlCache[key] = { ...out, at: Date.now() };
      const keep = Object.entries(S.tlCache).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 60);
      S.tlCache = Object.fromEntries(keep);
      persist("tailored", { items: S.tlCache }, "your walkthroughs"); rememberProduct({ name: String(p.name).trim(), price: p.price, audience: p.audience }); render(true); }
  }
  function tailorText() {
    const r = S.tlCache[tlKey()], f = FW[S.tl.fw]; if (!r) return "";
    return [`${f.name} for ${S.tl.product.name}`, r.fit, "", "HOOKS TO TRY", ...arr(r.hooks).flatMap((h, i) => [`${i + 1}. ${h.style || "Hook"}`, h.visual && `   Show: ${h.visual}`, h.say && `   Say: "${h.say}"`, h.onScreen && `   On screen: ${h.onScreen}`]), "", "THE STRUCTURE",
      ...arr(r.beats).flatMap((b, i) => [`${i + 1}. ${b.beat || ""}`, b.show && `   Show: ${b.show}`, b.talk && `   Talk about: ${b.talk}`]), "", r.tip && `Tip: ${r.tip}`].filter((x) => x != null && x !== false).join("\n");
  }

  /* ================= PRODUCTS ================= */
  function productsTab() {
    const per = curPeriod(), days = periodDays(per), cur = productStats(days), prev = productStats(periodDays(per, 1));
    const rows = Object.values(cur).filter((r) => r.units > 0 || (r.gmv || 0) > 0 || r.videos > 0);
    const useG = rows.some((r) => (r.gmv || 0) > 0), val = (r) => (useG ? r.gmv || 0 : r.units);
    rows.sort((a, b) => val(b) - val(a) || b.units - a.units || b.videos - a.videos);
    const q = norm(S.q), list = q ? rows.filter((r) => norm(r.name).includes(q)) : rows;
    const tags = Object.fromEntries(recommendations().map((r) => [norm(r.name), r.tag]));
    return `<div class="fade"><h1>Products</h1><p class="date">${rows.length} product${rows.length === 1 ? "" : "s"} · ${esc(rangeLabel(days))}</p>
      <section>${periodSeg()}
        ${rows.length > 6 ? `<input type="search" id="pq" data-bind="q" data-live="1" value="${esc(S.q)}" placeholder="Search your products" aria-label="Search your products">` : ""}
        ${list.length ? `<div class="list">${list.map((r, i) => { const pr = prev[r.key], d = pr ? pct(val(r), val(pr)) : null, t = tags[r.key];
          return `<button class="prow" data-prod="${esc(r.key)}"><span class="rank">${i + 1}</span>
            <span class="name">${esc(r.name)}${t && t !== "steady" ? ` <span class="chip ${TAG[t][1]}">${TAG[t][0]}</span>` : ""}
              <div class="meta">${r.videos} video${r.videos === 1 ? "" : "s"}${perVideo(r) != null ? ` · ${money(perVideo(r))} GMV per video` : ""}${d != null ? ` · ${delta(d)}` : ""}</div></span>
            <span class="num">${useG ? money(r.gmv) : r.units.toLocaleString()}<small class="meta">${useG ? `GMV · ${r.units.toLocaleString()} sold` : "sold"}</small></span></button>`; }).join("")}</div>`
          : `<div class="card empty">${q ? "No products match that." : `No sales logged ${per === "0d" || per === "1d" ? "for " + periodWord(per) : "in this period"} yet.`}<br><br><button class="btn" data-log="${yesterday()}">Log sales</button></div>`}
      </section></div>`;
  }

  /* ================= YOU ================= */
  function you() {
    return `<div class="fade"><button class="back" data-act="back">← Back</button><h1>You</h1><p class="date">${esc(email)}</p>
      <section><div class="card">
        <div class="field"><label for="yn">Your name</label><input type="text" id="yn" data-bind="profile.name" value="${esc(S.profile.name)}"></div>
        <button class="btn" data-act="saveprofile">Save</button>
      </div></section>
      <section><div class="card"><h2>Add Evee Studio to your home screen</h2>
        <p class="note"><b>iPhone:</b> open it in Safari, tap Share, then Add to Home Screen.<br><b>Android:</b> open it in Chrome, tap ⋮, then Install app.</p></div></section>
      ${billing ? `<section><div class="card"><h2>Your subscription</h2><p class="note">Change your plan, update your card or cancel.</p><form method="post" action="/api/portal"><button class="btn ghost">Manage subscription</button></form></div></section>` : ""}
      <section><form method="post" action="/auth/signout" class="signout"><button class="btn plain">Sign out</button></form></section>
    </div>`;
  }

  /* ================= events ================= */
  on("input", (e) => { const b = e.target.dataset?.bind; if (!b) return; setPath(S, b, e.target.value);
    if (e.target.dataset.live) { const id = e.target.id, pos = e.target.selectionStart; render(true); view.firstElementChild?.classList.remove("fade"); const el = root.querySelector("#" + id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } } });
  on("click", (e) => {
    if (!root.contains(e.target)) return;
    const el = e.target.closest("[data-go],[data-act],[data-log],[data-rmrow],[data-period],[data-prod],[data-vid],[data-copyfw],[data-tailor],[data-tlpick],[data-fwfor]");
    if (!el) return; const d = el.dataset;
    if (d.go !== undefined) { if (d.go === "you") push("you"); else go(d.go); return; }
    if (d.log) { openLog(d.log); return; }
    if (d.rmrow !== undefined) { S.log.rows.splice(+d.rmrow, 1); render(true); return; }
    if (d.period) { setPeriod(d.period); return; }
    if (d.prod) { push("p:" + d.prod); return; }
    if (d.vid) { const [dt, by] = d.vid.split("|"), k = stack[stack.length - 1].slice(2); bumpVid(dt, nameFor(k), +by); render(true); return; }
    if (d.tailor) { S.tl.fw = d.tailor; if (!S.tl.product.name) { const top = Object.values(productStats(periodDays("7d"))).sort((a, b) => (b.gmv || 0) - (a.gmv || 0) || b.units - a.units)[0]; if (top) setTlProduct(top.name); } push("tailor"); return; }
    if (d.tlpick) { setTlProduct(d.tlpick); render(true); return; }
    if (d.fwfor) { setTlProduct(d.fwfor); go("frameworks"); toast(`Open a framework and tap See it with ${d.fwfor}`); return; }
    if (d.copyfw) { const f = FRAMEWORKS.find((x) => x.id === d.copyfw); if (f) copy([f.name, f.oneLiner, "", "Best for: " + f.bestFor, "", ...f.steps.map((x, i) => `${i + 1}. ${x}`), "", "Tip: " + f.coach].join("\n")); return; }
    switch (d.act) {
      case "back": back(); break;
      case "stop": S.busy?.ctl.abort(); break;
      case "nextaff": S.aff = (S.aff + 1) % AFFIRMATIONS.length || 1; render(true); break;
      case "copyaff": copy(AFFIRMATIONS[(affirmationIndex(dayKey()) + S.aff) % AFFIRMATIONS.length]); break;
      case "tailor": runTailor(); break;
      case "tlcopy": copy(tailorText()); break;
      case "tlclear": S.tl.product = { name: "", price: "", audience: "" }; render(true); break;
      case "showall": S.showAll = !S.showAll; render(true); break;
      case "addrow": S.log.rows.push(blankRow()); render(true); root.querySelector(`#lr${S.log.rows.length - 1}n`)?.focus(); break;
      case "savelog": saveLog(); break;
      case "dellog": { const dt = S.log.orig; delDoc("sales-" + dt).then(() => { delete S.sales[dt]; S.log = null; go("today"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); break; }
      case "saveprofile": S.profileRaw = { ...S.profileRaw, name: S.profile.name }; persist("profile", S.profileRaw, "your profile").then(() => toast("Saved")); break;
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
