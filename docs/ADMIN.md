# Admin desk (`/admin/`)

A private page for Jason at https://lego651.github.io/portfolio/admin/. It isn't linked from the site, and search engines are told not to index it. It has three parts:

| Part | Where | Data comes from |
|---|---|---|
| **Plan** (top left) | Three views; opens on **Today** every time. **Today**: one day's hour grid (7am–9pm) with ‹ › to step days. **3 days**: today plus the next 2 side by side; drag items between days. **Month**: each day's theme; click a day to open it. Every day has its own typed theme (empty by default). Items: drag to move, **click to edit** (title, project, day, start, length), checkbox to mark done, × to delete. | Cached in the browser (`localStorage` key `admin.plan`). **Saved to the family-fridge database** through `PLAN_API`; see [`ADMIN_PLAN_API.md`](ADMIN_PLAN_API.md). The Plan header shows the save status. |
| **Trading** (bottom left) | Month of results **in R**: strategy switches, cumulative R line, heatmap with one dot per trade, win rate, R per trade, green days, best/worst day, and the trades of the day you click. | **Live from the family-fridge database** through `PLAN_API` → `GET /trades` ([`ADMIN_PLAN_API.md`](ADMIN_PLAN_API.md) §7), loaded each time the page opens. If that fails, `admin/data/trades.mock.json` (fake data, "sample data" badge, plus a warning saying why). |
| **Projects** (right) | Focus stack. The top card shows the full 4-week plan; drag ⋮⋮ to reorder. | `site.json` + `projects/<id>/project.json` → `plan` (written by `/update-portfolio`). Card order is saved in the browser. |

Files: `admin/index.html`, `admin/admin.css`, `admin/admin.js`, `admin/data/trades.mock.json` (sample trades).

**After changing `admin.js` or `admin.css`, bump the `?v=` on their links in `admin/index.html`** (use the short commit hash). GitHub Pages lets browsers cache files for 10 minutes, so without a new `?v=` a refresh can keep showing the old version.

## The password

- The page asks for a password before showing anything. The repo stores only its SHA-256 hash (`PASS_SHA256` in `admin/admin.js`), **never the password itself**. Don't write the password into any file, commit message or doc.
- The repo is public, so the hash check only hides the page. **No real data is in the repo.** Day plans and trades live in the family-fridge database, and the API returns them only to requests carrying the password.
- The unlocked password is kept in `sessionStorage` (this tab only) so reloads don't ask again. **Lock** clears it.
- **To change the password:** put the new hash in `admin/admin.js` (`node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' 'NEW_PASSWORD'`), and set the same hash as the API's `ADMIN_PASSWORD_SHA256` secret on the pomo651 Mac (`ADMIN_PLAN_API.md`, top).

## Trading data

Trades are read live from family-fridge's `trade_logs` through the API (`ADMIN_PLAN_API.md` §7). Nothing to export or commit. R rules: a loss is **−1R** and a win is **+1.5R** by default. A win with an edited take-profit is **+3R** or **+5R** once the trade log stores R; until then every win counts as 1.5R. Strategies are the four pairs: GC · NY, NQ · NY, MGC · Asia, MNQ · Asia. Trades without a result yet (open) show as **gray dots** and as "Open" in the day list. They don't count toward R, win rate or green days until they close.

`admin/data/trades.mock.json` is fake sample data in the same format. The page shows it only when the API can't be reached.

## Project plans

Each project's `project.json` can have a `plan` (rules: `docs/PORTFOLIO_RULES.md` §3). `/update-portfolio` keeps it current along with status. Projects without one fall back to their `next` list and show "No plan yet". **`project.json` is public**, so plans follow the same never-publish rules as everything else.

## Not built yet

- Project card order stays per browser (day plans sync through the database).
