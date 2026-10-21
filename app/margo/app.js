// Margo's app screens. Plain DOM rendering, mounted by MargoMount.tsx.
// Data: Supabase "docs" table (private per tester). AI: /api/ai (prompts live on the server).
import { FORMATS, FRAMEWORKS, FW, DUR, CATS, PRODUCT_FIELDS, PROFILE_FIELDS, PERF_FIELDS, METRICS, DEFAULT_VIBE, metrics, num } from "@/lib/library";

export function mount(root, { supabase, email }) {
  const listeners = new AbortController();
  const on = (type, fn) => document.addEventListener(type, fn, { signal: listeners.signal });

  root.innerHTML = `
  <div class="app">
    <header class="top"><div class="brand">Margo<span>.</span></div><div class="pill" id="status">Beta</div></header>
    <main id="view"></main>
  </div>
  <div class="toast" id="toast" role="status" hidden></div>
  <nav class="tabs" aria-label="Main">
    <button class="tab" data-go="today"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Today</button>
    <button class="tab" data-go="studio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Studio</button>
    <button class="tab" data-go="scripts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>Scripts</button>
    <button class="tab" data-go="tracker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>Results</button>
    <button class="tab" data-go="you"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>You</button>
  </nav>`;
  const view = root.querySelector("#view");
  const statusEl = root.querySelector("#status");

  /* ================= helpers ================= */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDay = (k) => { const [y, m, d] = String(k).split("-").map(Number); if (!y) return ""; return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); };
  const shortDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const money = (n) => (typeof n === "number" && isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—");
  const numOr = (n) => (typeof n === "number" && isFinite(n) ? n.toLocaleString() : "—");
  const arr = (a) => (Array.isArray(a) ? a : []);
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const uidStr = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function setPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; } o[ks[ks.length - 1]] = val; }
  let toastT;
  function toast(msg) { const t = root.querySelector("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }
  function copy(text) { try { navigator.clipboard.writeText(text).then(() => toast("Copied"), () => toast("Couldn’t copy. Press and hold the text to copy it.")); } catch { toast("Couldn’t copy. Press and hold the text to copy it."); } }
  const blankProduct = () => Object.fromEntries(PRODUCT_FIELDS.map((f) => [f.k, ""]));
  const blankCreator = () => ({ vibe: DEFAULT_VIBE, niche: "", audience: "", phrases: "", vocab: "", humor: "", avoid: "" });
  const isSilent = (c) => /music \+ on-screen/i.test(c?.format || "") || c?.framework === "G";

  /* ================= state ================= */
  let ready = false;
  let stack = ["today"];
  const S = {
    err: "", busy: null,
    profile: { name: "", creator: blankCreator() },
    briefs: {}, files: [], draftNote: "", redo: false,
    studio: { step: "product", paste: "", extracted: false, product: blankProduct(), opts: { formats: [], frameworks: [], duration: "15-30", mode: "concepts", count: 3 }, concepts: [] },
    ctab: "hooks", editing: false, confirmDel: false,
    scripts: {}, q: "", fStatus: "", fFw: "",
    perfDraft: {}, cmp: { dur: "", fmt: "", fw: "", sort: "rpm" }, advice: "",
  };

  /* ================= data (Supabase "docs" table) ================= */
  let userId = null;
  async function putDoc(id, data) {
    const { error } = await supabase.from("docs").upsert({ user_id: userId, id, data, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  async function delDoc(id) { const { error } = await supabase.from("docs").delete().eq("id", id); if (error) throw error; }
  function savedFail(what) { statusEl.textContent = "Not saved"; statusEl.className = "pill warn"; toast(`Couldn’t save ${what}. Check your connection.`); }
  function savedOk() { if (statusEl.textContent === "Not saved") { statusEl.textContent = "Beta"; statusEl.className = "pill"; } }

  let draftT = null;
  function saveDraft() { clearTimeout(draftT); draftT = setTimeout(() => { const s = S.studio; putDoc("studio", clone({ step: s.step, paste: s.paste, extracted: s.extracted, product: s.product, opts: s.opts, concepts: s.concepts })).then(savedOk, () => savedFail("your Studio draft")); }, 700); }
  async function saveScript(doc) { doc.updatedAt = new Date().toISOString(); S.scripts[doc.id] = doc; try { await putDoc("s-" + doc.id, clone(doc)); savedOk(); } catch { savedFail("that script"); } }
  async function saveProfile() { try { await putDoc("profile", clone(S.profile)); savedOk(); return true; } catch { savedFail("your profile"); return false; } }

  async function load(first) {
    const { data, error } = await supabase.from("docs").select("id,data").order("updated_at", { ascending: false }).limit(1000);
    if (error) { statusEl.textContent = "Offline"; statusEl.className = "pill warn"; ready = true; render(true); return; }
    const briefs = {}, scripts = {};
    for (const row of data || []) {
      const v = row.data || {};
      if (row.id === "profile") { if (first) S.profile = { name: String(v.name || ""), creator: { ...blankCreator(), ...(v.creator || {}) } }; }
      else if (row.id === "studio") { if (first) S.studio = { ...S.studio, ...v, product: { ...blankProduct(), ...(v.product || {}) }, opts: { ...S.studio.opts, ...(v.opts || {}) }, concepts: arr(v.concepts) }; }
      else if (row.id.startsWith("b-")) briefs[row.id.slice(2)] = v;
      else if (row.id.startsWith("s-")) scripts[row.id.slice(2)] = v;
    }
    const h = holder(), editingId = h?.kind === "saved" ? h.id : null;
    if (editingId && S.scripts[editingId]) scripts[editingId] = S.scripts[editingId];
    S.briefs = briefs; S.scripts = scripts; ready = true;
    if (!S.busy && !document.activeElement?.matches("input,textarea,select")) render(true);
  }

  /* ================= Margo (server AI) ================= */
  const ERR = {
    unauthorized: "You’ve been signed out. Reload to sign in again.",
    rate_limited: null, // server sends the exact message
    too_large: "That’s too much at once. Use fewer screenshots or shorten what you pasted.",
    invalid_json: "Margo’s answer came back garbled. Try again.",
    offline: "You’re offline. Margo needs a connection.",
  };
  async function callAI(action, data, signal) {
    let r;
    try { r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, data }), signal }); }
    catch (e) { if (e?.name === "AbortError") throw { code: "cancelled" }; throw { code: "offline" }; }
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok) throw { code: j?.code || (r.status === 401 ? "unauthorized" : r.status === 413 ? "too_large" : "upstream_error"), message: j?.message };
    return j?.result;
  }
  async function ask(what, label, action, data) {
    if (S.busy) { toast("Margo is still working on the last request."); return null; }
    const ctl = new AbortController(); S.busy = { what, label, ctl }; S.err = ""; render(true);
    try { return await callAI(action, data, ctl.signal); }
    catch (e) { if (e?.code !== "cancelled") S.err = ERR[e?.code] || e?.message || "Something went wrong. Try again."; return null; }
    finally { S.busy = null; render(true); }
  }
  const busyIs = (w) => S.busy && S.busy.what === w;
  const busyCard = () => `<div class="card"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div><div><b>${esc(S.busy.label)}</b><p class="note">This usually takes under a minute.</p></div></div><button class="btn plain" data-act="stop">Stop</button></div>`;
  const errBox = () => (S.err ? `<p class="err">${esc(S.err)}</p>` : "");

  // Shrinks a screenshot to at most 1568px on the long side as JPEG, so uploads stay small.
  async function prepImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const scale = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.85).split(",")[1];
      return { media_type: "image/jpeg", data };
    } finally { URL.revokeObjectURL(url); }
  }

  /* ================= routing ================= */
  function go(r) { stack = [r]; S.editing = false; S.confirmDel = false; S.err = ""; render(); }
  function push(r) { stack.push(r); S.editing = false; S.confirmDel = false; S.err = ""; render(); }
  function back() { stack.pop(); if (!stack.length) stack = ["today"]; S.editing = false; S.confirmDel = false; S.err = ""; render(); }
  function holder() {
    const cur = stack[stack.length - 1];
    if (cur.startsWith("c:")) { const i = +cur.slice(2), c = S.studio.concepts[i]; return c ? { kind: "draft", i, concept: c, product: S.studio.product, opts: S.studio.opts } : null; }
    if (cur.startsWith("s:")) { const d = S.scripts[cur.slice(2)]; return d ? { kind: "saved", id: d.id, doc: d, concept: d.concept, product: d.product, opts: d.opts } : null; }
    return null;
  }
  function persist(h) { if (!h) return; if (h.kind === "draft") saveDraft(); else saveScript(h.doc); }

  function render(keep) {
    const y = window.scrollY, cur = stack[stack.length - 1];
    let html;
    if (cur.startsWith("p:")) html = product(cur.slice(2));
    else if (cur.startsWith("b:")) html = briefView(S.briefs[cur.slice(2)] || {}, cur.slice(2), false);
    else if (cur.startsWith("c:") || cur.startsWith("s:")) html = conceptView();
    else if (cur.startsWith("m:")) html = perfView(cur.slice(2));
    else html = ({ today, plan, history, studio, scripts, tracker, you, profile: profileView, frameworks }[cur] || today)();
    view.innerHTML = html;
    const tabKey = { plan: "today", history: "you", profile: "you", frameworks: "you" }[stack[0]] || stack[0];
    root.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.go === tabKey ? "page" : "false"));
    window.scrollTo(0, keep ? y : 0);
    bindDrop();
  }

  /* ================= TODAY: the morning brief ================= */
  const EXAMPLE = [{ name: "Mini cordless car vacuum", sold: 31, revenue: 899 }, { name: "Portable blender bottle", sold: 46, revenue: 1334 }, { name: "Tinted lip oil trio", sold: 18, revenue: 342 }];
  const MAX_SHOTS = 6;
  function greetName() { const h = new Date().getHours(); const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; return S.profile.name ? `${g}, ${esc(S.profile.name)}.` : `${g}.`; }
  function uploadCard() {
    if (busyIs("brief")) return busyCard();
    return `<div class="card">
      <h2>Send Margo yesterday’s numbers</h2>
      <p class="note">Screenshots straight from your TikTok Shop app work best. Add up to ${MAX_SHOTS}.</p>
      <ul class="tips"><li>Your affiliate orders or earnings for yesterday</li><li>Product performance (sold, revenue, views)</li><li>Analytics for your top videos, if you have them</li></ul>
      <label class="drop" id="drop">
        <input type="file" id="pick" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" multiple>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
        <b>${S.files.length ? "Add more screenshots" : "Choose screenshots"}</b>
        <span class="note">or drop them here</span>
      </label>
      ${S.files.length ? `<div class="thumbs">${S.files.map((f, i) => `<div class="thumb"><img src="${f.url}" alt="Screenshot ${i + 1}"><button data-rm="${i}" aria-label="Remove screenshot ${i + 1}">×</button></div>`).join("")}</div>` : ""}
      ${S.profile.name ? "" : `<div class="field"><label for="nm">What should Margo call you?</label><input type="text" id="nm" data-bind="S:profile.name" autocomplete="given-name" placeholder="Your first name"></div>`}
      <div class="field"><label for="note">Anything Margo should know? <span class="meta">(optional)</span></label>
        <textarea id="note" data-bind="S:draftNote" placeholder="Posted 3 vacuum videos yesterday. Lip oil restocks Friday.">${esc(S.draftNote)}</textarea></div>
      ${errBox()}
      <button class="btn" data-act="write" ${S.files.length ? "" : "disabled"}>Write my brief</button>
      ${S.redo ? `<button class="btn plain" data-act="cancelredo">Keep today’s brief</button>` : ""}
    </div>`;
  }
  const tagLabel = (t) => (t === "fix" ? "Fix the pitch" : t === "quiet" ? "Gone quiet" : "On a streak");
  function briefView(b, key, isToday) {
    const bs = arr(b.bestSellers), rt = arr(b.retarget), t = b.totals || {};
    const ch = typeof t.ordersChange === "number" ? `<span class="${t.ordersChange >= 0 ? "up" : "down"}">${t.ordersChange >= 0 ? "+" : ""}${Math.round(t.ordersChange)}%</span>` : "";
    const ideas = arr(b.breakdowns).reduce((s, p) => s + arr(p.ideas).length, 0);
    return `<div class="fade">
      ${isToday ? "" : `<button class="back" data-act="back">← Back</button>`}
      <p class="date">${fmtDay(key)}</p>
      <h1>${isToday ? greetName() : "Your brief"}</h1>
      <p class="lede">${esc(b.headline)}</p>
      <div class="stats">
        <div class="stat"><b>${money(t.revenue)}</b><span>Revenue</span></div>
        <div class="stat"><b>${numOr(t.orders)}</b><span>Orders ${ch}</span></div>
        <div class="stat"><b>${rt.length}</b><span>To retarget</span></div>
      </div>
      ${bs.length ? `<section><div class="sechead"><h2>Yesterday’s best sellers</h2><small>by revenue</small></div>
        <div class="list">${bs.map((p, i) => { const bi = arr(b.breakdowns).findIndex((x) => x.name === p.name); return `
          <button class="row" ${bi >= 0 ? `data-p="${key}|${bi}"` : `tabindex="-1"`}><span class="rank">${i + 1}</span>
            <span class="name">${esc(p.name)}<div class="meta">${numOr(p.sold)} sold</div></span>
            <span class="num">${money(p.revenue)}${p.change === "up" ? `<small class="up">▲ up</small>` : p.change === "down" ? `<small class="down">▼ down</small>` : ""}</span></button>`; }).join("")}</div></section>` : ""}
      ${rt.length ? `<section><div class="sechead"><h2>Retarget today</h2><small>3–5 videos each</small></div>
        ${rt.map((r) => { const bi = arr(b.breakdowns).findIndex((x) => x.name === r.name); return `<div class="rt">
          <span class="chip ${["streak", "fix", "quiet"].includes(r.tag) ? r.tag : "streak"}">${tagLabel(r.tag)}</span>
          <h2>${esc(r.name)}</h2><p class="why">${esc(r.why)}</p>${r.stat ? `<p>${esc(r.stat)}</p>` : ""}
          ${bi >= 0 ? `<button class="btn" data-p="${key}|${bi}">See the breakdown and videos</button>` : ""}</div>`; }).join("")}
      </section>` : ""}
      ${isToday && ideas ? `<section><button class="btn ghost" data-go="plan">Today’s video plan (${ideas} videos)</button></section>` : ""}
      ${b.couldntRead ? `<section><p class="note"><b>Margo couldn’t read:</b> ${esc(b.couldntRead)}</p></section>` : ""}
      ${isToday ? `<section><button class="btn plain" data-act="redo">Redo today’s brief with new screenshots</button></section>` : ""}
    </div>`;
  }
  function studioTeaser() { const n = Object.keys(S.scripts).length; return `<section><div class="card"><h2>Need scripts for a product?</h2>
    <p class="note">Studio turns any product into ready-to-film concepts, hooks and shot-by-shot scripts.${n ? ` You have ${n} saved.` : ""}</p>
    <button class="btn ghost" data-go="studio">Open Studio</button></div></section>`; }
  function today() {
    const key = dayKey(), b = S.briefs[key];
    if (b && !S.redo) return briefView(b, key, true) + studioTeaser();
    return `<div class="fade">
      <p class="date">${fmtDay(key)}</p><h1>${greetName()}</h1>
      <p class="lede">${S.redo ? "Send new screenshots and Margo will rewrite today’s brief." : "Show Margo how yesterday went and she’ll tell you what to post today."}</p>
      <section>${uploadCard()}</section>
      ${!Object.keys(S.briefs).length && ready ? `<section class="example">
        <div class="sechead"><h2>What you’ll get</h2><span class="pill warn">Example</span></div>
        <div class="list">${EXAMPLE.map((p, i) => `<div class="row" style="cursor:default"><span class="rank">${i + 1}</span><span class="name">${p.name}<div class="meta">${p.sold} sold</div></span><span class="num">${money(p.revenue)}</span></div>`).join("")}</div>
        <p class="note">Then a retarget list, the hook behind your best video, and 3–5 problem → solution video ideas for each product.</p></section>` : ""}
      ${studioTeaser()}
    </div>`;
  }
  function ideaBody(t) { return `<span class="vt">“${esc(t.hook)}”</span><span class="step"><b>Solve it</b><span>${esc(t.fix)}</span></span><span class="step"><b>Prove it</b><span>${esc(t.proof)}</span></span>`; }
  function ideaList(key, bi, ideas) { const done = S.briefs[key]?.done || {}; return ideas.map((t, i) => { const k = `${bi}-${i}`; return `<div class="vid ${done[k] ? "done" : ""}">
    <input type="checkbox" id="v-${key}-${k}" data-done="${key}|${k}" ${done[k] ? "checked" : ""}><label for="v-${key}-${k}"><span class="meta">Video ${i + 1}</span>${ideaBody(t)}</label></div>`; }).join(""); }
  function product(ref) {
    const [key, bi] = ref.split("|"), b = S.briefs[key], p = arr(b?.breakdowns)[+bi];
    if (!p) return `<div class="fade"><button class="back" data-act="back">← Back</button><p class="empty">That product isn’t in this brief anymore.</p></div>`;
    const r = arr(b.retarget).find((x) => x.name === p.name);
    return `<div class="fade"><button class="back" data-act="back">← Back</button>
      ${r ? `<span class="chip ${r.tag}">${tagLabel(r.tag)}</span>` : ""}<h1>${esc(p.name)}</h1>${r?.why ? `<p class="date">${esc(r.why)}</p>` : ""}
      <section><h2>What’s converting</h2><div class="card kv">
        <div><span class="label">The hook</span><p class="quote">${esc(p.hook)}</p></div>
        <div><span class="label">The selling point</span><p>${esc(p.sell)}</p></div>
        <div><span class="label">The close</span><p>${esc(p.close)}</p></div>
        <div><span class="label">The pattern</span><p><b>${esc(p.pattern)}</b></p></div></div></section>
      ${arr(p.ideas).length ? `<section><div class="sechead"><h2>Your next ${arr(p.ideas).length} videos</h2><small>problem → solution</small></div><div class="card">${ideaList(key, bi, arr(p.ideas))}</div></section>` : ""}
      <section><button class="btn ghost" data-tostudio="${key}|${bi}">Write full scripts for this in Studio</button></section>
    </div>`;
  }
  function plan() {
    const key = dayKey(), b = S.briefs[key];
    const prods = arr(b?.breakdowns).map((p, bi) => ({ p, bi })).filter((x) => arr(x.p.ideas).length);
    const total = prods.reduce((s, x) => s + x.p.ideas.length, 0), fin = Object.values(b?.done || {}).filter(Boolean).length;
    return `<div class="fade"><button class="back" data-go="today">← Today</button><h1>Video plan</h1>
      <p class="date">${total ? `${fin} of ${total} videos filmed today` : "Nothing planned yet today"}</p>
      ${total ? prods.map(({ p, bi }) => `<section><h2>${esc(p.name)}</h2><div class="card">${ideaList(key, bi, p.ideas)}</div></section>`).join("")
        : `<section><div class="card empty">Send Margo yesterday’s screenshots and today’s video ideas land here as a checklist.</div></section>`}</div>`;
  }
  function history() {
    const keys = Object.keys(S.briefs).sort().reverse();
    return `<div class="fade"><button class="back" data-go="you">← You</button><h1>Past briefs</h1>
      <p class="date">${keys.length ? `${keys.length} brief${keys.length > 1 ? "s" : ""} saved` : "No briefs yet"}</p>
      <section>${keys.length ? `<div class="list">${keys.map((k) => { const b = S.briefs[k]; return `<button class="row two" data-b="${k}">
        <span class="name">${fmtDay(k)}<div class="meta">${esc(arr(b.bestSellers)[0]?.name ? `Top seller: ${arr(b.bestSellers)[0].name}` : b.headline || "")}</div></span>
        <span class="num">${money(b.totals?.revenue)}</span></button>`; }).join("")}</div>`
        : `<div class="card empty">Each morning’s brief is saved here so Margo can spot streaks and products that went quiet.</div>`}</section></div>`;
  }
  async function writeBrief() {
    if (S.profile.name.trim()) saveProfile();
    let images;
    try { images = await Promise.all(S.files.map((f) => prepImage(f.file))); }
    catch { S.err = "One of the screenshots couldn’t be opened. Remove it and try a PNG or JPEG."; render(true); return; }
    const out = await ask("brief", "Margo is reading your screenshots", "brief", { images, note: S.draftNote.trim(), today: dayKey() });
    if (!out) return;
    const b = { headline: String(out.headline || "Here’s how yesterday went."), totals: out.totals && typeof out.totals === "object" ? out.totals : {},
      bestSellers: arr(out.bestSellers).slice(0, 5), retarget: arr(out.retarget).slice(0, 3),
      breakdowns: arr(out.breakdowns).map((p) => ({ ...p, ideas: arr(p.ideas).slice(0, 5) })), couldntRead: out.couldntRead || null,
      note: S.draftNote.trim() || null, done: {}, createdAt: new Date().toISOString() };
    const key = dayKey(); S.briefs[key] = b; S.redo = false;
    S.files.forEach((f) => URL.revokeObjectURL(f.url)); S.files = []; S.draftNote = "";
    go("today");
    try { await putDoc("b-" + key, b); savedOk(); } catch { savedFail("today’s brief"); }
  }
  function addFiles(list) {
    let skipped = 0;
    for (const f of list) { if (!/^image\//.test(f.type) || S.files.length >= MAX_SHOTS) { skipped++; continue; } S.files.push({ file: f, url: URL.createObjectURL(f) }); }
    S.err = skipped ? `Margo can take ${MAX_SHOTS} screenshots at a time. ${skipped} ${skipped > 1 ? "weren’t" : "wasn’t"} added.` : "";
    render(true);
  }
  function bindDrop() {
    const pick = root.querySelector("#pick"), drop = root.querySelector("#drop");
    if (pick) pick.onchange = () => addFiles([...pick.files]);
    if (drop) { drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); }; drop.ondragleave = () => drop.classList.remove("over");
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles([...e.dataTransfer.files]); }; }
  }
  let doneT = null;
  function toggleDone(ref, val) { const [key, k] = ref.split("|"), b = S.briefs[key]; if (!b) return; b.done = { ...(b.done || {}), [k]: val };
    clearTimeout(doneT); doneT = setTimeout(() => putDoc("b-" + key, clone(b)).then(savedOk, () => savedFail("your checklist")), 600); }

  /* ================= STUDIO ================= */
  function stepper(n) { return `<div class="stepper">${["Product", "Format", "Concepts"].map((l, i) => `<span class="${i <= n ? "on" : ""}">${i + 1} · ${l}</span>`).join("")}</div>`; }
  function fieldHtml(f, val, bindRoot) {
    const id = "f-" + bindRoot.replace(/[^a-z]/gi, "") + "-" + f.k, bind = `S:${bindRoot}.${f.k}`;
    let ctl;
    if (f.sel) ctl = `<select id="${id}" data-bind="${bind}"><option value="">Choose a category</option>${CATS.map((c) => `<option ${c.k === val ? "selected" : ""}>${esc(c.k)}</option>`).join("")}</select>`;
    else if (f.ta) ctl = `<textarea id="${id}" data-bind="${bind}">${esc(val)}</textarea>`;
    else ctl = `<input type="text" id="${id}" data-bind="${bind}" value="${esc(val)}">`;
    return `<div class="field"><label for="${id}">${esc(f.l)}${f.h ? ` <span class="hint">· ${esc(f.h)}</span>` : ""}</label>${ctl}</div>`;
  }
  function studio() {
    const s = S.studio, p = s.product, o = s.opts;
    if (s.step === "setup") {
      const fmtAll = !o.formats.length, fwAll = !o.frameworks.length;
      return `<div class="fade"><button class="back" data-step="product">← Product</button>
        <h1>${esc(p.name)}</h1><p class="date">Pick how you’ll film it</p>${stepper(1)}
        <section><h2>Format</h2><p class="note">Pick one or more, or let Margo recommend.</p>
          <div class="opts"><button class="opt" aria-pressed="${fmtAll}" data-fmt="">Margo picks</button>
          ${FORMATS.map((f) => `<button class="opt" aria-pressed="${o.formats.includes(f)}" data-fmt="${esc(f)}">${esc(f)}</button>`).join("")}</div></section>
        <section><div class="sechead"><h2>Framework</h2><button class="btn plain" data-go="frameworks">See the library</button></div>
          <div class="opts"><button class="opt" aria-pressed="${fwAll}" data-fw="">Margo picks</button>
          ${FRAMEWORKS.map((f) => `<button class="opt" aria-pressed="${o.frameworks.includes(f.id)}" data-fw="${f.id}"><b>${f.id}</b>${esc(f.name)}</button>`).join("")}</div></section>
        <section><h2>Length</h2><div class="seg">${Object.keys(DUR).map((d) => `<button aria-pressed="${o.duration === d}" data-dur="${d}">${d.replace("-", "–")} sec</button>`).join("")}</div></section>
        <section><h2>What to make</h2>
          <div class="seg"><button aria-pressed="${o.mode === "concepts"}" data-mode="concepts">Separate concepts</button><button aria-pressed="${o.mode === "series"}" data-mode="series">Connected series</button></div>
          <p class="note">${o.mode === "series" ? "A 2–3 part series: problem, then reveal and proof, then an objection or honest review. Each video still works on its own." : "Each concept takes a different angle on the product."}</p>
          <div class="seg">${(o.mode === "series" ? [2, 3] : [3, 4, 5]).map((n) => `<button aria-pressed="${o.count === n}" data-count="${n}">${n} ${o.mode === "series" ? "videos" : "concepts"}</button>`).join("")}</div></section>
        <section>${errBox()}${busyIs("concepts") ? busyCard() : `<button class="btn" data-act="gen">Write ${o.count} ${o.mode === "series" ? "connected videos" : "concepts"}</button>`}</section>
      </div>`;
    }
    if (s.step === "results" && s.concepts.length) {
      const fwLabel = (c) => (FW[c.framework] ? `${c.framework} · ${FW[c.framework].name}` : c.framework);
      return `<div class="fade"><button class="back" data-step="setup">← Setup</button>
        <h1>${esc(p.name)}</h1><p class="date">${s.concepts.length} ${o.mode === "series" ? "connected videos" : "concepts"} · ${o.duration.replace("-", "–")} sec</p>${stepper(2)}
        <section>${s.concepts.map((c, i) => { const h = arr(c.hooks)[0] || {}; return `<button class="concept" data-open="${i}">
          <div class="chips">${c.part ? `<span class="chip acc">Video ${esc(c.part)}</span>` : ""}<span class="chip">${esc(fwLabel(c))}</span><span class="chip">${esc(c.format)}</span>${c.savedId ? `<span class="chip posted">Saved</span>` : ""}${arr(c.timeline).length ? `<span class="chip filmed">Script ready</span>` : ""}</div>
          <h2>${esc(c.name)}</h2>
          <p class="note">${esc(c.difference)}</p>
          <p class="quote">“${esc(h.onScreen || h.spoken)}”</p></button>`; }).join("")}</section>
        <section>${errBox()}${busyIs("concepts") ? busyCard() : `<button class="btn ghost" data-act="gen">Write a fresh set</button>`}
          <button class="btn plain" data-act="newproduct">Start a new product</button></section>
      </div>`;
    }
    return `<div class="fade"><h1>Studio</h1><p class="lede">Turn any product into ready-to-film TikTok Shop scripts.</p>${stepper(0)}
      ${s.concepts.length ? `<section><button class="btn ghost" data-step="results">Back to your ${s.concepts.length} concepts for ${esc(p.name || "this product")}</button></section>` : ""}
      <section><div class="card">
        <h2>Paste what you have</h2>
        <p class="note">A product listing, brand brief or your own notes. Margo pulls out the details for you to check.</p>
        <div class="field"><label for="paste">Listing, brief or notes</label><textarea class="big" id="paste" data-bind="S:studio.paste" placeholder="Paste the TikTok Shop listing or the brand’s brief here…">${esc(s.paste)}</textarea></div>
        ${busyIs("extract") ? busyCard() : `<button class="btn ghost" data-act="extract">Pull out the details</button>`}
      </div></section>
      <section><div class="card">
        <div class="sechead"><h2>Product details</h2>${s.extracted ? `<span class="pill warn">Check these</span>` : ""}</div>
        <p class="note">Margo only states what’s here as fact. Anything else she suggests is labeled as an idea to test.</p>
        ${PRODUCT_FIELDS.map((f) => fieldHtml(f, p[f.k] || "", "studio.product")).join("")}
      </div></section>
      <section>${errBox()}<button class="btn" data-act="tosetup">Next: choose the format</button></section>
    </div>`;
  }
  async function extract() {
    const s = S.studio; if (!s.paste.trim()) { S.err = "Paste a listing, brief or notes first."; render(true); return; }
    const out = await ask("extract", "Margo is reading what you pasted", "extract", { text: s.paste });
    if (!out || typeof out !== "object") return;
    const p = s.product;
    for (const f of PRODUCT_FIELDS) { const v = out[f.k]; if (typeof v === "string" && v.trim() && !String(p[f.k] || "").trim()) p[f.k] = v.trim(); }
    if (p.category && !CATS.some((c) => c.k === p.category)) p.category = "Other";
    s.extracted = true; saveDraft(); render(true); toast("Details filled in. Check them before you go on.");
  }
  function normConcept(c) { const f = String(c.framework || "").trim().charAt(0).toUpperCase(); return { ...c, cid: uidStr(), hooks: arr(c.hooks).slice(0, 5), framework: FW[f] ? f : "B" }; }
  async function genConcepts() {
    const s = S.studio;
    const out = await ask("concepts", `Margo is writing your ${s.opts.mode === "series" ? "series" : "concepts"}`, "concepts", { product: s.product, opts: s.opts });
    if (!out) return;
    const list = arr(out.concepts).filter((c) => c && c.name);
    if (!list.length) { S.err = "Margo didn’t return any concepts. Try again."; render(true); return; }
    s.concepts = list.map(normConcept); s.step = "results"; saveDraft(); render();
  }

  /* ----- concept detail (draft or saved) ----- */
  const ed = () => S.editing;
  function fx(path, val, cls) { return ed() ? `<textarea class="edit" data-bind="C:${path}" aria-label="Edit">${esc(val)}</textarea>` : `<span class="${cls || ""}">${esc(val)}</span>`; }
  function listBlock(label, items) { const a = arr(items).filter(Boolean); return a.length ? `<div><span class="label">${label}</span><ul class="ul">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""; }
  function conceptView() {
    const h = holder(); if (!h) return `<div class="fade"><button class="back" data-act="back">← Back</button><p class="empty">This concept isn’t here anymore.</p></div>`;
    const c = h.concept, fw = FW[c.framework], hasScript = arr(c.timeline).length > 0, saved = h.kind === "saved" || c.savedId;
    const tabs = [["hooks", "Hooks"], ["script", "Script"], ["filming", "Filming"], ["caption", "Caption"]];
    let body = "";
    if (S.ctab === "hooks") {
      body = `<div class="card kv">
          <div><span class="label">Who it’s for</span><p>${esc(c.audience)}</p></div>
          <div><span class="label">Their problem or desire</span><p>${esc(c.problem)}</p></div>
          <div class="grid2"><div><span class="label">Emotional trigger</span><p>${esc(c.trigger)}</p></div><div><span class="label">Benefit shown</span><p>${esc(c.benefit)}</p></div></div>
          <div><span class="label">What viewers should do</span><p>${esc(c.action)}</p></div>
          <div><span class="label">First frame</span><p>${fx("firstFrame", c.firstFrame)}</p></div>
        </div>
        <div class="sechead"><h2>Hooks</h2><small>hypotheses to test</small></div>
        <div class="card">${arr(c.hooks).map((x, i) => `<div class="hook ${i === 0 ? "best" : ""}">
          <div class="top"><span class="chip ${i === 0 ? "acc" : ""}">${i === 0 ? "Recommended · " : ""}${esc(x.type)}</span>
            <span class="btns">${i ? `<button class="btn plain small" data-usehook="${i}">Use this one</button>` : ""}<button class="btn plain small" data-copyhook="${i}">Copy</button></span></div>
          ${x.spoken || ed() ? `<span class="step ink"><b>Say</b>${fx(`hooks.${i}.spoken`, x.spoken, "say")}</span>` : ""}
          <span class="step ink"><b>On screen</b>${fx(`hooks.${i}.onScreen`, x.onScreen)}</span>
          <span class="step"><b>Visual</b>${fx(`hooks.${i}.visual`, x.visual)}</span>
          <span class="step"><b>Trigger</b><span>${esc(x.trigger)}</span></span>
          <span class="step"><b>Why</b><span>${esc(x.why)}</span></span></div>`).join("")}</div>
        ${busyIs("hooks") ? busyCard() : `<button class="btn ghost" data-act="rehooks">Write 5 new hooks</button>`}`;
    } else if (!hasScript) {
      body = busyIs("script") ? busyCard() : `<div class="card"><h2>Write the full script</h2><p class="note">A shot-by-shot timeline, product proof, filming checklist, CTA and caption, checked against Margo’s 12-point quality check.</p><button class="btn" data-act="script">Write the full script</button></div>`;
    } else if (S.ctab === "script") {
      body = `${arr(c.qc).length ? `<div class="card"><span class="label">Needs your attention</span>${arr(c.qc).map((q) => `<p class="flag"><b>${esc(q.check)}</b> ${esc(q.note)}</p>`).join("")}</div>` : ""}
        <div class="card">${arr(c.timeline).map((sc, i) => `<div class="scene"><span class="tc">${esc(sc.start)}–${esc(sc.end)}s</span><div class="body">
          <span class="meta">${esc(sc.shot)}</span>
          <span>${fx(`timeline.${i}.action`, sc.action)}</span>
          ${sc.dialogue || (ed() && !isSilent(c)) ? `<span class="step ink"><b>Say</b>${fx(`timeline.${i}.dialogue`, sc.dialogue, "say")}</span>` : ""}
          ${sc.onScreen || ed() ? `<span class="step ink"><b>On screen</b>${fx(`timeline.${i}.onScreen`, sc.onScreen)}</span>` : ""}
          ${sc.product ? `<span class="step"><b>Product</b><span>${esc(sc.product)}</span></span>` : ""}
          ${sc.transition ? `<span class="step"><b>Edit</b><span>${esc(sc.transition)}</span></span>` : ""}
          ${sc.purpose ? `<span class="step"><b>Why</b><span>${esc(sc.purpose)}</span></span>` : ""}
          ${ed() ? "" : busyIs("scene" + i) ? busyCard() : `<button class="btn plain small" data-rescene="${i}" style="justify-self:start">Redo this scene</button>`}
        </div></div>`).join("")}</div>
        <div class="btns"><button class="btn ghost" data-act="copyscript">Copy script</button>${busyIs("timeline") ? "" : `<button class="btn ghost" data-act="retimeline">New timeline</button>`}</div>
        ${busyIs("timeline") ? busyCard() : ""}`;
    } else if (S.ctab === "filming") {
      const pr = c.proof || {}, ck = c.checklist || {};
      body = `<div class="card kv"><h2>Product proof</h2>
          <div><span class="label">Feature to show</span><p>${esc(pr.feature)}</p></div>
          <div><span class="label">How to show it</span><p>${esc(pr.how)}</p></div>
          ${listBlock("Verified claims you can make", pr.verified)}
          ${arr(pr.needsEvidence).filter(Boolean).length ? `<div class="flag">${listBlock("Don’t say these until you can back them up", pr.needsEvidence)}</div>` : ""}</div>
        <div class="card kv"><h2>Filming checklist</h2>
          ${listBlock("Props and wardrobe", ck.props)}${listBlock("Clips to capture", ck.clips)}${listBlock("Close-ups", ck.closeups)}${listBlock("Transitions", ck.transitions)}
          ${ck.rhythm ? `<div><span class="label">Editing rhythm</span><p>${esc(ck.rhythm)}</p></div>` : ""}
          ${listBlock("Before you post", ck.finalCheck)}</div>`;
    } else {
      const cv = c.conversion || {};
      body = `<div class="card kv">
          <div><span class="label">Call to action</span><p class="quote">${fx("conversion.cta", cv.cta)}</p></div>
          <div><span class="label">Caption</span><p>${fx("conversion.caption", cv.caption)}</p></div>
          ${arr(cv.keywords).length ? `<div><span class="label">Search keywords</span><div class="chips">${arr(cv.keywords).map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</div></div>` : ""}
          ${arr(cv.hashtags).length ? `<div><span class="label">Hashtags</span><p>${arr(cv.hashtags).map((t) => esc(String(t).startsWith("#") ? t : "#" + t)).join(" ")}</p></div>` : ""}
        </div>
        <div class="btns"><button class="btn ghost" data-act="copycaption">Copy caption</button>${busyIs("cta") ? "" : `<button class="btn ghost" data-act="recta">New CTA and caption</button>`}</div>
        ${busyIs("cta") ? busyCard() : ""}`;
    }
    const st = h.kind === "saved" ? h.doc.status || "idea" : null;
    return `<div class="fade"><button class="back" data-act="back">← Back</button>
      <div class="chips">${c.part ? `<span class="chip acc">Video ${esc(c.part)}</span>` : ""}<span class="chip">${fw ? `${fw.id} · ${esc(fw.name)}` : esc(c.framework)}</span><span class="chip">${esc(c.format)}</span><span class="chip">${esc((h.opts?.duration || "").replace("-", "–"))} sec</span></div>
      <h1>${ed() ? fx("name", c.name) : esc(c.name)}</h1>
      <p class="date">${esc(h.product?.name)}${c.angle ? ` · ${esc(c.angle)}` : ""}</p>
      ${c.difference ? `<p class="lede">${esc(c.difference)}</p>` : ""}
      <section>
        <div class="btns">
          ${ed() ? `<button class="btn" data-act="doneedit">Done editing</button>` : `
          ${h.kind === "draft" ? (saved ? `<button class="btn ghost" data-act="opensaved">Saved ✓ Open in Scripts</button>` : `<button class="btn" data-act="save">Save script</button>`) : ""}
          <button class="btn ghost" data-act="edit">Edit</button>
          <button class="btn ghost" data-act="dup">Duplicate</button>
          ${h.kind === "draft" ? `<button class="btn ghost" data-act="newangle">New angle</button>` : ""}
          <button class="btn ghost" data-act="export">Export</button>
          ${h.kind === "saved" ? `<button class="btn plain" data-act="askdel">Delete</button>` : ""}`}
        </div>
        ${S.confirmDel && h.kind === "saved" ? `<div class="card"><p>Delete this script and its results for good?</p><div class="btns"><button class="btn" data-act="del">Delete</button><button class="btn ghost" data-act="canceldel">Keep it</button></div></div>` : ""}
        ${busyIs("angle") ? busyCard() : ""}
        ${st ? `<div class="grid2"><div class="field"><label for="st">Status</label><select id="st" data-status="${h.id}">${["idea", "filmed", "posted"].map((x) => `<option value="${x}" ${st === x ? "selected" : ""}>${x[0].toUpperCase() + x.slice(1)}</option>`).join("")}</select></div>
          <div class="field"><span class="flabel">Results</span><button class="btn ghost" data-perf="${h.id}">${h.doc.perf && Object.values(h.doc.perf).some((v) => v !== "" && v != null) ? "Edit results" : "Add results"}</button></div></div>` : ""}
        ${errBox()}
      </section>
      <section><div class="seg">${tabs.map(([k, l]) => `<button aria-pressed="${S.ctab === k}" data-ctab="${k}">${l}</button>`).join("")}</div>${body}</section>
    </div>`;
  }
  function scriptText(h) {
    const c = h.concept, fw = FW[c.framework], cv = c.conversion || {}, pr = c.proof || {}, ck = c.checklist || {};
    const L = []; const li = (t, a) => { a = arr(a).filter(Boolean); if (a.length) { L.push(`**${t}**`); a.forEach((x) => L.push(`- ${x}`)); L.push(""); } };
    L.push(`# ${c.name}`, "", `${h.product?.name || ""} · ${fw ? fw.id + " " + fw.name : c.framework} · ${c.format} · ${(h.opts?.duration || "").replace("-", "–")} sec`, "");
    if (c.difference) L.push(c.difference, "");
    L.push("## Concept", `- Audience: ${c.audience || ""}`, `- Problem or desire: ${c.problem || ""}`, `- Trigger: ${c.trigger || ""}`, `- Benefit shown: ${c.benefit || ""}`, `- Viewer action: ${c.action || ""}`, `- First frame: ${c.firstFrame || ""}`, "");
    L.push("## Hooks (hypotheses to test)");
    arr(c.hooks).forEach((x, i) => { L.push(`${i + 1}. ${i === 0 ? "(Recommended) " : ""}${x.type || ""}`); if (x.spoken) L.push(`   - Say: ${x.spoken}`); L.push(`   - On screen: ${x.onScreen || ""}`, `   - Visual: ${x.visual || ""}`, `   - Why: ${x.why || ""}`); });
    L.push("");
    if (arr(c.timeline).length) {
      L.push("## Script");
      arr(c.timeline).forEach((s) => { L.push(`**${s.start}–${s.end}s · ${s.shot || ""}**`, s.action || ""); if (s.dialogue) L.push(`Say: "${s.dialogue}"`); if (s.onScreen) L.push(`On screen: ${s.onScreen}`); if (s.product) L.push(`Product: ${s.product}`); if (s.transition) L.push(`Edit: ${s.transition}`); L.push(""); });
      L.push("## Product proof", `- Feature: ${pr.feature || ""}`, `- How to show it: ${pr.how || ""}`, ""); li("Verified claims", pr.verified); li("Don’t say until backed up", pr.needsEvidence);
      L.push("## Filming checklist", ""); li("Props and wardrobe", ck.props); li("Clips", ck.clips); li("Close-ups", ck.closeups); li("Transitions", ck.transitions); if (ck.rhythm) L.push(`**Rhythm:** ${ck.rhythm}`, ""); li("Before you post", ck.finalCheck);
      L.push("## Caption", `CTA: ${cv.cta || ""}`, "", cv.caption || "", "", arr(cv.hashtags).map((t) => (String(t).startsWith("#") ? t : "#" + t)).join(" "));
      if (arr(cv.keywords).length) L.push("", `Keywords: ${arr(cv.keywords).join(", ")}`);
      if (arr(c.qc).length) { L.push("", "## Needs your attention"); arr(c.qc).forEach((q) => L.push(`- ${q.check}: ${q.note}`)); }
    }
    return L.join("\n");
  }
  const timelineText = (c) => arr(c.timeline).map((s) => `${s.start}–${s.end}s · ${s.shot || ""}\n${s.action || ""}${s.dialogue ? `\nSay: "${s.dialogue}"` : ""}${s.onScreen ? `\nOn screen: ${s.onScreen}` : ""}`).join("\n\n");
  const pieceData = (h, extra) => ({ product: h.product, opts: h.opts, concept: h.concept, ...extra });
  async function runPiece(what, label, action, extra, apply) {
    const h = holder(); if (!h) return; const key = h.concept.cid || h.id;
    const out = await ask(what, label, action, pieceData(h, extra));
    if (!out) return;
    const h2 = holder(); const target = h2 && (h2.concept.cid || h2.id) === key ? h2 : h;
    if (target !== h2) toast("Done. Open the concept to see it.");
    if (apply(target.concept, out) === false) { S.err = "Margo’s answer was missing a piece. Try again."; render(true); return; }
    persist(target); render(true);
  }
  async function exportDoc(h) {
    const text = scriptText(h), name = (h.concept.name || "script").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "script";
    const file = new File([text], `${name}.md`, { type: "text/markdown" });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: h.concept.name }); return; } } catch (e) { if (e?.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Exported");
  }
  function saveDraftConcept(h) {
    const id = uidStr(), now = new Date().toISOString();
    const c = clone(h.concept); delete c.savedId;
    const doc = { id, product: clone(h.product), opts: clone(h.opts), concept: c, status: "idea", perf: {}, createdAt: now, updatedAt: now };
    h.concept.savedId = id; saveScript(doc); saveDraft(); toast("Saved to Scripts"); render(true);
  }

  /* ================= SCRIPTS ================= */
  function scriptMatches(d) {
    if (S.fStatus && (d.status || "idea") !== S.fStatus) return false;
    if (S.fFw && d.concept?.framework !== S.fFw) return false;
    const q = S.q.trim().toLowerCase(); if (!q) return true;
    return [d.product?.name, d.concept?.name, d.concept?.format, d.concept?.angle, ...arr(d.concept?.hooks).map((x) => x.onScreen + " " + x.spoken)].join(" ").toLowerCase().includes(q);
  }
  function scriptRows() {
    const all = Object.values(S.scripts).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const list = all.filter(scriptMatches);
    if (!all.length) return `<div class="card empty">Scripts you save in Studio land here, ready to film, track and reuse.<br><br><button class="btn" data-go="studio">Open Studio</button></div>`;
    if (!list.length) return `<div class="card empty">No scripts match that search.</div>`;
    return `<div class="list">${list.map((d) => `<button class="row two" data-script="${d.id}">
      <span class="name">${esc(d.concept?.name)}<div class="meta">${esc(d.product?.name)} · ${esc(d.concept?.framework)} · ${esc(d.concept?.format)}</div></span>
      <span class="num"><span class="chip ${d.status || "idea"}">${esc((d.status || "idea").replace(/^./, (m) => m.toUpperCase()))}</span><small class="meta">${shortDay(d.updatedAt)}</small></span></button>`).join("")}</div>`;
  }
  function scripts() {
    return `<div class="fade"><h1>Scripts</h1><p class="date">${Object.keys(S.scripts).length} saved</p>
      <section>
        <div class="field"><label for="q">Search</label><input type="search" id="q" data-bind="S:q" value="${esc(S.q)}" placeholder="Product, concept or hook"></div>
        <div class="grid2">
          <div class="field"><label for="fs">Status</label><select id="fs" data-filter="fStatus"><option value="">All</option>${["idea", "filmed", "posted"].map((x) => `<option value="${x}" ${S.fStatus === x ? "selected" : ""}>${x[0].toUpperCase() + x.slice(1)}</option>`).join("")}</select></div>
          <div class="field"><label for="ff">Framework</label><select id="ff" data-filter="fFw"><option value="">All</option>${FRAMEWORKS.map((f) => `<option value="${f.id}" ${S.fFw === f.id ? "selected" : ""}>${f.id} · ${esc(f.name)}</option>`).join("")}</select></div>
        </div>
        <div id="scriptList">${scriptRows()}</div>
      </section></div>`;
  }

  /* ================= RESULTS TRACKER ================= */
  const fmtM = (m, v) => (v == null ? "—" : m.pct ? (v * 100).toFixed(v < 0.01 ? 2 : 1) + "%" : "$" + v.toFixed(2));
  const hasPerf = (d) => num(d.perf?.views) != null;
  const durBucket = (d) => { const s = num(d.perf?.duration); if (s == null) return d.opts?.duration || ""; return s <= 15 ? "7-15" : s <= 30 ? "15-30" : "30-60"; };
  function tracker() {
    const all = Object.values(S.scripts), posted = all.filter(hasPerf), C = S.cmp;
    let rows = posted.filter((d) => (!C.dur || durBucket(d) === C.dur) && (!C.fmt || d.concept?.format === C.fmt) && (!C.fw || d.concept?.framework === C.fw));
    const M = METRICS.find((m) => m.k === C.sort) || METRICS[3];
    rows = rows.map((d) => ({ d, m: metrics(d.perf) })).sort((a, b) => (b.m[M.k] ?? -1) - (a.m[M.k] ?? -1));
    const fmts = [...new Set(posted.map((d) => d.concept?.format).filter(Boolean))];
    return `<div class="fade"><h1>Results</h1><p class="lede">Log how your posted videos did. Margo only compares numbers you enter here.</p>
      <section><div class="sechead"><h2>Log results</h2><small>${posted.length} with numbers</small></div>
        ${all.length ? `<div class="list">${all.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 30).map((d) => `<button class="row two" data-perf="${d.id}">
          <span class="name">${esc(d.concept?.name)}<div class="meta">${esc(d.product?.name)}${hasPerf(d) ? ` · ${numOr(num(d.perf.views))} views` : ""}</div></span>
          <span class="num"><span class="chip ${hasPerf(d) ? "posted" : ""}">${hasPerf(d) ? "Edit" : "Add"}</span></span></button>`).join("")}</div>`
        : `<div class="card empty">Save a script in Studio, post it, then add its numbers here.<br><br><button class="btn" data-go="studio">Open Studio</button></div>`}
      </section>
      ${posted.length ? `<section><div class="sechead"><h2>Compare</h2><small>like with like</small></div>
        <div class="grid2">
          <div class="field"><label for="cd">Length</label><select id="cd" data-cmp="dur"><option value="">All lengths</option>${Object.keys(DUR).map((d) => `<option value="${d}" ${C.dur === d ? "selected" : ""}>${d.replace("-", "–")} sec</option>`).join("")}</select></div>
          <div class="field"><label for="cs">Sort by</label><select id="cs" data-cmp="sort">${METRICS.map((m) => `<option value="${m.k}" ${C.sort === m.k ? "selected" : ""}>${m.l}</option>`).join("")}</select></div>
          <div class="field"><label for="cf">Format</label><select id="cf" data-cmp="fmt"><option value="">All formats</option>${fmts.map((f) => `<option ${C.fmt === f ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></div>
          <div class="field"><label for="cw">Framework</label><select id="cw" data-cmp="fw"><option value="">All frameworks</option>${FRAMEWORKS.map((f) => `<option value="${f.id}" ${C.fw === f.id ? "selected" : ""}>${f.id} · ${esc(f.name)}</option>`).join("")}</select></div>
        </div>
        ${rows.length ? `<div class="tablewrap"><table><thead><tr><th>Video</th><th>Views</th>${METRICS.map((m) => `<th>${m.short}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(({ d, m }) => `<tr><td><b>${esc(d.concept?.name)}</b><div class="meta">${esc(d.concept?.framework)} · ${esc(durBucket(d).replace("-", "–"))}s</div></td><td>${numOr(num(d.perf.views))}</td>${METRICS.map((x) => `<td>${fmtM(x, m[x.k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
          : `<div class="card empty">No videos match these filters.</div>`}
        <p class="note">${METRICS.map((m) => `<b>${m.l}</b> = ${m.def}`).join(". ")}. A dash means a number it needs is missing; blanks are never counted as zero.</p>
        ${posted.length < 3 ? `<p class="note">With fewer than 3 videos, treat any pattern as an early signal, not a rule.</p>` : ""}
      </section>
      <section><div class="card"><h2>What should you test next?</h2>
        <p class="note">Margo looks at your logged numbers and suggests 3 experiments. One video can’t prove a framework works, so she says how much data each idea rests on.</p>
        ${errBox()}${busyIs("advice") ? busyCard() : `<button class="btn" data-act="advice">Suggest my next experiments</button>`}
        ${S.advice ? `<p class="advice">${esc(S.advice)}</p>` : ""}</div></section>` : ""}
    </div>`;
  }
  function metricCard(m) { return `<div class="card"><h2>Calculated</h2><div class="mgrid">${METRICS.map((x) => `<div class="metric"><b>${fmtM(x, m[x.k])}</b><span>${x.l}</span><span>${x.def}</span></div>`).join("")}</div>
    <p class="note">A dash means a number it needs is missing. Blanks are never treated as zero.</p></div>`; }
  function perfView(id) {
    const d = S.scripts[id]; if (!d) return `<div class="fade"><button class="back" data-act="back">← Back</button><p class="empty">That script isn’t here anymore.</p></div>`;
    const P = S.perfDraft;
    return `<div class="fade"><button class="back" data-act="back">← Back</button>
      <h1>${esc(d.concept?.name)}</h1><p class="date">${esc(d.product?.name)} · ${esc(d.concept?.framework)} · ${esc(d.concept?.format)}</p>
      <section><div class="card"><h2>How it did</h2><p class="note">Fill in what you have from TikTok analytics. Leave anything you don’t know blank.</p>
        <div class="grid2">${PERF_FIELDS.map((f) => `<div class="field"><label for="pf-${f.k}">${f.l}</label><input type="${f.t || "number"}" ${f.t ? "" : `inputmode="decimal" min="0" step="any"`} id="pf-${f.k}" data-bind="S:perfDraft.${f.k}" data-live="1" value="${esc(P[f.k] ?? "")}"></div>`).join("")}</div>
        <button class="btn" data-act="saveperf" data-id="${id}">Save results</button></div></section>
      <section id="mcard">${metricCard(metrics(P))}</section>
    </div>`;
  }

  /* ================= YOU ================= */
  function you() {
    return `<div class="fade"><h1>You</h1><p class="date">${esc(email)}</p>
      <section><div class="card"><div class="field"><label for="yn">Your name</label><input type="text" id="yn" data-bind="S:profile.name" value="${esc(S.profile.name)}" placeholder="What Margo calls you"></div>
        <button class="btn ghost" data-act="saveprofile">Save</button></div></section>
      <section><div class="list">
        <button class="row two" data-go="profile"><span class="name">Creator profile<div class="meta">Your voice, phrases and audience. Shapes every script.</div></span><span class="num">›</span></button>
        <button class="row two" data-go="frameworks"><span class="name">Framework library<div class="meta">The ${FRAMEWORKS.length} structures Margo writes with</div></span><span class="num">›</span></button>
        <button class="row two" data-go="history"><span class="name">Past briefs<div class="meta">${Object.keys(S.briefs).length} saved</div></span><span class="num">›</span></button>
      </div></section>
      <section><div class="card"><h2>Add Margo to your home screen</h2>
        <p class="note"><b>iPhone:</b> open Margo in Safari, tap Share, then Add to Home Screen.<br><b>Android:</b> open Margo in Chrome, tap ⋮, then Install app.</p></div></section>
      <section><form method="post" action="/auth/signout" class="signout"><button class="btn plain">Sign out</button></form></section>
    </div>`;
  }
  function profileView() {
    const c = S.profile.creator;
    return `<div class="fade"><button class="back" data-go="you">← You</button><h1>Creator profile</h1>
      <p class="lede">This is the 20% personality layer. Margo keeps the framework the same and uses this to make scripts sound like you.</p>
      <section><div class="card">${PROFILE_FIELDS.map((f) => fieldHtml(f, c[f.k] || "", "profile.creator")).join("")}
        <button class="btn" data-act="saveprofile">Save profile</button>
        <button class="btn plain" data-act="resetvibe">Reset “How you come across” to the default</button></div></section>
      <section><p class="note">Margo never makes up experiences or testimonials for you. When a script needs your real reaction, she leaves a prompt like [your honest first reaction] for you to fill in.</p></section>
    </div>`;
  }
  function frameworks() {
    return `<div class="fade"><button class="back" data-act="back">← Back</button><h1>Framework library</h1>
      <p class="lede">80% proven structure, 20% you. Every concept Margo writes follows one of these.</p>
      ${FRAMEWORKS.map((f) => `<section><div class="card">
        <div class="sechead"><h2>${f.id} · ${esc(f.name)}</h2>${f.alt ? `<small>${esc(f.alt)}</small>` : ""}</div>
        <p class="note">Best when: ${esc(f.use)}</p>
        <ol class="ul">${f.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${f.caution ? `<p class="flag note">${esc(f.caution)}</p>` : ""}
        <button class="btn ghost" data-usefw="${f.id}">Write with this framework</button></div></section>`).join("")}
    </div>`;
  }

  /* ================= events ================= */
  on("input", (e) => {
    const b = e.target.dataset?.bind; if (!b) return;
    const i = b.indexOf(":"), r = b.slice(0, i), p = b.slice(i + 1);
    const o = r === "C" ? holder()?.concept : S; if (o) setPath(o, p, e.target.value);
    if (b === "S:q") { const el = root.querySelector("#scriptList"); if (el) el.innerHTML = scriptRows(); }
    if (e.target.dataset.live) { const el = root.querySelector("#mcard"); if (el) el.innerHTML = metricCard(metrics(S.perfDraft)); }
    if (p.startsWith("studio.")) saveDraft();
  });
  on("change", (e) => {
    const t = e.target;
    if (t.dataset?.done) { toggleDone(t.dataset.done, t.checked); t.closest(".vid").classList.toggle("done", t.checked); if (stack[0] === "plan") render(true); return; }
    if (t.dataset?.filter) { S[t.dataset.filter] = t.value; const el = root.querySelector("#scriptList"); if (el) el.innerHTML = scriptRows(); return; }
    if (t.dataset?.cmp) { S.cmp[t.dataset.cmp] = t.value; render(true); return; }
    if (t.dataset?.status) { const d = S.scripts[t.dataset.status]; if (d) { d.status = t.value; saveScript(d); toast("Status updated"); } }
  });
  on("click", (e) => {
    if (!root.contains(e.target)) return;
    const el = e.target.closest("[data-go],[data-act],[data-rm],[data-p],[data-b],[data-step],[data-fmt],[data-fw],[data-dur],[data-mode],[data-count],[data-open],[data-ctab],[data-usehook],[data-copyhook],[data-rescene],[data-script],[data-perf],[data-usefw],[data-tostudio]");
    if (!el) return; const d = el.dataset, s = S.studio, o = s.opts;
    if (d.go !== undefined) { go(d.go); return; }
    if (d.rm !== undefined) { e.preventDefault(); const [f] = S.files.splice(+d.rm, 1); URL.revokeObjectURL(f.url); S.err = ""; render(true); return; }
    if (d.p) { push("p:" + d.p); return; }
    if (d.b) { push("b:" + d.b); return; }
    if (d.step) { s.step = d.step; S.err = ""; saveDraft(); render(); return; }
    if (d.fmt !== undefined) { o.formats = !d.fmt ? [] : o.formats.includes(d.fmt) ? o.formats.filter((x) => x !== d.fmt) : [...o.formats, d.fmt]; saveDraft(); render(true); return; }
    if (d.fw !== undefined) { o.frameworks = !d.fw ? [] : o.frameworks.includes(d.fw) ? o.frameworks.filter((x) => x !== d.fw) : [...o.frameworks, d.fw]; saveDraft(); render(true); return; }
    if (d.dur) { o.duration = d.dur; saveDraft(); render(true); return; }
    if (d.mode) { o.mode = d.mode; o.count = 3; saveDraft(); render(true); return; }
    if (d.count) { o.count = +d.count; saveDraft(); render(true); return; }
    if (d.open !== undefined) { S.ctab = "hooks"; push("c:" + d.open); return; }
    if (d.script) { S.ctab = "hooks"; push("s:" + d.script); return; }
    if (d.perf) { S.perfDraft = clone(S.scripts[d.perf]?.perf || {}); push("m:" + d.perf); return; }
    if (d.ctab) { S.ctab = d.ctab; render(true); return; }
    if (d.usefw) { o.frameworks = [d.usefw]; s.step = s.product.name ? "setup" : "product"; saveDraft(); go("studio"); return; }
    if (d.tostudio) { const [key, bi] = d.tostudio.split("|"); const p = arr(S.briefs[key]?.breakdowns)[+bi]; if (p) {
        S.studio = { ...S.studio, step: "product", extracted: false, concepts: [], product: { ...blankProduct(), name: p.name },
          paste: `What's working in my videos for ${p.name}:\nHook: ${p.hook || ""}\nSelling point: ${p.sell || ""}\nClose: ${p.close || ""}\nPattern: ${p.pattern || ""}` };
        saveDraft(); go("studio"); toast("Add the product details, then pick a format"); } return; }
    if (d.usehook) { const h = holder(); if (h) { const hs = h.concept.hooks; const [x] = hs.splice(+d.usehook, 1); hs.unshift(x); persist(h); render(true); toast("Recommended hook updated"); } return; }
    if (d.copyhook) { const x = arr(holder()?.concept.hooks)[+d.copyhook]; if (x) copy([x.spoken && `Say: ${x.spoken}`, `On screen: ${x.onScreen}`, `Visual: ${x.visual}`].filter(Boolean).join("\n")); return; }
    if (d.rescene) { const i = +d.rescene; runPiece("scene" + i, "Margo is rewriting this scene", "scene", { index: i }, (c, out) => { if (!out.scene) return false; c.timeline[i] = { ...out.scene, start: c.timeline[i].start, end: c.timeline[i].end }; }); return; }
    const a = d.act; if (!a) return;
    const h = holder();
    switch (a) {
      case "back": back(); break;
      case "stop": S.busy?.ctl.abort(); break;
      case "write": writeBrief(); break;
      case "redo": S.redo = true; render(); break;
      case "cancelredo": S.redo = false; S.err = ""; render(); break;
      case "extract": extract(); break;
      case "tosetup": if (!s.product.name.trim()) { S.err = "Add the product name first."; render(true); break; } S.err = ""; s.step = "setup"; saveDraft(); render(); break;
      case "gen": genConcepts(); break;
      case "newproduct": S.studio = { step: "product", paste: "", extracted: false, product: blankProduct(), opts: { ...o }, concepts: [] }; saveDraft(); render(); break;
      case "script": runPiece("script", "Margo is writing the full script", "script", {}, (c, out) => { if (!arr(out.timeline).length) return false; Object.assign(c, { timeline: arr(out.timeline), proof: out.proof || {}, conversion: out.conversion || {}, checklist: out.checklist || {}, qc: arr(out.qc).filter((q) => q && (q.check || q.note)) }); if (S.ctab === "hooks") S.ctab = "script"; }); break;
      case "rehooks": runPiece("hooks", "Margo is writing new hooks", "hooks", {}, (c, out) => { const hs = arr(out.hooks).slice(0, 5); if (!hs.length) return false; c.hooks = hs; }); break;
      case "retimeline": runPiece("timeline", "Margo is rewriting the timeline", "timeline", {}, (c, out) => { if (!arr(out.timeline).length) return false; c.timeline = arr(out.timeline); }); break;
      case "recta": runPiece("cta", "Margo is writing a new CTA and caption", "cta", {}, (c, out) => { if (!out.cta && !out.caption) return false; c.conversion = { ...(c.conversion || {}), ...out }; }); break;
      case "newangle": if (h && h.kind === "draft") { const i = h.i, part = h.concept.part;
          (async () => {
            const out = await ask("angle", "Margo is finding a new angle", "angle", { product: s.product, opts: s.opts, part, others: s.concepts.map((c) => ({ name: c.name, framework: c.framework, angle: c.angle })) });
            if (!out) return; const c = arr(out.concepts)[0];
            if (!c) { S.err = "Margo didn’t return a new concept. Try again."; render(true); return; }
            s.concepts[i] = normConcept({ ...c, part: part ?? c.part }); S.ctab = "hooks"; saveDraft(); render(); toast("New angle ready");
          })(); } break;
      case "dup": if (h) { const c = clone(h.concept); c.name = (c.name || "Concept") + " (copy)"; c.cid = uidStr(); delete c.savedId;
          if (h.kind === "draft") { s.concepts.splice(h.i + 1, 0, c); saveDraft(); stack[stack.length - 1] = "c:" + (h.i + 1); render(); }
          else { const id = uidStr(), now = new Date().toISOString(); const doc = { ...clone(h.doc), id, concept: c, status: "idea", perf: {}, createdAt: now, updatedAt: now }; saveScript(doc); stack[stack.length - 1] = "s:" + id; render(); }
          toast("Duplicated. You’re looking at the copy."); } break;
      case "edit": S.editing = true; render(true); break;
      case "doneedit": S.editing = false; persist(h); render(true); toast("Saved your edits"); break;
      case "save": if (h) saveDraftConcept(h); break;
      case "opensaved": if (h?.concept.savedId && S.scripts[h.concept.savedId]) { go("scripts"); push("s:" + h.concept.savedId); } else toast("Still saving. Try again in a second."); break;
      case "export": if (h) exportDoc(h); break;
      case "askdel": S.confirmDel = true; render(true); break;
      case "canceldel": S.confirmDel = false; render(true); break;
      case "del": if (h?.kind === "saved") { const id = h.id; delDoc("s-" + id).then(() => { delete S.scripts[id]; for (const c of S.studio.concepts) if (c.savedId === id) delete c.savedId; saveDraft(); go("scripts"); toast("Deleted"); }, () => toast("Couldn’t delete. Check your connection.")); } break;
      case "copyscript": if (h) copy(timelineText(h.concept)); break;
      case "copycaption": if (h) { const cv = h.concept.conversion || {}; copy([cv.caption, arr(cv.hashtags).map((t) => (String(t).startsWith("#") ? t : "#" + t)).join(" ")].filter(Boolean).join("\n\n")); } break;
      case "saveperf": { const doc = S.scripts[d.id]; if (!doc) break; doc.perf = clone(S.perfDraft); if (hasPerf(doc)) doc.status = "posted"; saveScript(doc); toast("Results saved"); back(); break; }
      case "advice": (async () => { const t = await ask("advice", "Margo is looking at your numbers", "advice", {}); if (t) { S.advice = String(t); render(true); } })(); break;
      case "saveprofile": saveProfile().then((ok) => ok && toast("Saved")); break;
      case "resetvibe": S.profile.creator.vibe = DEFAULT_VIBE; render(true); break;
    }
  });
  // Pick up changes made on another device when Margo comes back to the foreground.
  on("visibilitychange", () => { if (document.visibilityState === "visible" && userId) load(false); });

  /* ================= boot ================= */
  render();
  (async () => {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id || null;
    if (!userId) { window.location.replace("/login"); return; }
    await load(true);
  })();

  return () => { listeners.abort(); clearTimeout(draftT); clearTimeout(doneT); root.innerHTML = ""; };
}
