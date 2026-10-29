# Portfolio rules

The contract for every update to this site. Read it in full before editing any project. The gold-standard example is [`projects/drop-note/project.json`](../projects/drop-note/project.json): match its tone, length and level of detail.

The site is **public**. Anything written here is visible to recruiters and anyone on the internet.

---

## 1. Who edits what

Two GitHub accounts, on two Macs, share this repo. Ownership is set in [`portfolio.config.json`](../portfolio.config.json).

| Account | Machine | Owns |
|---|---|---|
| `lego651` | Mac 1 | `drop-note`, `agent-team` |
| `pomo651` | Mac 2 | `blackout-clock`, `family-fridge` |

- Find the current account with `gh api user --jq .login`.
- **Only edit `projects/<id>/` folders whose `account` matches.** Never touch another account's project folders, even to fix a typo; mention it in your summary instead.
- `site.json` (bio, project order, home KPIs) is owned by `lego651`. Edit it from Mac 2 only when adding a new pomo651 project to the `projects` list.
- This split means the two Macs never edit the same file, so `git pull --rebase` before you start is enough to avoid conflicts.

## 2. Files

```
site.json                      bio, featured project, project order, home KPIs
portfolio.config.json          project → account, repo, local path, what to read
projects/<id>/project.json     one project's public content
projects/<id>/images/*.jpg     1–3 screenshots for that project
```

Home KPIs in `site.json` point at project stats by key (`"drop-note:commits"`), so updating a project's stat updates the home page too. `"count:projects"` is computed.

## 3. `project.json` fields

| Field | Rule |
|---|---|
| `id` | Folder name, kebab-case. Never change it after publishing (it's in URLs). |
| `name` | Product name as users see it. |
| `status` | One of `live`, `running`, `concept`, `paused`, `archived`. `live` = real users can use it. `running` = an internal system that operates daily. `concept` = designs/docs only, nothing usable. |
| `statusLabel` | Short pill text, e.g. `Live · beta`, `Running daily`, `Concept`. Must not overstate `status`. |
| `asOf` | Today's date (`YYYY-MM-DD`) whenever you review the project, even if nothing else changed. |
| `short` | One or two sentences, ≤ 160 characters. What it is and who it's for. No jargon. |
| `role` | What *I* did. |
| `stack` | Main technologies, comma-separated, ≤ 6 items. |
| `link` | Public URL or `null`. Never link a private repo. |
| `images` | 1–3 items `{ "file": "images/x.jpg", "alt": "…" }`. First one is the cover. Alt text describes what's shown; add "(sample data)" for design mockups. |
| `stats` | Exactly 3 items `{ "key", "value", "label" }`. `value` is a string. Keep existing `key`s stable (home KPIs reference them). |
| `highlights` | 3–4 bullets, each ≤ 90 characters. What the product does or what's impressive about it — not a changelog. |
| `next` | 1–3 bullets: what's planned next. Plain promises only; no dates unless certain. |
| `timeline` | Newest first. See §4. |

## 4. Timeline rules

- **Newest first.** Insert new events at the top; never reorder old ones.
- **Types:** `ship` (users got something new), `fix` (notable quality work), `decision` (a direction change, design pick, or something dropped), `start` (project begins; exactly one, always last).
- **Milestones, not commits.** One event summarizes a burst of related work (e.g. "Mobile pass: 15 fixes in 2 days"). Aim for 1–3 new events per month of activity. If nothing meaningful happened, add none — just bump `asOf`.
- **Keep 5–10 events.** When over 10, merge older related events into one rather than deleting history.
- `title` ≤ 60 characters, starts with the thing, not a verb like "Worked on". `body` ≤ 160 characters, one or two plain sentences on what changed and why it matters.
- `date` is when it landed (merge date or decision date), not when work started.

## 5. Numbers must be real

Every number must come from a command you ran this session, never from memory or an older file. Record nothing you can't reproduce.

| Stat | Command (run inside the project's local repo) |
|---|---|
| commits | `git rev-list --count origin/main` (after `git fetch`) |
| PRs merged | `gh pr list --state merged --limit 1000 --json number --jq length` |
| months | Months since `git log --reverse --format=%ad --date=short \| head -1` |
| last activity | `git log -1 --format=%ad --date=short origin/main` |

For concept projects, use product facts from the docs (e.g. "3 views designed") instead of git stats, since their commit counts are tiny and look weak.

## 6. Never publish

- Secrets, tokens, env values, internal URLs (`localhost`, admin pages), database or project IDs.
- Ticket numbers (`DRO-123`), PR numbers, branch names, commit hashes, file paths.
- Real users' names, emails, content, or counts of beta users unless I said it's OK.
- Costs, budgets, spend limits, revenue.
- Anything about my job search, the "Job Search" or "FDE" Paperclip companies, or employers.
- Claims that a concept is built, or that something is "used by" people who don't use it.

When unsure, leave it out and list it under "Needs your call" in the summary.

## 7. Screenshots

- 1–3 per project, JPEG, about 1000px wide, ≤ 200 KB each, saved to `projects/<id>/images/` with descriptive kebab-case names. Replace a file in place when refreshing so URLs stay stable.
- Take a new one only when the UI visibly changed or there isn't one yet.
- Sources are listed per project under `screenshots` in `portfolio.config.json`. Allowed: the public live site, local design files, and the Paperclip **drop-note** company dashboard. Never screenshot logged-in pages with real user data, the Job Search/FDE companies, terminals, or code.
- Crop out cookie banners and browser chrome. Look at every image before committing it.
- macOS capture recipe (no installs needed):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1280,800 --screenshot=/tmp/shot.png "https://dropnote.me"
# crop: sips -c <height> <width> --cropOffset <y> <x> /tmp/shot.png --out /tmp/crop.png
sips -s format jpeg -s formatOptions 72 --resampleWidth 1000 /tmp/crop.png --out projects/<id>/images/<name>.jpg
```

## 8. Voice

Plain, specific, first person where it fits ("I review and merge"). Short sentences. Numbers beat adjectives. No hype words ("revolutionary", "cutting-edge", "seamless"), no emoji.

## 9. Adding a new project

1. Add an entry to `portfolio.config.json` (account, repo, localPath, what to read, screenshot sources).
2. Create `projects/<id>/project.json` following the drop-note example, plus `images/`.
3. Add the id to `site.json` → `projects` (this order is the order on the home page).
