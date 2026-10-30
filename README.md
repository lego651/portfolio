# portfolio

Jason's portfolio of AI projects. Plain static site, no build step, deployed to GitHub Pages on every push to `main`: https://lego651.github.io/portfolio/

## How to use

Two GitHub accounts on two Macs each own some projects:

| Account | Owns |
|---|---|
| `lego651` | drop-note |
| `pomo651` | Blackout Clock, Family Fridge |

Ownership and local folder paths live in `portfolio.config.json`. Each Mac only updates its own projects, so the two never conflict.

### One-time setup on each Mac

```bash
cd ~/TEMP
git clone git@github.com:lego651/portfolio.git   # skip if already cloned
```

On the `pomo651` Mac, accept the collaborator invite first: https://github.com/lego651/portfolio/invitations

### Update the site (monthly, or whenever there's progress)

```bash
cd ~/TEMP/portfolio
claude
```

Then send:

> /update-portfolio

Claude will:

1. Check which GitHub account is logged in (`gh api user`) and pick that account's projects.
2. Pull the latest portfolio, then read each project's local repo: new commits, docs, and plans.
3. Update `projects/<id>/project.json`: stats, new timeline events, highlights, "Next up", and screenshots if the UI changed.
4. Check everything against [`docs/PORTFOLIO_RULES.md`](docs/PORTFOLIO_RULES.md) and show you a summary.
5. Commit and push. The site redeploys in about a minute.

### Variations

| Say | What happens |
|---|---|
| `/update-portfolio` | Update all of this Mac's projects and publish |
| `/update-portfolio draft only` | Make the changes and show the summary, but don't push |
| `/update-portfolio drop-note` | Update just one project |
| `/update-portfolio new screenshots` | Also retake every screenshot |
| `Add a new project <name> at <path> to the portfolio` | Adds it to `portfolio.config.json`, `site.json` and a new `projects/<id>/` folder (rules §9) |

### Edit by hand

Everything is JSON, so small fixes don't need Claude: edit `site.json` (bio, project order, home numbers) or a `projects/<id>/project.json`, then commit and push. Follow [`docs/PORTFOLIO_RULES.md`](docs/PORTFOLIO_RULES.md); `projects/drop-note/project.json` is the model example.

## Admin desk

A private page at https://lego651.github.io/portfolio/admin/ (password-protected, not linked from the site): today's plan, trading results in R, and project plans. Plans and trades come live from the family-fridge database. How it works: [`docs/ADMIN.md`](docs/ADMIN.md).

## Layout

```
site.json                     bio, featured project, order, home numbers
portfolio.config.json         project → account, repo, local path
projects/<id>/project.json    one project's content (example: projects/drop-note)
projects/<id>/images/         screenshots
index.html, project.html      pages; assets/site.js renders them from the JSON
docs/PORTFOLIO_RULES.md       rules for every update
admin/                        private desk page (docs/ADMIN.md)
.claude/skills/update-portfolio/SKILL.md   the update procedure
```

## Preview locally

```bash
python3 -m http.server 8000   # open http://localhost:8000 (file:// won't load the JSON)
```
