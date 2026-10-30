# Admin desk (`/admin/`)

A private page for Jason at https://lego651.github.io/portfolio/admin/. It isn't linked from the site, and search engines are told not to index it. It has three parts:

| Part | Where | Data comes from |
|---|---|---|
| **Today** (top left) | Hour grid, 7am–9pm. Drag blocks to move them; add, delete, or pick from the projects' current-week goals. Today's theme is the #1 project's current-week goal. | Saved in the browser (`localStorage`, one list per date). Not synced between devices. |
| **Trading** (bottom left) | Month of results **in R**: strategy switches, cumulative R line, heatmap with one dot per trade, win rate, R per trade, green days, best/worst day, and the trades of the day you click. | `admin/data/trades.enc.json` if it exists, otherwise `admin/data/trades.mock.json` (fake data, with a "sample data" badge). |
| **Projects** (right) | Focus stack. The top card shows the full 4-week plan; drag ⋮⋮ to reorder. | `site.json` + `projects/<id>/project.json` → `plan` (written by `/update-portfolio`). Card order is saved in the browser. |

Files: `admin/index.html`, `admin/admin.css`, `admin/admin.js`, `admin/data/`, `admin/tools/encrypt-trades.mjs`.

## The password

- The page asks for a password before showing anything. The repo stores only its SHA-256 hash (`PASS_SHA256` in `admin/admin.js`), **never the password itself**. Don't write the password into any file, commit message or doc.
- The repo is public, so a hash check alone only hides the page. Real trading data is safe because it is **encrypted with the same password** (`trades.enc.json`). Without the password it is unreadable.
- The unlocked password is kept in `sessionStorage` (this tab only) so reloads don't ask again. **Lock** clears it.
- **To change the password:** put the new hash in `admin/admin.js` (`node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' 'NEW_PASSWORD'`), then re-run the encrypt step below with the new password.

## Trading data: replacing the mock data with real trades

R rules: a loss is **−1R**, a win is **+1.5R** by default, and a win where Jason edited the take-profit is **+3R** or **+5R** (any number works; the page just sums `r`).

### 1. The format (`admin/data/trades.json`, plain text, git-ignored)

```json
{
  "asOf": "2026-10-29",
  "strategies": [
    { "id": "orb", "name": "Opening range" },
    { "id": "vwap", "name": "VWAP fade" }
  ],
  "trades": [
    { "date": "2026-10-01", "time": "09:42", "strategy": "orb", "r": -1, "tpEdited": false },
    { "date": "2026-10-01", "time": "10:15", "strategy": "vwap", "r": 3, "tpEdited": true }
  ]
}
```

| Field | Rule |
|---|---|
| `asOf` | Date of the export, `YYYY-MM-DD`. Shown as "Updated …". |
| `strategies[]` | Every strategy, in display order. `id` is what trades reference; `name` is shown. A new strategy shows up automatically. |
| `trades[].date` | Trade date, `YYYY-MM-DD` (local trading day). Weekend trades switch the heatmap to 7 columns. |
| `trades[].time` | Optional, `HH:MM`. Shown in the day list. |
| `trades[].strategy` | A `strategies[].id`. |
| `trades[].r` | Result in R: `-1`, `1.5`, `3`, `5`… If the database stores prices, R = (exit − entry) ÷ (entry − stop), with the sign flipped for shorts. Breakeven is `0`. |
| `trades[].tpEdited` | `true` when the take-profit was changed from the default 1.5R. Drawn as a long dot. |

`admin/data/trades.mock.json` follows the same format and is the reference example.

### 2. Export, encrypt, publish (on the pomo651 Mac)

The trades live in the **family-fridge** project's database on the pomo651 Mac. Steps for Claude there:

1. The trades are in family-fridge's `trade_logs` table (`~/@Pomo651/family-fridge`; override with `FAMILY_FRIDGE_DIR`). It stores the pair and win/loss, not R or strategy, so the exporter maps: loss −1R, win +1.5R, `tpEdited` false, and one strategy per pair (GC · NY, NQ · NY, MGC · Asia, MNQ · Asia). Trades with no result yet are left out until they close. **Read only; never change that database.**
2. Export: `node admin/tools/export-trades.mjs`. It runs one SELECT through the logged-in `supabase` CLI (no keys in this repo) and writes `admin/data/trades.json`, all months.
3. Encrypt: `ADMIN_PASSWORD='…' node admin/tools/encrypt-trades.mjs`. This writes `admin/data/trades.enc.json`. Ask Jason for the password in the session; never save it in a file.
4. Check locally: `python3 -m http.server 8000`, open http://localhost:8000/admin/, unlock. The badge should say **Trading: live snapshot**.
5. Commit **only** `admin/data/trades.enc.json` (and the exporter): `git add admin/data/trades.enc.json admin/tools/export-trades.mjs && git commit -m "content: trading snapshot (<date>)" && git push`. Run `git status` first and make sure `trades.json` is not staged.

Keep `trades.mock.json` in the repo. The page falls back to it if the encrypted file is missing.

To refresh later, re-run steps 2–5 (export, encrypt, commit). `/update-portfolio` on pomo651 does this on every run (it asks for the password); `/update-portfolio trading` does only this.

### Message to send Claude on the pomo651 Mac

> In ~/TEMP/portfolio, read docs/ADMIN.md and connect the admin page's trading section to my real trades from the family-fridge database: write the exporter, encrypt with the admin password (ask me for it), check it locally, then commit and push only the encrypted file.

## Project plans

Each project's `project.json` can have a `plan` (rules: `docs/PORTFOLIO_RULES.md` §3). `/update-portfolio` keeps it current along with status. Projects without one fall back to their `next` list and show "No plan yet". **`project.json` is public**, so plans follow the same never-publish rules as everything else.

## Not built yet

- Today's plan and card order live in one browser only. Syncing between Macs and the phone needs a small store (for example a table in a database the page signs in to).
- The trading snapshot is only as fresh as the last export.
