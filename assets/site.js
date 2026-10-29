// Renders the home page and project pages from site.json + projects/<id>/project.json.
// No build step: data is fetched at load time, so the site must be served over http (not file://).
(async function () {
  const T = { ship: { a: "feat", c: "#1f9d6b" }, fix: { a: "fix", c: "#d0532f" }, decision: { a: "decision", c: "#7a4fd6" }, start: { a: "init", c: "#6b7683" } };
  const PILL = { live: "p-live", running: "p-run", concept: "p-con", paused: "p-off", archived: "p-off" };

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const full = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const src = (p, im) => `projects/${p.id}/${im.file}`;
  const img = (p, im) => `<img src="${src(p, im)}" alt="${esc(im.alt)}" loading="lazy">`;
  const pill = (p) => `<span class="pill ${PILL[p.status] || "p-off"}">${esc(p.statusLabel)}</span>`;
  const mstats = (p) => `<div class="mstats">${p.stats.map((s) => `<span><b>${esc(s.value)}</b>${esc(s.label)}</span>`).join("")}</div>`;
  const kpis = (a) => `<div class="kpis">${a.map((s) => `<div class="kpi"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>`;
  const checks = (a) => `<ul class="checks">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const href = (p) => `project.html?p=${encodeURIComponent(p.id)}`;
  const legend = `<div class="legend">${Object.values(T).map((t) => `<span style="--c:${t.c}">${t.a}</span>`).join("")}</div>`;
  const graph = (p) => `<div class="graph"><div class="head"><i></i>HEAD → latest · ${full(p.timeline[0].date)}</div>${p.timeline
    .map((e) => { const t = T[e.type] || T.start; return `<div class="ev" style="--c:${t.c}"><div class="hd"><span class="ty">${t.a}</span><span>${full(e.date)}</span></div><div class="t">${esc(e.title)}</div><div class="b">${esc(e.body)}</div></div>`; })
    .join("")}</div>`;

  const getJSON = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  const S = await getJSON("site.json");
  const P = (await Promise.all(S.projects.map((id) => getJSON(`projects/${id}/project.json`).catch(() => null)))).filter(Boolean);
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));

  // "count:projects" or "<project-id>:<stat-key>" → the live value from that project's stats
  const kpiValue = (v) => {
    if (v === "count:projects") return String(P.length);
    const [id, key] = v.split(":");
    return byId[id]?.stats.find((s) => s.key === key)?.value ?? "—";
  };

  function home() {
    const f = byId[S.featured] || P[0];
    const rest = P.filter((p) => p !== f);
    return `<header class="hero"><div class="av">${esc(S.name[0])}</div><div><h1>${esc(S.name)}</h1><div class="sub">${esc(S.tagline)}</div></div></header>
      <p class="bio">${esc(S.bio)}</p>${kpis(S.kpis.map((k) => ({ value: kpiValue(k.value), label: k.label })))}
      <a class="card feat" href="${href(f)}"><div class="im">${img(f, f.images[0])}</div><div class="bd">
        <span class="tag">Featured · now building</span><h2>${esc(f.name)}</h2>${pill(f)}
        <p class="bio small">${esc(f.short)}</p>${checks(f.highlights.slice(0, 3))}${mstats(f)}<span class="go">See the timeline →</span></div></a>
      <div class="lbl">More projects</div>
      <div class="rows">${rest
        .map((p) => `<a class="card row" href="${href(p)}"><div class="im">${img(p, p.images[0])}</div>
          <div class="rb"><div class="rt"><span class="nm">${esc(p.name)}</span>${pill(p)}</div><span class="ds">${esc(p.short)}</span>${mstats(p)}</div><span class="arrow">→</span></a>`)
        .join("")}</div>
      <footer class="foot">Updated ${full(P.map((p) => p.asOf).sort().pop())}</footer>`;
  }

  function detail(p) {
    const thumbs = p.images.length > 1
      ? `<div class="thumbs">${p.images.map((im, i) => `<button type="button" data-thumb="${src(p, im)}" aria-pressed="${i === 0}" aria-label="Show screenshot ${i + 1}">${img(p, im)}</button>`).join("")}</div>`
      : "";
    const link = p.link ? `<a class="ext" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link.replace(/^https?:\/\//, ""))} ↗</a>` : "";
    const next = p.next?.length ? `<div class="card pad"><div class="lbl">Next up</div>${checks(p.next).replace('class="checks"', 'class="checks next"')}</div>` : "";
    const title = `<div class="rt"><h1>${esc(p.name)}</h1>${pill(p)}</div>`;
    return `<a class="back" href="index.html">← All projects</a><div class="mtitle">${title}</div>
      <div class="dt"><aside class="side"><div class="shot main" data-main>${img(p, p.images[0])}</div>${thumbs}${kpis(p.stats)}
        <div class="card pad"><div class="lbl">Highlights</div>${checks(p.highlights)}<div class="lbl">Built with</div><div class="small">${esc(p.stack)}</div>${link}</div>${next}</aside>
      <section class="tl"><div class="dtitle">${title}</div><p class="bio">${esc(p.short)}</p>
        <div class="lbl">Timeline · newest first</div>${legend}${graph(p)}<div class="foot">Status as of ${full(p.asOf)}</div></section></div>`;
  }

  const app = document.getElementById("app");
  if (document.body.dataset.page === "project") {
    const p = byId[new URLSearchParams(location.search).get("p")];
    if (!p) { location.replace("index.html"); return; }
    document.title = `${p.name} · ${S.name}`;
    app.innerHTML = detail(p);
    app.addEventListener("click", (e) => {
      const th = e.target.closest("[data-thumb]");
      if (!th) return;
      app.querySelector("[data-main] img").src = th.dataset.thumb;
      app.querySelectorAll("[data-thumb]").forEach((b) => b.setAttribute("aria-pressed", b === th));
    });
  } else {
    app.innerHTML = home();
  }
})();
