---
name: update-portfolio
description: Refresh this portfolio site from the projects owned by the GitHub account on this Mac — read each local repo, update projects/<id>/project.json and screenshots per docs/PORTFOLIO_RULES.md, then commit and push so GitHub Pages redeploys. Use when the user says "update the portfolio", "sync portfolio", or /update-portfolio.
---

# Update portfolio

Run from the root of the `portfolio` repo. Follow `docs/PORTFOLIO_RULES.md` exactly; read it first, every time. `projects/drop-note/project.json` is the gold-standard example.

## Arguments

- none → all projects this account owns, then publish
- a project id (e.g. `drop-note`) → only that project (must still be owned by this account)
- `draft only` / `don't push` → stop after step 5
- `new screenshots` → retake every screenshot for the selected projects

## Steps

1. **Who am I.** `gh api user --jq .login` → the account. Load `portfolio.config.json` and keep only projects with that `account`. Tell the user in one line which projects you'll update.

2. **Get current.** `git pull --rebase`. If the working tree is dirty, stop and ask.

3. **For each owned project**, without editing anything in the project repo itself (read only):
   - Find the repo: expand `localPath`. If it doesn't exist, look for a folder of that name under `~/TEMP`, `~/code`, `~/dev` and `~` (depth 2) that is a git repo; if still not found, ask the user for the path and save it to `portfolio.config.json`. If `repo` is `null`, fill it from `git remote get-url origin`.
   - `git fetch` (if it has a remote), then read what changed since the project's current `asOf`: `git log --since=<asOf> --format='%ad|%s' --date=short origin/main` (or `HEAD` without a remote), plus the files listed under `read` in the config — those explain status and plans better than commit messages.
   - Recompute every git-based stat with the commands in rules §5.
   - Update `projects/<id>/project.json`: bump `asOf`; refresh `stats`; add 0–3 timeline events at the top (milestones, not commits); revise `status`, `statusLabel`, `highlights`, `next` only if reality changed. Always refresh `plan` (rules §3): mark finished weeks `done`, roll it forward so it covers this week plus the next 3, and update `plan.now`.
   - Screenshots: only if the UI visibly changed or the project has none (rules §7). Look at every image you produce.

4. **Validate.**
   - `node -e 'for (const f of process.argv.slice(1)) JSON.parse(require("fs").readFileSync(f))' site.json portfolio.config.json projects/*/project.json`
   - Every file in each project's `images` exists; image sizes ≤ 200 KB.
   - Re-read your diff against rules §6 (never publish). Remove anything that fails.
   - Optional preview: `python3 -m http.server 8000` and open `http://localhost:8000`.

5. **Summarize** for the user as a table: project · what changed · new timeline events · stats before → after. Add a **Needs your call** list for anything you left out on purpose. If the user said "draft" or "don't push", stop here.

6. **Publish.** `git add -A && git commit -m "content: <account> monthly update (<YYYY-MM-DD>)" && git push`. The push triggers `.github/workflows/deploy.yml`; check it with `gh run watch -R lego651/portfolio $(gh run list -R lego651/portfolio -L 1 --json databaseId --jq '.[0].databaseId')`, then give the live URL: https://lego651.github.io/portfolio/

## If something fails

- **Push rejected:** `git pull --rebase` and push again. Never force-push.
- **pomo651 can't push (403):** the account needs collaborator access on `lego651/portfolio`; tell the user to accept the invite at https://github.com/lego651/portfolio/invitations.
- **Deploy fails with a Pages error:** Pages may not be enabled; tell the user, don't change repo settings yourself.
