// Renders the home page (#app on index.html) and project pages (project.html?p=<id>).
(function () {
  const S = window.SITE, P = window.PROJECTS;
  const T = { ship: { a: "feat", c: "#1f9d6b" }, fix: { a: "fix", c: "#d0532f" }, dec: { a: "decision", c: "#7a4fd6" }, start: { a: "init", c: "#6b7683" } };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const full = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const src = (k) => `assets/img/${k}.jpg`;
  const img = (k, alt) => `<img src="${src(k)}" alt="${esc(alt || "")}" loading="lazy">`;
  const pill = (p) => `<span class="pill p-${p.status}">${esc(p.statusLabel)}</span>`;
  const mstats = (p) => `<div class="mstats">${p.stats.map((s) => `<span><b>${esc(s[0])}</b>${esc(s[1])}</span>`).join("")}</div>`;
  const kpis = (a) => `<div class="kpis">${a.map((s) => `<div class="kpi"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join("")}</div>`;
  const checks = (a) => `<ul class="checks">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const href = (p) => `project.html?p=${encodeURIComponent(p.id)}`;
  const hero = () => `<header class="hero"><div class="av">${esc(S.name[0])}</div><div><h1>${esc(S.name)}</h1><div class="sub">${esc(S.tagline)}</div></div></header><p class="bio">${esc(S.bio)}</p>`;
  const legend = `<div class="legend">${Object.values(T).map((t) => `<span style="--c:${t.c}">${t.a}</span>`).join("")}</div>`;
  const graph = (p) => `<div class="graph"><div class="head"><i></i>HEAD → latest · ${full(p.ev[0].d)}</div>${p.ev
    .map((e) => `<div class="ev" style="--c:${T[e.ty].c}"><div class="hd"><span class="ty">${T[e.ty].a}</span><span>${full(e.d)}</span></div><div class="t">${esc(e.t)}</div><div class="b">${esc(e.b)}</div></div>`)
    .join("")}</div>`;

  function home() {
    const f = P[0];
    return `${hero()}${kpis(S.kpis)}
      <a class="card feat" href="${href(f)}"><div class="im">${img(f.imgs[0], f.name)}</div><div class="bd">
        <span class="tag">Featured · now building</span><h2>${esc(f.name)}</h2>${pill(f)}
        <p class="bio small">${esc(f.short)}</p>${checks(f.hl.slice(0, 3))}${mstats(f)}<span class="go">See the timeline →</span></div></a>
      <div class="lbl">More projects</div>
      <div class="rows">${P.slice(1)
        .map((p) => `<a class="card row" href="${href(p)}"><div class="im">${img(p.imgs[0], p.name)}</div>
          <div class="rb"><div class="rt"><span class="nm">${esc(p.name)}</span>${pill(p)}</div><span class="ds">${esc(p.short)}</span>${mstats(p)}</div><span class="arrow">→</span></a>`)
        .join("")}</div>`;
  }

  function detail(p) {
    const thumbs = p.imgs.length > 1
      ? `<div class="thumbs">${p.imgs.map((k, i) => `<button type="button" data-thumb="${k}" aria-pressed="${i === 0}" aria-label="Show screenshot ${i + 1}">${img(k)}</button>`).join("")}</div>`
      : "";
    const link = p.link ? `<a class="ext" href="${p.link}" target="_blank" rel="noopener">${esc(p.link.replace(/^https?:\/\//, ""))} ↗</a>` : "";
    return `<a class="back" href="index.html">← All projects</a>
      <div class="dt"><aside class="side"><div class="shot main" data-main>${img(p.imgs[0], p.name)}</div>${thumbs}${kpis(p.stats)}
        <div class="card pad"><div class="lbl">Highlights</div>${checks(p.hl)}<div class="lbl">Built with</div><div class="small">${esc(p.stack)}</div>${link}</div></aside>
      <section class="tl"><div class="rt"><h1>${esc(p.name)}</h1>${pill(p)}</div><p class="bio">${esc(p.short)}</p>
        <div class="lbl">Timeline · newest first</div>${legend}${graph(p)}</section></div>`;
  }

  const app = document.getElementById("app");
  if (document.body.dataset.page === "project") {
    const id = new URLSearchParams(location.search).get("p");
    const p = P.find((x) => x.id === id);
    if (!p) { location.replace("index.html"); return; }
    document.title = `${p.name} · ${S.name}`;
    app.innerHTML = detail(p);
    app.addEventListener("click", (e) => {
      const th = e.target.closest("[data-thumb]");
      if (!th) return;
      app.querySelector("[data-main] img").src = src(th.dataset.thumb);
      app.querySelectorAll("[data-thumb]").forEach((b) => b.setAttribute("aria-pressed", b === th));
    });
  } else {
    app.innerHTML = home();
  }
})();
