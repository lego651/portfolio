# portfolio

Jason's portfolio of AI projects. Plain static site, no build step, deployed to GitHub Pages on every push to `main`: https://lego651.github.io/portfolio/

## How content gets updated

Two GitHub accounts on two Macs each own some projects (see `portfolio.config.json`). Once a month, or whenever there's progress, open Claude Code in this repo on that Mac and say:

> /update-portfolio

Claude reads that Mac's local project repos, updates only that account's `projects/<id>/` folders following [`docs/PORTFOLIO_RULES.md`](docs/PORTFOLIO_RULES.md), and pushes. The site redeploys in about a minute.

## Layout

```
site.json                     bio, featured project, order, home numbers
portfolio.config.json         project → account, repo, local path
projects/<id>/project.json    one project's content (example: projects/drop-note)
projects/<id>/images/         screenshots
index.html, project.html      pages; assets/site.js renders them from the JSON
docs/PORTFOLIO_RULES.md       rules for every update
.claude/skills/update-portfolio/SKILL.md   the update procedure
```

## Preview locally

```bash
python3 -m http.server 8000   # open http://localhost:8000 (file:// won't load the JSON)
```
