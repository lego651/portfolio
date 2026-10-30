# portfolio — Claude Code guide

Jason's public portfolio of AI projects, deployed to GitHub Pages at https://lego651.github.io/portfolio/ on every push to `main`.

- **Updating content:** use the `update-portfolio` skill (`/update-portfolio`, or "update the portfolio"). It follows [`docs/PORTFOLIO_RULES.md`](docs/PORTFOLIO_RULES.md) — the rules for ownership, fields, timeline, numbers, screenshots and what never to publish.
- **Two accounts share this repo.** `lego651` (Mac 1) and `pomo651` (Mac 2) each edit only the `projects/<id>/` folders they own, per [`portfolio.config.json`](portfolio.config.json).
- **Gold-standard example:** [`projects/drop-note/project.json`](projects/drop-note/project.json).
- **Code:** plain static site, no build. `assets/site.js` renders from `site.json` + `projects/*/project.json`; `assets/site.css` is the look (Status Board home, git-graph timelines). Content changes never need code changes.
- **Admin desk:** `admin/` is a private page (password hash only, never the password; plans and trades come live from the family-fridge database, never committed). Read [`docs/ADMIN.md`](docs/ADMIN.md) before touching it; the API contract (plans + trades) is [`docs/ADMIN_PLAN_API.md`](docs/ADMIN_PLAN_API.md).
- **Commits:** `content: …` for data updates, `feat:` / `fix:` for site code. End with the Claude co-author trailer.
