---
name: update-portfolio
description: Refresh this portfolio site from the projects owned by the GitHub account on this Mac — read each local repo, update projects/<id>/project.json and screenshots per docs/PORTFOLIO_RULES.md, then commit and push so GitHub Pages redeploys. Use when the user says "update the portfolio", "sync portfolio", or /update-portfolio.
---

# Update portfolio

Run from the root of the `portfolio` repo. Follow `docs/PORTFOLIO_RULES.md` exactly; read it first, every time. `projects/drop-note/project.json` is the gold-standard example.

## Arguments

- none → all projects this account owns, plus (on pomo651) the trading snapshot, then publish
- a project id (e.g. `drop-note`) → only that project (must still be owned by this account)
- `draft only` / `don't push` → stop after step 5
- `new screenshots` → retake every screenshot for the selected projects
- `trading` → (pomo651 only) only the trading snapshot (step 3b), then publish
- `no trading` → skip step 3b

## Steps

1. **Who am I.** `gh api user --jq .login` → the account. Load `portfolio.config.json` and keep only projects with that `account`. Tell the user in one line which projects you'll update.

2. **Get current.** `git pull --rebase`. If the working tree is dirty, stop and ask.

3. **For each owned project**, without editing anything in the project repo itself (read only):
   - Find the repo: expand `localPath`. If it doesn't exist, look for a folder of that name under `~/TEMP`, `~/code`, `~/dev` and `~` (depth 2) that is a git repo; if still not found, ask the user for the path and save it to `portfolio.config.json`. If `repo` is `null`, fill it from `git remote get-url origin`.
   - `git fetch` (if it has a remote), then read what changed since the project's current `asOf`: `git log --since=<asOf> --format='%ad|%s' --date=short origin/main` (or `HEAD` without a remote), plus the files listed under `read` in the config — those explain status and plans better than commit messages.
   - Recompute every git-based stat with the commands in rules §5.
   - Update `projects/<id>/project.json`: bump `asOf`; refresh `stats`; add 0–3 timeline events at the top (milestones, not commits); revise `status`, `statusLabel`, `highlights`, `next` only if reality changed. Always refresh `plan` (rules §3): mark finished weeks `done`, roll it forward so it covers this week plus the next 3, and update `plan.now`.
   - Screenshots: only if the UI visibly changed or the project has none (rules §7). Look at every image you produce.

3b. **Trading snapshot (pomo651 only; skip on lego651).** Refreshes the admin desk's encrypted trades from the family-fridge database (`docs/ADMIN.md`).
   - Ask the user for the admin password at the start of the run (step 1), so the run isn't blocked halfway. Keep it only in the shell environment; never write it to a file, commit message, doc or memory. If they don't give it, skip this step and say so in the summary.
   - `node admin/tools/export-trades.mjs` → writes the git-ignored `admin/data/trades.json` (read-only query through the logged-in `supabase` CLI; trades with no result yet are left out until they close). If it fails because the CLI isn't logged in, tell the user to run `! supabase login`.
   - `ADMIN_PASSWORD='…' node admin/tools/encrypt-trades.mjs` → `admin/data/trades.enc.json`. A wrong password is caught by checking it first: its SHA-256 must equal `PASS_SHA256` in `admin/admin.js`.
   - Strategies are fixed per pair in the exporter (GC · NY, NQ · NY, MGC · Asia, MNQ · Asia). If the export names a pair outside those four, ask the user which session it belongs to and add it to `STRATEGIES` in the exporter.
   - Before publishing, `git status` must not show `admin/data/trades.json`.

4. **Validate.**
   - `node -e 'for (const f of process.argv.slice(1)) JSON.parse(require("fs").readFileSync(f))' site.json portfolio.config.json projects/*/project.json`
   - Every file in each project's `images` exists; image sizes ≤ 200 KB.
   - Re-read your diff against rules §6 (never publish). Remove anything that fails.
   - Optional preview: `python3 -m http.server 8000` and open `http://localhost:8000`.

5. **Summarize** for the user as a table: project · what changed · new timeline events · stats before → after. On pomo651 add a trading row: trades and total R per strategy for the current month, and how many open trades were left out. Add a **Needs your call** list for anything you left out on purpose. If the user said "draft" or "don't push", stop here.

6. **Publish.** `git add -A && git commit -m "content: <account> monthly update (<YYYY-MM-DD>)" && git push` (with `trading` alone: `content: trading snapshot (<YYYY-MM-DD>)`). The push triggers `.github/workflows/deploy.yml`; check it with `gh run watch -R lego651/portfolio $(gh run list -R lego651/portfolio -L 1 --json databaseId --jq '.[0].databaseId')`, then give the live URL: https://lego651.github.io/portfolio/

## If something fails

- **Push rejected:** `git pull --rebase` and push again. Never force-push.
- **pomo651 can't push (403):** the account needs collaborator access on `lego651/portfolio`; tell the user to accept the invite at https://github.com/lego651/portfolio/invitations.
- **Deploy fails with a Pages error:** Pages may not be enabled; tell the user, don't change repo settings yourself.
