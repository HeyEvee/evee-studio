// Evee Studio app screens. Plain DOM rendering, mounted by MargoMount.tsx.
// Data: Supabase "docs" table (private per person). AI: /api/evee (prompts live on the server).
import { FRAMEWORKS, FW, STYLES, LENGTHS, DEFAULT_VOICE } from "@/lib/library";

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
    <button class="tab" data-go="today"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>Today</button>
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
  const blankRow = () => ({ name: "", units: "", revenue: "" });

  /* ================= state ================= */
  let stack = ["today"];
  let userId = null, ready = false;
  const S = {
    err: "", busy: null,
    product: blankProduct(), opts: { style: "any", length: "medium", framework: "" },
    result: null, open: { 0: true },
    saved: {}, products: [], filter: "", confirmDel: false,
    sales: {}, log: null, // log = { date, rows } while editing
    profile: { name: "", creator: { vibe: DEFAULT_VOICE, phrases: "", avoid: "" } },
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
      if (row.id === "profile") S.profile = { name: String(v.name || ""), creator: { vibe: v.creator?.vibe ?? DEFAULT_VOICE, phrases: v.creator?.phrases || "", avoid: v.creator?.avoid || "" } };
      else if (row.id === "products") S.products = arr(v.list);
      else if (row.id === "last" && !S.result && v.scripts) { S.result = v; S.product = { ...blankProduct(), ...(v.product || {}) }; S.opts = { ...S.opts, ...(v.opts || {}), framework: "" }; }
      else if (row.id.startsWith("k-")) saved[row.id.slice(2)] = v;
      else if (row.id.startsWith("sales-")) sales[row.id.slice(6)] = v;
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
  const busyCard = () => `<div class="card"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div><div><b>${esc(S.busy.label)}</b><p class="note">Usually about 20 seconds.</p></div></div><button class="btn plain" data-act="stop">Stop</button></div>`;
  const errBox = () => (S.err ? `<p class="err">${esc(S.err)}</p>` : "");

  /* ================= routing ================= */
  function go(r) { stack = [r]; S.err = ""; S.confirmDel = false; render(); }
  function push(r) { stack.push(r); S.err = ""; S.confirmDel = false; render(); }
  function back() { stack.pop(); if (!stack.length) stack = ["today"]; S.err = ""; S.confirmDel = false; render(); }
  function render(keep) {
    const y = window.scrollY, cur = stack[stack.length - 1];
    view.innerHTML = cur.startsWith("k:") ? savedView(cur.slice(2)) : cur === "log" ? logView() : ({ today, create, saved, frameworks, you }[cur] || today)();
    const tabKey = ["today", "create", "saved", "frameworks"].includes(stack[0]) ? stack[0] : "";
    root.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.go === tabKey ? "page" : "false"));
    window.scrollTo(0, keep ? y : 0);
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
  function today() {
    const Y = yesterday(), logged = S.sales[Y], recs = recommendations();
    const h = new Date().getHours(), greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const yRows = arr(logged?.rows).filter((r) => r.name);
    const yUnits = yRows.reduce((s, r) => s + (num(r.units) || 0), 0), yRev = yRows.some((r) => num(r.revenue) != null) ? yRows.reduce((s, r) => s + (num(r.revenue) || 0), 0) : null;
    const pastDays = Object.keys(S.sales).sort().reverse().slice(0, 14);
    return `<div class="fade">
      <p class="date">${fmtDay(dayKey())}</p>
      <h1>${greet}${S.profile.name ? `, ${esc(S.profile.name)}` : ""}.</h1>
      ${!logged ? `<section><div class="card logcta">
          <h2>How did yesterday go?</h2>
          <p class="note">Add your best sellers from ${fmtDay(Y, { weekday: "long" })}. It takes 30 seconds, and Evee tells you what to post today.</p>
          <button class="btn" data-log="${Y}">Log yesterday’s best sellers</button></div></section>`
        : `<div class="stats">
          <div class="stat"><b>${yUnits.toLocaleString()}</b><span>Sold yesterday</span></div>
          <div class="stat"><b>${money(yRev)}</b><span>Sales</span></div>
          <div class="stat"><b>${yRows.length}</b><span>Products</span></div></div>`}
      ${recs.length ? `<section><div class="sechead"><h2>What to post today</h2><small>from your numbers</small></div>
        ${recs.slice(0, 4).map((r) => `<div class="rt">
          <div class="sechead"><span class="chip ${TAG[r.tag][1]}">${TAG[r.tag][0]}</span>${spark(r.spark)}</div>
          <h2>${esc(r.name)}</h2>
          <p class="why">${esc(r.why)}</p>
          <button class="btn" data-write="${esc(r.name)}">Write scripts for this</button></div>`).join("")}
      </section>` : ready && Object.keys(S.sales).length ? `<section><div class="card empty">Log a couple more days and Evee will start spotting streaks and products going quiet.</div></section>` : ""}
      ${!Object.keys(S.sales).length && ready ? `<section class="example"><div class="sechead"><h2>What you’ll see</h2><span class="pill warn">Example</span></div>
        <div class="rt"><div class="sechead"><span class="chip streak">On a streak</span>${spark([2, 3, 5, 4, 6, 9, 14])}</div><h2>Mini car vacuum</h2><p class="why">Up 3 days in a row (6 → 9 → 14). Post 2–3 more while it’s climbing.</p></div></section>` : ""}
      ${Object.keys(salesByProduct()).length ? productTable() : ""}
      ${pastDays.length ? `<section><div class="sechead"><h2>Past days</h2><button class="btn plain small" data-log="${dayKey()}">Log another day</button></div>
        <div class="list">${pastDays.map((d) => { const rows = arr(S.sales[d].rows).filter((r) => r.name); const u = rows.reduce((s, r) => s + (num(r.units) || 0), 0); const top = rows.slice().sort((a, b) => (num(b.units) || 0) - (num(a.units) || 0))[0];
          return `<button class="row two" data-log="${d}"><span class="name">${fmtDay(d, { weekday: "short", month: "short", day: "numeric" })}<div class="meta">${top ? `Top: ${esc(top.name)}` : "No sales logged"}</div></span><span class="num">${u.toLocaleString()} sold</span></button>`; }).join("")}</div></section>` : ""}
    </div>`;
  }
  function productTable() {
    const Y = yesterday(), days = [...Array(7)].map((_, i) => addDays(Y, -6 + i));
    const rows = Object.values(salesByProduct()).map((p) => ({ ...p, w: days.reduce((s, d) => s + (p.byDay[d] || 0), 0), wr: days.reduce((s, d) => s + (p.rev[d] || 0), 0) })).filter((p) => p.w > 0).sort((a, b) => b.w - a.w);
    if (!rows.length) return "";
    return `<section><div class="sechead"><h2>This week</h2><small>last 7 days</small></div>
      <div class="list">${rows.slice(0, 12).map((p, i) => `<button class="row" data-write="${esc(p.name)}"><span class="rank">${i + 1}</span><span class="name">${esc(p.name)}<div class="meta">${spark(days.map((d) => p.byDay[d] || 0))}</div></span><span class="num">${p.w.toLocaleString()} sold${p.wr ? `<small class="meta">${money(p.wr)}</small>` : ""}</span></button>`).join("")}</div>
      <p class="note">Tap a product to write scripts for it.</p></section>`;
  }
  function logView() {
    const L = S.log; if (!L) return today();
    const names = [...new Set([...S.products.map((p) => p.name), ...Object.values(salesByProduct()).map((p) => p.name)])].filter(Boolean);
    return `<div class="fade"><button class="back" data-act="back">← Back</button>
      <h1>Best sellers</h1><p class="date">${fmtDay(L.date)}</p>
      <section><div class="card">
        <div class="field"><label for="ld">Day</label><input type="date" id="ld" data-bind="log.date" value="${esc(L.date)}" max="${dayKey()}"></div>
        <datalist id="known">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        ${L.rows.map((r, i) => `<div class="logrow">
          <div class="field"><label for="lr${i}n">Product</label><input type="text" id="lr${i}n" list="known" data-bind="log.rows.${i}.name" value="${esc(r.name)}" placeholder="Product name"></div>
          <div class="field"><label for="lr${i}u">Sold</label><input type="text" inputmode="numeric" id="lr${i}u" data-bind="log.rows.${i}.units" value="${esc(r.units)}" placeholder="12"></div>
          <div class="field"><label for="lr${i}r">Sales $</label><input type="text" inputmode="decimal" id="lr${i}r" data-bind="log.rows.${i}.revenue" value="${esc(r.revenue)}" placeholder="opt."></div>
          ${L.rows.length > 1 ? `<button class="x" data-rmrow="${i}" aria-label="Remove row">×</button>` : `<span></span>`}
        </div>`).join("")}
        <button class="btn ghost small" data-act="addrow">+ Add product</button>
        <p class="note">Find these in TikTok Shop → Creator Center → Analytics. Units sold matters most; sales $ is optional.</p>
        ${errBox()}
        <button class="btn" data-act="savelog">Save</button>
        ${S.sales[L.orig] ? `<button class="btn plain" data-act="dellog">Delete this day</button>` : ""}
      </div></section></div>`;
  }
  function openLog(date) {
    const doc = S.sales[date];
    S.log = { date, orig: date, rows: doc ? clone(arr(doc.rows)).map((r) => ({ name: r.name || "", units: r.units ?? "", revenue: r.revenue ?? "" })) : [blankRow(), blankRow(), blankRow()] };
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
  function scriptText(s, p) {
    const f = FW[s.framework], L = [];
    L.push(`${s.title || f?.name || "Script"}${p?.name ? ` · ${p.name}` : ""}`, f ? `Framework: ${f.name}` : "", "");
    L.push("HOOK"); if (s.hook?.say) L.push(`Say: "${s.hook.say}"`); if (s.hook?.onScreen) L.push(`On screen: ${s.hook.onScreen}`); if (s.hook?.visual) L.push(`Show: ${s.hook.visual}`); L.push("");
    for (const b of arr(s.beats)) { L.push(b.time || ""); if (b.say) L.push(`Say: "${b.say}"`); if (b.show) L.push(`Show: ${b.show}`); if (b.text) L.push(`On screen: ${b.text}`); L.push(""); }
    if (s.cta) L.push(`CTA: ${s.cta}`, "");
    if (s.caption) L.push(`Caption: ${s.caption}${arr(s.hashtags).length ? " " + arr(s.hashtags).map((h) => (String(h).startsWith("#") ? h : "#" + h)).join(" ") : ""}`);
    return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function scriptCard(s, i, ctx) {
    const f = FW[s.framework], open = ctx.kind === "saved" || S.open[i];
    const key = ctx.kind === "saved" ? ctx.id : i;
    const head = `<div class="shead"><span class="chip acc">${esc(f?.name || "Script")}</span>${ctx.kind === "result" ? `<span class="meta">Script ${i + 1}</span>` : ""}</div>
      <h2>${esc(s.title || f?.name)}</h2>
      <p class="quote hookline">“${esc(s.hook?.say || s.hook?.onScreen)}”</p>`;
    if (!open) return `<button class="card scard closed" data-open="${i}">${head}<span class="note">Tap to see the full script</span></button>`;
    const isSaved = ctx.kind === "result" && s.savedId && S.saved[s.savedId];
    return `<div class="card scard">
      ${ctx.kind === "result" ? `<button class="sclose" data-close="${i}" aria-label="Collapse">${head}</button>` : head}
      ${s.why ? `<p class="why">${esc(s.why)}</p>` : ""}
      <div class="hookbox"><span class="label">Hook · first second</span>
        ${s.hook?.say ? `<span class="step ink"><b>Say</b><span class="say">${esc(s.hook.say)}</span></span>` : ""}
        ${s.hook?.onScreen ? `<span class="step ink"><b>On screen</b><span>${esc(s.hook.onScreen)}</span></span>` : ""}
        ${s.hook?.visual ? `<span class="step"><b>Show</b><span>${esc(s.hook.visual)}</span></span>` : ""}</div>
      <div class="beats">${arr(s.beats).map((b) => `<div class="scene"><span class="tc">${esc(b.time)}</span><div class="body">
        ${b.say ? `<span class="say">“${esc(b.say)}”</span>` : ""}
        ${b.show ? `<span class="step"><b>Show</b><span>${esc(b.show)}</span></span>` : ""}
        ${b.text ? `<span class="step"><b>On screen</b><span>${esc(b.text)}</span></span>` : ""}</div></div>`).join("")}</div>
      ${s.cta ? `<div><span class="label">Call to action</span><p class="ctaline">${esc(s.cta)}</p></div>` : ""}
      ${s.caption ? `<div><span class="label">Caption</span><p>${esc(s.caption)} <span class="meta">${arr(s.hashtags).map((h) => esc(String(h).startsWith("#") ? h : "#" + h)).join(" ")}</span></p></div>` : ""}
      ${arr(s.filmTips).length || s.watchOut ? `<div class="coachbox"><span class="label">Evee’s coaching</span>
        ${arr(s.filmTips).length ? `<ul class="ul">${arr(s.filmTips).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${s.watchOut ? `<p class="flag"><b>Watch out:</b> ${esc(s.watchOut)}</p>` : ""}</div>` : ""}
      <div class="btns">
        <button class="btn ghost small" data-copy="${ctx.kind}:${key}">Copy script</button>
        ${ctx.kind === "result" ? (isSaved ? `<button class="btn ghost small" disabled>Saved ✓</button>` : `<button class="btn small" data-save="${i}">Save</button>`) : ""}
        ${busyIs("remix" + key) ? "" : `<button class="btn ghost small" data-remix="${ctx.kind}:${key}">New version</button>`}
      </div>
      ${busyIs("remix" + key) ? busyCard() : ""}
    </div>`;
  }

  /* ================= CREATE ================= */
  function create() {
    const p = S.product, o = S.opts, r = S.result, forced = FW[o.framework];
    const recent = S.products.filter((x) => x.name && norm(x.name) !== norm(p.name)).slice(0, 6);
    return `<div class="fade">
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

  /* ================= SAVED ================= */
  const STATUS = { idea: "To film", filmed: "Filmed", posted: "Posted" };
  function saved() {
    const all = Object.values(S.saved).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const list = all.filter((d) => !S.filter || (d.status || "idea") === S.filter);
    return `<div class="fade"><h1>Saved</h1><p class="date">${all.length} ${all.length === 1 ? "script" : "scripts"}</p>
      ${all.length ? `<div class="opts" style="margin-top:14px"><button class="opt" aria-pressed="${!S.filter}" data-filter="">All</button>${Object.entries(STATUS).map(([k, l]) => `<button class="opt" aria-pressed="${S.filter === k}" data-filter="${k}">${l}</button>`).join("")}</div>` : ""}
      <section>${!all.length ? `<div class="card empty">Scripts you save show up here, ready to film.<br><br><button class="btn" data-go="create">Write scripts</button></div>`
        : !list.length ? `<div class="card empty">Nothing here yet.</div>`
        : `<div class="list">${list.map((d) => `<button class="row two" data-saved="${d.id}"><span class="name">${esc(d.script?.title || FW[d.script?.framework]?.name)}<div class="meta">${esc(d.product?.name)} · ${esc(FW[d.script?.framework]?.name || "")} · ${shortDay(d.createdAt)}</div></span><span class="num"><span class="chip ${d.status || "idea"}">${STATUS[d.status || "idea"]}</span></span></button>`).join("")}</div>`}</section>
    </div>`;
  }
  function savedView(id) {
    const d = S.saved[id];
    if (!d) return `<div class="fade"><button class="back" data-act="back">← Back</button><p class="empty">That script isn’t here anymore.</p></div>`;
    return `<div class="fade"><button class="back" data-act="back">← Saved</button>
      <p class="date">${esc(d.product?.name)}${d.product?.price ? ` · ${esc(d.product.price)}` : ""}</p>
      <div class="opts" style="margin-top:10px">${Object.entries(STATUS).map(([k, l]) => `<button class="opt" aria-pressed="${(d.status || "idea") === k}" data-status="${k}">${l}</button>`).join("")}</div>
      <section>${scriptCard(d.script, 0, { kind: "saved", id })}${errBox()}</section>
      <section>${S.confirmDel ? `<div class="card"><p>Delete this script for good?</p><div class="btns"><button class="btn" data-act="del">Delete</button><button class="btn ghost" data-act="canceldel">Keep it</button></div></div>` : `<button class="btn plain" data-act="askdel">Delete script</button>`}</section>
    </div>`;
  }

  /* ================= FRAMEWORKS ================= */
  function frameworks() {
    return `<div class="fade"><h1>Viral frameworks</h1>
      <p class="lede">The ${FRAMEWORKS.length} structures Evee writes with. She picks the best ones for your product, or you can choose one.</p>
      <section>${FRAMEWORKS.map((f) => `<details class="card fw"><summary><span><b>${esc(f.name)}</b><span class="note">${esc(f.oneLiner)}</span></span></summary>
        <p class="note"><b>Best for:</b> ${esc(f.bestFor)}</p>
        <ol class="ul">${f.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
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
  on("click", (e) => {
    if (!root.contains(e.target)) return;
    const el = e.target.closest("[data-go],[data-act],[data-style],[data-length],[data-open],[data-close],[data-save],[data-copy],[data-remix],[data-recent],[data-saved],[data-status],[data-filter],[data-usefw],[data-log],[data-rmrow],[data-write]");
    if (!el) return; const d = el.dataset;
    if (d.go !== undefined) { if (d.go === "you") push("you"); else go(d.go); return; }
    if (d.log) { openLog(d.log); return; }
    if (d.rmrow !== undefined) { S.log.rows.splice(+d.rmrow, 1); render(true); return; }
    if (d.write) { writeFor(d.write); return; }
    if (d.style) { S.opts.style = d.style; render(true); return; }
    if (d.length) { S.opts.length = d.length; render(true); return; }
    if (d.open !== undefined) { S.open[d.open] = true; render(true); return; }
    if (d.close !== undefined) { S.open[d.close] = false; render(true); return; }
    if (d.recent) { const x = S.products.find((p) => p.name === d.recent); if (x) { S.product = { ...blankProduct(), ...x }; render(true); } return; }
    if (d.saved) { push("k:" + d.saved); return; }
    if (d.filter !== undefined) { S.filter = d.filter; render(true); return; }
    if (d.usefw) { S.opts.framework = d.usefw; go("create"); toast(`Using ${FW[d.usefw].name}. Add your product.`); return; }
    if (d.status) { const id = stack[stack.length - 1].slice(2), doc = S.saved[id]; if (doc) { doc.status = d.status; persist("k-" + id, doc, "the status"); render(true); } return; }
    if (d.save !== undefined) {
      const s = S.result?.scripts[+d.save]; if (!s) return;
      const id = uid(); const sc = clone(s); delete sc.savedId;
      const doc = { id, product: clone(S.result.product), opts: clone(S.result.opts), script: sc, status: "idea", createdAt: new Date().toISOString() };
      S.saved[id] = doc; s.savedId = id; persist("k-" + id, doc, "that script"); persist("last", S.result, "your scripts"); toast("Saved"); render(true); return;
    }
    if (d.copy) { const [kind, k] = d.copy.split(":"); const doc = kind === "saved" ? S.saved[k] : null; const s = doc ? doc.script : S.result?.scripts[+k]; if (s) copy(scriptText(s, doc ? doc.product : S.result.product)); return; }
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
      case "unforce": S.opts.framework = ""; render(true); break;
      case "addrow": S.log.rows.push(blankRow()); render(true); root.querySelector(`#lr${S.log.rows.length - 1}n`)?.focus(); break;
      case "savelog": saveLog(); break;
      case "dellog": { const dt = S.log.orig; delDoc("sales-" + dt).then(() => { delete S.sales[dt]; S.log = null; go("today"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); break; }
      case "askdel": S.confirmDel = true; render(true); break;
      case "canceldel": S.confirmDel = false; render(true); break;
      case "del": { const id = stack[stack.length - 1].slice(2); delDoc("k-" + id).then(() => { delete S.saved[id]; if (S.result) for (const s of S.result.scripts) if (s.savedId === id) delete s.savedId; go("saved"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); break; }
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
