// Private desk at /admin/. Not linked from the site. Three parts:
//   today's plan  — saved in this browser (localStorage), suggestions from each project's plan
//   trading in R  — read live from the family-fridge database through PLAN_API (/trades); data/trades.mock.json if that fails
//   projects      — ../site.json + ../projects/<id>/project.json (the `plan` field), order saved in this browser
// See docs/ADMIN.md for the data formats and how to publish real trades.
(async function () {
  // SHA-256 of the admin password. The password itself is never stored in the repo. To change it, see docs/ADMIN.md.
  const PASS_SHA256 = "853178830297d5f3a785b6400fc255851c4eda32422c5abe7051271a214a4eee";
  // Where day plans (themes + items) are saved. "" = this browser only. Set it to the family-fridge plan API base URL
  // (no trailing slash) to save in the database; the API contract is in docs/ADMIN_PLAN_API.md.
  const PLAN_API = "https://yvzsdncrpccxqbswemnt.supabase.co/functions/v1/portfolio-admin-plan";

  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const session = {
    get() { try { return sessionStorage.getItem("admin.pw"); } catch { return null; } },
    set(v) { try { v === null ? sessionStorage.removeItem("admin.pw") : sessionStorage.setItem("admin.pw", v); } catch {} }
  };
  const te = new TextEncoder();
  const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const getJSON = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); });

  // ---------- dates ----------
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = (s) => new Date(s + "T12:00:00");
  const monday = (d) => { const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  const short = (s) => parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const clock = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`; };
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const R = (v) => { const a = Math.round(Math.abs(v) * 10) / 10; return (v > 0 ? "+" : v < 0 ? "−" : "") + (a % 1 ? a.toFixed(1) : a) + "R"; };

  // ---------- gate ----------
  function gate(msg) {
    document.title = "Desk";
    app.innerHTML = `<form class="gate" id="gate"><div class="eyebrow">Private</div><h1>Jason's desk</h1>
      <label for="pw" class="fhint">Password</label><input id="pw" type="password" autocomplete="current-password" autofocus>
      <button type="submit">Unlock</button><p class="gmsg" aria-live="polite">${esc(msg || "")}</p></form>`;
    document.getElementById("gate").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = document.getElementById("pw").value;
      if ((await sha256(pw)) !== PASS_SHA256) return gate("That password doesn't match. Try again.");
      session.set(pw);
      boot(pw);
    });
  }

  async function boot(pw) {
    app.innerHTML = `<p class="loading">Loading your desk…</p>`;
    const S = await getJSON("../site.json");
    const P = (await Promise.all(S.projects.map((id) => getJSON(`../projects/${id}/project.json`).catch(() => null)))).filter(Boolean);
    let T = null, warn = "";
    // trades: last 12 months, live from the family-fridge database (docs/ADMIN_PLAN_API.md § Trades)
    if (PLAN_API) {
      const to = ymd(new Date()), from = ymd(new Date(Date.now() - 365 * 864e5));
      try {
        const r = await fetch(`${PLAN_API}/trades?from=${from}&to=${to}`, { headers: { Authorization: "Bearer " + pw }, cache: "no-store" });
        if (!r.ok) throw new Error(r.status === 404 ? "the trades endpoint isn't built yet" : `error ${r.status}`);
        T = await r.json(); T.source = "live";
        if (!Array.isArray(T.trades) || !Array.isArray(T.strategies)) throw new Error("unexpected response");
      } catch (err) { T = null; warn = `Couldn't load trades from the database (${err.message}). Showing sample data.`; }
    }
    if (!T) { T = await getJSON("data/trades.mock.json"); T.source = "mock"; }
    desk(S, P, T, warn, pw);
  }

  // ---------- the desk ----------
  function desk(S, P, T, warn, pw) {
    const now = new Date(), today = ymd(now), thisMon = ymd(monday(now));
    const PCOL = ["var(--k1)", "var(--k2)", "var(--k3)", "var(--k4)", "var(--k5)", "var(--k6)"];
    // Plan categories, each with its own color. Hues are spaced by the golden angle, so any number of categories stay
    // distinct; saturation/lightness come from --cs/--cl so they suit light and dark. To add a category, append it here
    // (projects come from site.json and are added automatically); it takes the next hue.
    const CATS = [["personal", "Personal"], ["trading", "Trading"], ...P.map((p) => [p.id, p.name])];
    const KIND = {};
    CATS.forEach(([id, n], i) => { KIND[id] = { n, c: `hsl(${Math.round((i * 137.508 + 20) % 360)} var(--cs) var(--cl))` }; });
    const byId = Object.fromEntries(P.map((p) => [p.id, p]));

    const savedOrder = store.get("admin.order", []).filter((id) => byId[id]);
    let order = [...savedOrder, ...P.map((p) => p.id).filter((id) => !savedOrder.includes(id))];
    // day plans: { days: { "YYYY-MM-DD": { theme, items: [{ id, s (start, minutes), d (length, minutes), t, k (project), done }] } } }
    // Always cached in this browser; also saved through PLAN_API when it is set.
    const plan = store.get("admin.plan", { days: {} });
    try { // one-time move of the older single-day lists
      Object.keys(localStorage).filter((k) => k.startsWith("admin.day.")).forEach((k) => { (plan.days[k.slice(10)] ||= { theme: "", items: [] }).items.push(...store.get(k, [])); localStorage.removeItem(k); });
    } catch {}
    const dayOf = (d) => (plan.days[d] ||= { theme: "", items: [] });
    const savePlan = () => { for (const [d, v] of Object.entries(plan.days)) if (!v.theme && !v.items.length) delete plan.days[d]; store.set("admin.plan", plan); };
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    Object.values(plan.days).forEach((v) => v.items.forEach((x) => { x.id = String(x.id); }));

    // database sync: GET/PUT whole days (docs/ADMIN_PLAN_API.md). Pending dates survive reloads; last write wins.
    const pending = new Set(store.get("admin.plan.pending", []));
    const loaded = new Set();
    let sync = PLAN_API ? "Saved" : "This browser only", flushTimer = null;
    const api = (path, opt = {}) => fetch(PLAN_API + path, { ...opt, headers: { Authorization: "Bearer " + pw, "Content-Type": "application/json", ...(opt.headers || {}) } })
      .then(async (r) => { if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`); return r.json(); });
    const showSync = (t) => { sync = t; const el = document.getElementById("sync"); if (el) { el.textContent = t; el.className = "sync" + (/Not saved/.test(t) ? " bad" : ""); } };
    async function flush() {
      clearTimeout(flushTimer);
      if (!PLAN_API || !pending.size) return;
      showSync("Saving…");
      for (const date of [...pending]) {
        const v = plan.days[date] || { theme: "", items: [] };
        try { await api(`/days/${date}`, { method: "PUT", body: JSON.stringify({ theme: v.theme, items: v.items }) }); pending.delete(date); }
        catch (err) { store.set("admin.plan.pending", [...pending]); showSync("Not saved yet, retrying"); console.warn("plan save failed", err); flushTimer = setTimeout(flush, 20000); return; }
      }
      store.set("admin.plan.pending", [...pending]); showSync("Saved");
    }
    // call after changing any day(s): caches locally, then saves to the database shortly after
    const touch = (...dates) => {
      savePlan();
      if (!PLAN_API) return;
      dates.forEach((d) => pending.add(d)); store.set("admin.plan.pending", [...pending]);
      clearTimeout(flushTimer); flushTimer = setTimeout(flush, 600);
    };
    async function loadRange(from, to) {
      const r = await api(`/days?from=${from}&to=${to}`);
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (pending.has(d)) continue; // unsaved local edits win
        const v = r.days?.[d];
        if (v) plan.days[d] = { theme: v.theme || "", items: (v.items || []).map((x) => ({ ...x, id: String(x.id) })) }; else delete plan.days[d];
      }
      savePlan();
    }
    async function need(...dates) { // make sure the months holding these dates are loaded from the database
      if (!PLAN_API) return;
      const ms = [...new Set(dates.map((d) => d.slice(0, 7)))].filter((m) => !loaded.has(m));
      if (!ms.length) return;
      try {
        for (const m of ms) { const [y, mo] = m.split("-").map(Number); await loadRange(`${m}-01`, `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`); loaded.add(m); }
        showSync(pending.size ? "Saving…" : "Saved");
      } catch (err) { showSync("Not saved yet, retrying"); console.warn("plan load failed", err); }
      render();
    }
    async function connect() { // first connection: upload days that exist only in this browser, then load
      if (!PLAN_API) return;
      try {
        if (!store.get("admin.plan.migrated", false)) {
          const local = Object.keys(plan.days).sort();
          if (local.length) {
            const r = await api(`/days?from=${local[0]}&to=${local[local.length - 1]}`);
            local.filter((d) => !r.days?.[d]).forEach((d) => pending.add(d));
          }
          store.set("admin.plan.migrated", true);
        }
        await flush();
        await need(today, addDays(today, 2));
      } catch (err) { showSync("Not saved yet, retrying"); console.warn("plan connect failed", err); }
    }
    const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return ymd(x); };
    const dayName = (d) => (d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : parse(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    let view = "day", focusDate = today, calMonth = today.slice(0, 7); // opens on Today every time

    const STRATS = (T.strategies || []).map((s, i) => ({ ...s, c: PCOL[(i + 2) % PCOL.length] }));
    const months = [...new Set(T.trades.map((t) => t.date.slice(0, 7)))].sort();
    let month = months.includes(today.slice(0, 7)) ? today.slice(0, 7) : months[months.length - 1] || today.slice(0, 7);
    let hidden = new Set(), sel = null;

    // plans: project.json `plan` (see docs/PORTFOLIO_RULES.md); falls back to `next` until a project has one
    const planOf = (p) => p.plan?.weeks?.length
      ? { now: p.plan.now || p.short, weeks: p.plan.weeks, real: true }
      : { now: p.short, weeks: (p.next || []).map((goal) => ({ goal })), real: false };
    // the goal to work on now: this week's if not done yet, else the next unfinished one
    const curWeek = (pl) => pl.weeks.find((w) => w.week === thisMon && !w.done) || pl.weeks.find((w) => !w.done && (!w.week || w.week >= thisMon)) || pl.weeks.find((w) => !w.done) || pl.weeks[0];
    const weekLabel = (w) => (!w.week ? "Next" : w.week === thisMon ? "This week" : short(w.week));
    const suggestions = (date) => order.map((id) => ({ k: id, t: curWeek(planOf(byId[id]))?.goal })).filter((s) => s.t && !dayOf(date).items.some((x) => x.t === s.t));
    const freeSlot = (date, d) => {
      const after = date === today ? now.getHours() * 60 + (now.getMinutes() < 30 ? 30 : 60) : 9 * 60;
      return Math.min(Math.max(dayOf(date).items.reduce((a, x) => Math.max(a, x.s + x.d), 9 * 60), after), TO * 60 - d);
    };

    // ---------- day plans: Today / 3 days / Month ----------
    const FROM = 7, TO = 21, PPM = .6, H = (TO - FROM) * 60 * PPM;
    function gutter(head) {
      const labels = [];
      for (let h = FROM; h <= TO; h++) labels.push(`<span style="top:${(h - FROM) * 60 * PPM - 8}px">${clock(h * 60).replace(":00", "")}</span>`);
      return `<div class="gut">${head ? `<div class="colh"></div>` : ""}<div class="gl" style="height:${H}px">${labels.join("")}</div></div>`;
    }
    function column(date, head) {
      const lines = [];
      for (let h = FROM; h <= TO; h++) {
        lines.push(`<div class="hr" style="top:${(h - FROM) * 60 * PPM}px"></div>`);
        if (h < TO) lines.push(`<div class="hr half" style="top:${((h - FROM) * 60 + 30) * PPM}px"></div>`);
      }
      const items = dayOf(date).items;
      // blocks show only the content, clipped to the lines that fit; hover shows the full text, time and category
      const evs = items.map((x) => {
        const k = KIND[x.k] || KIND.personal, h = Math.max(x.d * PPM - 2, 18), lines = Math.max(1, Math.floor((h - 4) / 15.5));
        const tip = `${x.t}\n${clock(x.s)}–${clock(x.s + x.d)} · ${k.n}${x.done ? " · done" : ""}`;
        return `<div class="ev${h < 26 ? " short" : ""}${x.done ? " done" : ""}${x.id === editing ? " editing" : ""}" data-ev="${esc(x.id)}" title="${esc(tip)}" style="--c:${k.c};top:${(x.s - FROM * 60) * PPM}px;height:${h}px">
        <button class="ck" type="button" data-done="${esc(x.id)}" aria-pressed="${!!x.done}" aria-label="${x.done ? "Mark not done" : "Mark done"}: ${esc(x.t)}"></button><span class="tt" style="-webkit-line-clamp:${lines}">${esc(x.t)}</span><small class="dt"></small><button class="x" type="button" data-del="${esc(x.id)}" aria-label="Delete ${esc(x.t)}">×</button></div>`;
      }).join("");
      const n = now.getHours() * 60 + now.getMinutes();
      const line = date === today && n >= FROM * 60 && n <= TO * 60 ? `<div class="now" style="top:${(n - FROM * 60) * PPM}px"></div>` : "";
      const empty = items.length || head ? "" : `<div class="empty">Nothing planned yet. Add an item below or pick one from your projects.</div>`;
      return `<div class="col">${head ? `<div class="colh">${head}</div>` : ""}<div class="cal${date === today ? " istoday" : ""}" data-date="${date}" style="height:${H}px">${lines.join("")}${evs}${line}${empty}</div></div>`;
    }
    const cals = (dates, heads) => `<div class="calscroll"><div class="cals" style="grid-template-columns:44px repeat(${dates.length}, minmax(${dates.length > 1 ? 150 : 0}px, 1fr))">${gutter(!!heads)}${dates.map((d, i) => column(d, heads && heads[i])).join("")}</div></div>`;
    const themeInput = (date, cls, ph) => `<input class="${cls}" type="text" id="theme-${date}" data-theme-date="${date}" value="${esc(dayOf(date).theme)}" placeholder="${ph}" aria-label="Theme for ${dayName(date)}" maxlength="80">`;
    const kindOptions = () => Object.entries(KIND).map(([k, v]) => `<option value="${k}"${k === "personal" ? " selected" : ""}>${esc(v.n)}</option>`).join("");
    function addForm(dates) {
      const first = dates[0];
      return `<form class="add" id="add">
        <input type="text" id="n-t" placeholder="Add something to do" aria-label="New item">
        ${dates.length > 1 ? `<select id="n-date" aria-label="Day">${dates.map((d) => `<option value="${d}">${dayName(d)}</option>`).join("")}</select>` : `<input type="hidden" id="n-date" value="${first}">`}
        <input type="time" id="n-s" value="${hhmm(freeSlot(first, 60))}" step="900" aria-label="Start time">
        <select id="n-d" aria-label="Length"><option value="30">30 min</option><option value="60" selected>1 hr</option><option value="90">1.5 hr</option><option value="120">2 hr</option></select>
        <select id="n-k" aria-label="Project">${kindOptions()}</select>
        <button type="submit">Add</button></form>`;
    }
    let editing = null; // id of the item open in the editor
    const LENGTHS = [15, 30, 45, 60, 90, 120, 150, 180, 240];
    function editForm() {
      const f = editing && findItem(editing); if (!f) return "";
      const x = f.x, lens = [...new Set([...LENGTHS, x.d])].sort((a, b) => a - b);
      return `<form class="edit" id="edit"><div class="ph"><span class="eyebrow">Edit item</span><button type="button" class="x" data-edit-cancel aria-label="Close editor">×</button></div>
        <input type="text" id="e-t" value="${esc(x.t)}" aria-label="Title" maxlength="200">
        <div class="erow">
          <label>Project<select id="e-k">${Object.entries(KIND).map(([k, v]) => `<option value="${k}"${k === x.k ? " selected" : ""}>${esc(v.n)}</option>`).join("")}</select></label>
          <label>Day<input type="date" id="e-date" value="${f.d}"></label>
          <label>Start<input type="time" id="e-s" value="${hhmm(x.s)}" step="900"></label>
          <label>Length<select id="e-d">${lens.map((m) => `<option value="${m}"${m === x.d ? " selected" : ""}>${m < 60 ? m + " min" : m / 60 + " hr"}</option>`).join("")}</select></label>
        </div>
        <div class="erow"><button type="submit">Save</button><button type="button" class="ghost" data-edit-cancel>Cancel</button><button type="button" class="ghost danger" data-del="${esc(x.id)}">Delete</button></div></form>`;
    }
    const chips = (date) => `<div class="chips"><span class="eyebrow">From your projects</span>${suggestions(date).map((s) => `<button class="chip" type="button" data-sugg="${s.k}" data-sugg-date="${date}" style="--c:${KIND[s.k].c}"><i></i>+ ${esc(s.t)}</button>`).join("") || `<span class="fhint">All added</span>`}</div>`;
    const seg = () => `<div class="seg" role="tablist">${[["day", "Today"], ["three", "3 days"], ["month", "Month"]].map(([v, l]) => `<button type="button" role="tab" data-view="${v}" aria-selected="${view === v}">${l}</button>`).join("")}</div>`;
    const doneOf = (date) => dayOf(date).items.filter((x) => x.done).length;
    const hours = (date) => (dayOf(date).items.reduce((a, x) => a + x.d, 0) / 60).toFixed(1);

    function dayView() {
      const d = focusDate, it = dayOf(d).items.length;
      const nav = `<span class="mnav"><button type="button" data-dnav="-1" aria-label="Previous day">‹</button>${esc(parse(d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }))}<button type="button" data-dnav="1" aria-label="Next day">›</button></span>`;
      return `<div class="ph"><div class="eyebrow">${nav}${d === today ? "" : ` <button type="button" class="linkbtn" data-view="day" data-go-today>Back to today</button>`}</div><span class="fhint">${doneOf(d)}/${it} done · ${hours(d)} hrs · drag to move</span></div>
        <div class="theme"><span class="eyebrow">${d === today ? "Today's theme" : "Theme"}</span>${themeInput(d, "theme-in", "Set a theme for the day…")}</div>
        ${cals([d])}${editForm()}${addForm([d])}${chips(d)}`;
    }
    function threeView() {
      const ds = [today, addDays(today, 1), addDays(today, 2)];
      const heads = ds.map((d) => `<div class="cn"><b>${dayName(d)}</b><span>${doneOf(d)}/${dayOf(d).items.length} · ${hours(d)}h</span></div>${themeInput(d, "theme-sm", "Theme…")}`);
      return `<div class="ph"><span class="eyebrow">Today and the next 2 days</span><span class="fhint">Drag items between days</span></div>
        ${cals(ds, heads)}${editForm()}${addForm(ds)}${chips(today)}`;
    }
    // Month view chart: finished items per category this month, most to least
    function doneChart() {
      const counts = {};
      for (const [d, v] of Object.entries(plan.days)) if (d.startsWith(calMonth)) v.items.forEach((x) => { if (x.done) counts[x.k] = (counts[x.k] || 0) + 1; });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]), total = rows.reduce((a, r) => a + r[1], 0), max = Math.max(1, ...rows.map((r) => r[1]));
      if (!rows.length) return `<div class="dchart"><span class="eyebrow">Finished this month</span><p class="fhint">Nothing checked off yet. Finished items show up here by category.</p></div>`;
      return `<div class="dchart"><div class="ph"><span class="eyebrow">Finished this month</span><b class="dtot">${total} done</b></div>
        <div class="bars">${rows.map(([k, n]) => { const c = KIND[k] || { n: k, c: "var(--mu)" }; return `<div class="bc" title="${esc(c.n)}: ${n} finished"><span class="bv">${n}</span><i style="height:${Math.max(4, Math.round((n / max) * 96))}px;background:${c.c}"></i><span class="bn">${esc(c.n)}</span></div>`; }).join("")}</div></div>`;
    }
    function monthView() {
      const [y, m] = calMonth.split("-").map(Number), last = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
      const cells = Array(lead).fill(`<div class="mc blank"></div>`);
      for (let n = 1; n <= last; n++) {
        const d = `${calMonth}-${String(n).padStart(2, "0")}`, v = plan.days[d], it = v?.items.length || 0;
        cells.push(`<button type="button" class="mc${d === today ? " today" : ""}${d < today ? " past" : ""}" data-open="${d}" aria-label="Open ${dayName(d)}"><span>${n}</span>${v?.theme ? `<em>${esc(v.theme)}</em>` : ""}${it ? `<small>${v.items.filter((x) => x.done).length}/${it} done</small>` : ""}</button>`);
      }
      const label = parse(calMonth + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return `<div class="ph"><span class="eyebrow"><span class="mnav"><button type="button" data-cmonth="-1" aria-label="Previous month">‹</button>${esc(label)}<button type="button" data-cmonth="1" aria-label="Next month">›</button></span></span><span class="fhint">Click a day to open it</span></div>
        ${doneChart()}<div class="mgrid">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => `<span class="dh">${x}</span>`).join("")}${cells.join("")}</div>`;
    }
    const todayPanel = () => `<section class="panel s-today"><div class="ph"><h3>Plan</h3><span id="sync" class="sync${/Not saved/.test(sync) ? " bad" : ""}" title="${PLAN_API ? "Saved to the family-fridge database" : "Not connected to a database yet; see docs/ADMIN_PLAN_API.md"}">${sync}</span>${seg()}</div>${view === "day" ? dayView() : view === "three" ? threeView() : monthView()}</section>`;

    // ---------- trading in R ----------
    function monthStats() {
      const all = T.trades.filter((t) => t.date.startsWith(month));
      const ts = all.filter((t) => !hidden.has(t.strategy));
      const byDay = {};
      ts.forEach((t) => (byDay[t.date] ||= []).push(t));
      // open trades (r === null: result not known yet) get a gray dot but don't count toward R, win rate or green days
      const closed = ts.filter((t) => t.r != null), rsum = (a) => a.reduce((x, t) => x + (t.r ?? 0), 0);
      const dates = Object.keys(byDay).sort(), sums = dates.map((d) => rsum(byDay[d]));
      const closedSums = dates.filter((d) => byDay[d].some((t) => t.r != null)).map((d) => rsum(byDay[d]));
      const total = rsum(closed), wins = closed.filter((t) => t.r > 0).length;
      return { all, ts, closed, open: ts.length - closed.length, byDay, dates, sums, total, wins, per: closed.length ? total / closed.length : 0,
        tdays: closedSums.length, green: closedSums.filter((v) => v > 0).length, best: Math.max(0, ...closedSums), worst: Math.min(0, ...closedSums) };
    }
    function toggles(st) {
      return `<div class="stoggle">${STRATS.map((s) => {
        const mine = st.all.filter((t) => t.strategy === s.id && t.r != null), tot = mine.reduce((a, t) => a + t.r, 0), w = mine.filter((t) => t.r > 0).length;
        const op = st.all.filter((t) => t.strategy === s.id && t.r == null).length;
        return `<button type="button" data-strat="${esc(s.id)}" aria-pressed="${!hidden.has(s.id)}" style="--c:${s.c}"><b>${esc(s.name)}</b><small class="${tot >= 0 ? "up" : "dn"}">${R(tot)} · ${mine.length ? Math.round((w / mine.length) * 100) : 0}% win${op ? ` · ${op} open` : ""}</small></button>`;
      }).join("")}</div>`;
    }
    function curve(st) {
      if (st.dates.length < 2) return "";
      const w = 560, h = 130, L = 34, Rr = 8, Tp = 8, B = 18;
      let c = 0; const cum = st.sums.map((v) => (c += v)), n = cum.length;
      const lo = Math.min(0, ...cum), hi = Math.max(1, ...cum);
      const X = (i) => L + (i / (n - 1)) * (w - L - Rr), Y = (v) => Tp + (1 - (v - lo) / (hi - lo)) * (h - Tp - B);
      const step = hi - lo > 40 ? 20 : hi - lo > 16 ? 10 : 5, ticks = [];
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
      const xi = [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
      const p = cum.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Cumulative R this month">
        ${ticks.map((v) => `<line x1="${L}" x2="${w - Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ln)" stroke-width="1"${v ? ' stroke-dasharray="2 3"' : ""}/><text x="${L - 5}" y="${Y(v) + 3.5}" text-anchor="end" font-size="10" fill="var(--mu)" font-family="JetBrains Mono, monospace">${v}R</text>`).join("")}
        ${xi.map((i) => `<text x="${X(i)}" y="${h - 4}" text-anchor="${i === n - 1 ? "end" : i ? "middle" : "start"}" font-size="10" fill="var(--mu)" font-family="JetBrains Mono, monospace">${short(st.dates[i])}</text>`).join("")}
        <path d="${p}L${X(n - 1)},${Y(0)}L${X(0)},${Y(0)}Z" fill="var(--ac)" fill-opacity=".12" stroke="none"/>
        <path d="${p}" fill="none" stroke="var(--ac)" stroke-width="2.2"/><circle cx="${X(n - 1)}" cy="${Y(cum[n - 1])}" r="4" fill="var(--ac)"/></svg>`;
    }
    function heat(st) {
      const [y, m] = month.split("-").map(Number), last = new Date(y, m, 0).getDate();
      const weekend = T.trades.some((t) => t.date.startsWith(month) && [0, 6].includes(parse(t.date).getDay()));
      const cols = weekend ? 7 : 5, names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, cols);
      const max = Math.max(1, ...st.sums.map(Math.abs)), rows = [];
      let row = null;
      for (let d = 1; d <= last; d++) {
        const date = `${month}-${String(d).padStart(2, "0")}`, col = (parse(date).getDay() + 6) % 7;
        if (col >= cols) continue;
        if (!row || col === 0) { row = Array(cols).fill(null); rows.push(row); }
        row[col] = date;
      }
      const cell = (date) => {
        if (!date) return `<div class="cell off"></div>`;
        const d = +date.slice(8), ts = st.byDay[date];
        if (!ts) return date > today ? `<div class="cell off"><span>${d}</span></div>` : `<div class="cell${date === today ? " today" : ""}"><span>${d}</span><b style="opacity:.45">—</b></div>`;
        const anyClosed = ts.some((t) => t.r != null), v = ts.reduce((a, t) => a + (t.r ?? 0), 0), a = Math.min(Math.abs(v) / max, 1);
        const bg = anyClosed ? `color-mix(in srgb, var(${v >= 0 ? "--gn" : "--ls"}) ${Math.round(12 + a * 55)}%, var(--pn))` : "var(--sf)";
        const dots = ts.map((t) => `<i class="${t.r == null ? "o" : t.r > 0 ? "w" : ""}${t.tpEdited ? " tp" : ""}"></i>`).join("");
        const label = anyClosed ? R(v) : "open";
        return `<button type="button" class="cell${date === today ? " today" : ""}" data-day="${date}" aria-pressed="${sel === date}" style="background:${bg}" aria-label="${short(date)}: ${label}, ${ts.length} trades"><span>${d}</span><span class="dots">${dots}</span><b${anyClosed ? "" : ' style="opacity:.6"'}>${label}</b></button>`;
      };
      return `<div class="heat" style="grid-template-columns:24px repeat(${cols}, minmax(0, 1fr))"><span></span>${names.map((x) => `<span class="dh">${x}</span>`).join("")}
        ${rows.map((r, i) => `<span class="wk">W${i + 1}</span>${r.map(cell).join("")}`).join("")}</div>`;
    }
    function dayDetail(st) {
      const d = sel && st.byDay[sel] ? sel : st.dates[st.dates.length - 1];
      if (!d) return `<div class="dayd"><span class="fhint">No trades this month.</span></div>`;
      const ts = st.byDay[d], tot = ts.reduce((a, t) => a + t.r, 0);
      const sname = (id) => STRATS.find((s) => s.id === id) || { name: id, c: "var(--k-me)" };
      const k = (r) => (r == null ? "var(--mu)" : r < 0 ? "var(--ls)" : r > 1.5 ? "var(--ac)" : "var(--gn)");
      return `<div class="dayd"><div class="ph"><span class="eyebrow">${short(d)} · ${ts.length} trades</span><b class="${tot >= 0 ? "up" : "dn"}" style="font-family:var(--nm);font-size:13px">${R(tot)}</b></div>
        <ul>${ts.map((t) => { const s = sname(t.strategy); return `<li style="--c:${s.c}"><span class="t">${esc(t.time || "")}</span><i></i><span>${esc(s.name)}</span><span class="tpchip${t.tpEdited ? "" : " none"}">TP edited</span><span class="rchip" style="--k:${k(t.r)}">${t.r == null ? "Open" : R(t.r)}</span></li>`; }).join("")}</ul></div>`;
    }
    function tradingPanel() {
      const st = monthStats(), mi = months.indexOf(month);
      const label = parse(month + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return `<section class="panel s-trade">
        <div class="ph"><div><div class="eyebrow"><span class="mnav"><button type="button" data-month="-1" aria-label="Previous month"${mi <= 0 ? " disabled" : ""}>‹</button>${esc(label)}<button type="button" data-month="1" aria-label="Next month"${mi >= months.length - 1 ? " disabled" : ""}>›</button></span></div><h3>Trading</h3></div>
          <div style="text-align:right"><div class="big ${st.total >= 0 ? "up" : "dn"}">${R(st.total)}</div><div class="fhint">${st.closed.length} trades${st.open ? ` · ${st.open} open` : ""} · ${STRATS.length - hidden.size} of ${STRATS.length} strategies</div></div></div>
        ${toggles(st)}${curve(st)}${heat(st)}
        <div class="kv"><div><span>Win rate</span>${st.closed.length ? Math.round((st.wins / st.closed.length) * 100) : 0}%</div><div><span>R per trade</span>${R(st.per)}</div><div><span>Green days</span>${st.green}/${st.tdays}</div><div><span>Best / worst</span><span style="font-size:13px;letter-spacing:0;text-transform:none"><b class="up">${R(st.best)}</b> / <b class="dn">${R(st.worst)}</b></span></div></div>
        ${dayDetail(st)}
        <div class="fhint">${T.source === "mock" ? "Sample data" : "Live from the database"} · click a day to see its trades · long dot = edited TP</div>
      </section>`;
    }

    // ---------- projects ----------
    function projectsPanel() {
      return `<section class="s-proj"><div class="ph" style="padding:2px 4px"><h3>Projects</h3><span class="fhint">Drag ⋮⋮ to the top to focus</span></div>
        <div class="list" id="plist">${order.map((id, i) => {
          const p = byId[id], pl = planOf(p), c = KIND[id].c, cw = curWeek(pl);
          const done = pl.weeks.filter((w) => w.done).length;
          const noplan = pl.real ? "" : `<div class="noplan">No plan yet; showing "Next up". The owner's /update-portfolio adds it.</div>`;
          const head = `<button class="grip" type="button" data-grip aria-label="Drag ${esc(p.name)}">⋮⋮</button>`;
          if (i === 0) return `<article class="pc focus" data-id="${id}" style="--c:${c}">
            <div class="pc-h">${head}<span class="focuslbl">Focus</span><span class="pill">${esc(p.statusLabel)}</span></div>
            <div class="nm">${esc(p.name)}</div><p class="nowline">${esc(pl.now)}</p>
            <ol class="road">${pl.weeks.map((w) => `<li class="${w === cw ? "cur" : ""}${w.done ? " done" : ""}"><span>${weekLabel(w)}</span><i></i><div>${esc(w.goal)}</div></li>`).join("")}</ol>
            ${pl.real ? `<div class="ring"><svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="4"/><circle cx="18" cy="18" r="15" fill="none" stroke="var(--ac)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(done / pl.weeks.length) * 94.2} 94.2" transform="rotate(-90 18 18)"/></svg>${done} of ${pl.weeks.length} weeks done · plan as of ${esc(p.asOf)}</div>` : noplan}</article>`;
          return `<article class="pc" data-id="${id}" style="--c:${c}">
            <div class="pc-h">${head}<span class="nm">${esc(p.name)}</span><span class="pill">${esc(p.statusLabel)}</span></div>
            <p class="nowline">${esc(pl.now)}</p>${cw ? `<div class="w1"><b>${cw.week ? weekLabel(cw).toUpperCase() : "NEXT"}</b>${esc(cw.goal)}</div>` : ""}
            ${pl.real ? `<div class="mini"><i style="width:${(done / pl.weeks.length) * 100}%"></i></div>` : noplan}</article>`;
        }).join("")}</div></section>`;
    }

    function render() {
      document.title = "Desk";
      app.innerHTML = `<header class="top"><div><div class="eyebrow">${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div><h1>Jason's desk</h1></div>
        <div class="tools"><span class="badge${T.source === "mock" ? " mock" : ""}">Trading: ${T.source === "mock" ? "sample data" : "live"}</span><a href="../">Portfolio</a><button type="button" id="lock">Lock</button></div></header>
        ${warn ? `<div class="warn">${esc(warn)}</div>` : ""}
        <div class="desk">${todayPanel()}${tradingPanel()}${projectsPanel()}</div>`;
    }

    const findItem = (id) => { for (const [d, v] of Object.entries(plan.days)) { const x = v.items.find((y) => y.id === String(id)); if (x) return { d, x }; } return null; };
    app.onclick = (e) => {
      if (e.target.closest("#lock")) { session.set(null); return gate(); }
      const vw = e.target.closest("[data-view]");
      if (vw) { view = vw.dataset.view; if (vw.hasAttribute("data-go-today") || view !== "day") focusDate = today; render(); return need(today, addDays(today, 2), calMonth + "-01"); }
      const op = e.target.closest("[data-open]");
      if (op) { view = "day"; focusDate = op.dataset.open; render(); return need(focusDate); }
      const dn = e.target.closest("[data-dnav]");
      if (dn) { focusDate = addDays(focusDate, +dn.dataset.dnav); render(); return need(focusDate); }
      const cm = e.target.closest("[data-cmonth]");
      if (cm) { const [y, m] = calMonth.split("-").map(Number), d = new Date(y, m - 1 + +cm.dataset.cmonth, 1); calMonth = ymd(d).slice(0, 7); render(); return need(calMonth + "-01"); }
      const dn2 = e.target.closest("[data-done]");
      if (dn2) { const f = findItem(dn2.dataset.done); if (f) { f.x.done = !f.x.done; touch(f.d); } return render(); }
      if (e.target.closest("[data-edit-cancel]")) { editing = null; return render(); }
      const del = e.target.closest("[data-del]");
      if (del) { const f = findItem(del.dataset.del); if (f) { dayOf(f.d).items = dayOf(f.d).items.filter((y) => y !== f.x); touch(f.d); } if (editing === del.dataset.del) editing = null; return render(); }
      const sg = e.target.closest("[data-sugg]");
      if (sg) { const d = sg.dataset.suggDate, t = curWeek(planOf(byId[sg.dataset.sugg])).goal; dayOf(d).items.push({ id: uid(), s: freeSlot(d, 60), d: 60, t, k: sg.dataset.sugg }); touch(d); return render(); }
      const st = e.target.closest("[data-strat]");
      if (st) { const id = st.dataset.strat; if (hidden.has(id)) hidden.delete(id); else if (hidden.size < STRATS.length - 1) hidden.add(id); return render(); }
      const mo = e.target.closest("[data-month]");
      if (mo && !mo.disabled) { month = months[months.indexOf(month) + +mo.dataset.month]; sel = null; return render(); }
      const dy = e.target.closest("[data-day]");
      if (dy) { sel = dy.dataset.day; render(); }
    };
    // themes save as you type (no re-render, so the field keeps focus)
    app.oninput = (e) => {
      const d = e.target.dataset?.themeDate; if (!d) return;
      dayOf(d).theme = e.target.value.trim() ? e.target.value : ""; touch(d);
    };
    app.onsubmit = (e) => {
      if (e.target.id === "edit") {
        e.preventDefault();
        const f = findItem(editing); if (!f) return;
        const t = document.getElementById("e-t").value.trim(), date = document.getElementById("e-date").value || f.d, v = document.getElementById("e-s").value;
        const d = +document.getElementById("e-d").value;
        if (t) f.x.t = t;
        f.x.k = document.getElementById("e-k").value; f.x.d = d;
        if (v) f.x.s = Math.max(FROM * 60, Math.min(TO * 60 - d, (([h, m]) => h * 60 + m)(v.split(":").map(Number))));
        if (date !== f.d) { dayOf(f.d).items = dayOf(f.d).items.filter((y) => y !== f.x); dayOf(date).items.push(f.x); }
        touch(f.d, date); editing = null; render(); return need(date);
      }
      if (e.target.id !== "add") return;
      e.preventDefault();
      const t = document.getElementById("n-t").value.trim(); if (!t) return;
      const date = document.getElementById("n-date").value, d = +document.getElementById("n-d").value, k = document.getElementById("n-k").value, v = document.getElementById("n-s").value;
      const s = v ? Math.max(FROM * 60, Math.min(TO * 60 - d, (([h, m]) => h * 60 + m)(v.split(":").map(Number)))) : freeSlot(date, d);
      dayOf(date).items.push({ id: uid(), s, d, t, k }); touch(date); render();
    };
    // drag: calendar blocks move in 15-minute steps, and across days in the 3-day view; a click without moving opens the editor.
    // Project cards reorder.
    const follow = (move, up) => {
      const end = (ev) => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); up(ev); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    };
    app.onpointerdown = (e) => {
      if (e.button > 0) return;
      const ev = e.target.closest(".cal .ev");
      if (ev && !e.target.closest("[data-del], [data-done]")) {
        const src = ev.parentNode, f = findItem(ev.dataset.ev); if (!f) return;
        const x = f.x, s0 = x.s, x0 = e.clientX, y0 = e.clientY, offY = e.clientY - ev.getBoundingClientRect().top, all = [...app.querySelectorAll(".cal[data-date]")];
        let target = src, moved = false;
        e.preventDefault(); ev.classList.add("dragging");
        const move = (m) => {
          if (!moved && Math.abs(m.clientX - x0) < 4 && Math.abs(m.clientY - y0) < 4) return;
          moved = true;
          target = all.find((c) => { const r = c.getBoundingClientRect(); return m.clientX >= r.left && m.clientX < r.right; }) || target;
          const tr = target.getBoundingClientRect(), sr = src.getBoundingClientRect();
          x.s = Math.max(FROM * 60, Math.min(TO * 60 - x.d, Math.round((FROM * 60 + (m.clientY - offY - tr.top) / PPM) / 15) * 15));
          ev.style.top = (x.s - FROM * 60) * PPM + "px";
          ev.style.transform = `translateX(${tr.left - sr.left}px)`;
          ev.querySelector(".dt").textContent = `${target === src ? "" : dayName(target.dataset.date) + " · "}${clock(x.s)}–${clock(x.s + x.d)}`;
        };
        const up = () => {
          if (!moved) { x.s = s0; editing = editing === x.id ? null : x.id; return render(); }
          const to = target.dataset.date;
          if (to !== f.d) { dayOf(f.d).items = dayOf(f.d).items.filter((y) => y !== x); dayOf(to).items.push(x); }
          touch(f.d, to); render();
        };
        follow(move, up);
        return;
      }
      const grip = e.target.closest("[data-grip]"); if (!grip) return;
      const item = grip.closest("[data-id]"), list = item.parentNode;
      e.preventDefault(); item.classList.add("lift");
      const move = (m) => {
        const over = document.elementFromPoint(m.clientX, m.clientY)?.closest("[data-id]");
        if (!over || over === item || over.parentNode !== list) return;
        const kids = [...list.children], r = over.getBoundingClientRect(), down = kids.indexOf(over) > kids.indexOf(item);
        // swap once the pointer is ~60px into the card being passed, so the tall focus card is easy to pass too
        const edge = Math.min(r.height / 2, 60);
        if (down && m.clientY > r.bottom - edge) list.insertBefore(item, over.nextSibling);
        else if (!down && m.clientY < r.bottom - edge) list.insertBefore(item, over);
      };
      const up = (u) => {
        item.classList.remove("lift");
        // letting go anywhere on the focus card makes this card the new focus
        const at = u && document.elementFromPoint(u.clientX, u.clientY)?.closest("[data-id]");
        if (at && at !== item && at === list.firstElementChild) list.insertBefore(item, at);
        order = [...list.children].map((c) => c.dataset.id); store.set("admin.order", order); render();
      };
      follow(move, up);
    };

    render();
    connect();
  }

  if (!window.crypto?.subtle) { app.innerHTML = `<p class="loading">This page needs https (or localhost) to unlock.</p>`; return; }
  const saved = session.get();
  if (saved && (await sha256(saved)) === PASS_SHA256) boot(saved); else gate();
})();
