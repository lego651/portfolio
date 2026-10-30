# Admin desk: plan API (save day plans in the family-fridge database)

**Who builds this:** Claude on the **pomo651 Mac**, which has the family-fridge project (`~/TEMP/family-fridge`) and its database access.
**Status (2026-10-29): built and live.** Endpoint `https://yvzsdncrpccxqbswemnt.supabase.co/functions/v1/portfolio-admin-plan`, set as `PLAN_API` in `admin/admin.js`. Code in the family-fridge repo: `backend/supabase/functions/portfolio-admin-plan/` (Edge Function, `verify_jwt = false` in `config.toml`) and migration `backend/supabase/migrations/20261030120000_portfolio_admin_plan_days.sql` (table `portfolio_admin_plan_days`, named for the portfolio so it stays apart from the app's tables). Redeploy from `~/@Pomo651/family-fridge/backend`: `supabase functions deploy portfolio-admin-plan --project-ref <ref>`. If the admin password changes, update the secret too: `supabase secrets set --project-ref <ref> ADMIN_PASSWORD_SHA256=<new hash>`.

**What was already done:** the admin page (`admin/admin.js`) already speaks this API. It only needs a URL in `PLAN_API`. Until then it saves in the browser, and the Plan header says "This browser only".

## 1. Goal

Day plans on the admin desk (each day's **theme** and its **to-do items**) must be saved in the **family-fridge database**, so the same plan shows on both Macs and the phone.

The admin page is a static site on GitHub Pages (`https://lego651.github.io/portfolio/admin/`). It can't hold database credentials, because the repo is public. So the browser talks to a **small HTTPS API** that family-fridge hosts, and only that API talks to the database:

```
browser (GitHub Pages)  ──HTTPS + password──▶  plan API (family-fridge side)  ──server credentials──▶  family-fridge DB
```

## 2. Before writing code: find out the stack

Read `~/TEMP/family-fridge` (README, CLAUDE.md, package.json, migrations, env example) and answer:

1. What is the database (Supabase/Postgres, SQLite, something else) and how are migrations applied?
2. Where can a public HTTPS endpoint live? Pick the option that fits what the project already deploys:
   - **Supabase** → a Supabase Edge Function (for example `admin-plan`) using the service-role key from its own env.
   - **An app with server routes** (for example Next.js on Vercel) → API routes under `/api/admin-plan/...`.
   - Neither → stop and ask Jason. Don't add new hosting on your own.
3. Tell Jason the plan in a few lines (where the table and endpoint go) before applying any migration or deploy.

**Rules:** don't change or delete existing family-fridge tables or data. Add only what this doc describes. Never commit secrets (keys, the password) to either repo.

## 3. Storage

One row per day. Postgres version (adapt the types if the DB differs):

```sql
create table if not exists admin_plan_days (
  date        date primary key,              -- the plan's day, YYYY-MM-DD
  theme       text not null default '',       -- free text, ≤ 80 chars
  items       jsonb not null default '[]',    -- array of items, see below
  updated_at  timestamptz not null default now()
);
-- Supabase: enable RLS and add NO policies, so only the server (service role) can read/write.
alter table admin_plan_days enable row level security;
```

Each element of `items`:

| Field | Type | Rule |
|---|---|---|
| `id` | string | Unique, made by the browser (UUID). Keep as-is. |
| `t` | string | Title, 1–200 chars. |
| `k` | string | Project key: a portfolio project id (`drop-note`, `agent-team`, `blackout-clock`, `family-fridge`…), `trading`, or `personal`. Accept any string of ≤ 40 chars `[a-z0-9-]`. |
| `s` | integer | Start, minutes after midnight (0–1439). |
| `d` | integer | Length in minutes (5–720). |
| `done` | boolean | Optional; `true` when checked off. |

Store `items` exactly as sent, after validation. The server never invents or reorders items.

## 4. API contract

Base URL = whatever you deploy, for example `https://<project>.supabase.co/functions/v1/admin-plan`. No trailing slash. All bodies are JSON.

### Auth (every request except `OPTIONS`)

- Header: `Authorization: Bearer <admin password>`. This is the same password as the admin page.
- The server keeps **only the hash** in an env var: `ADMIN_PASSWORD_SHA256=853178830297d5f3a785b6400fc255851c4eda32422c5abe7051271a214a4eee` (the same value as `PASS_SHA256` in `admin/admin.js`).
- Check `sha256_hex(token) == ADMIN_PASSWORD_SHA256` with a constant-time compare. On failure, return `401 {"error":"unauthorized"}`.
- Never log the `Authorization` header or the request body.

### CORS

- `Access-Control-Allow-Origin`: echo the request `Origin` **only if** it is `https://lego651.github.io` or `http://localhost:8000`.
- `Access-Control-Allow-Methods: GET, PUT, OPTIONS` and `Access-Control-Allow-Headers: Authorization, Content-Type`.
- Answer `OPTIONS` preflight with `204` and no auth check.

### `GET /days?from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns every saved day in the range, inclusive. The range can be at most 400 days (the page asks for one month at a time, or more on its first connection).

```json
200 { "days": { "2026-10-29": { "theme": "Ship the admin desk", "items": [ { "id": "…", "t": "Fix top beta bug", "k": "drop-note", "s": 660, "d": 60, "done": true } ], "updatedAt": "2026-10-29T21:40:00Z" } } }
```

Days with no row are simply missing from `days`.

### `PUT /days/:date`

Replaces that whole day. Body: `{ "theme": "…", "items": [ … ] }`.

- If `theme` is empty **and** `items` is empty → **delete** the row.
- Otherwise upsert, setting `updated_at = now()`.
- Validate: date format, theme ≤ 80 chars, ≤ 100 items, each item per the table above, body ≤ 64 KB. On failure, return `400 {"error":"<what's wrong>"}`.
- Response: `200 { "date": "2026-10-29", "updatedAt": "…" }`.

Moving an item between days is two PUTs (the old day and the new day). Two devices editing the same day: **last write wins**. That's acceptable for one user.

### Errors

Always JSON: `400` invalid input, `401` bad password, `404` unknown route, `413` too large, `500` server error (generic message; details only in server logs).

## 5. Connect the page

1. Deploy the API and set `ADMIN_PASSWORD_SHA256` (plus the DB credentials it needs) in its environment.
2. Test with curl. Ask Jason for the password in the session, and don't save it to a file:
   ```bash
   API=https://…/admin-plan; PW='…'
   curl -s "$API/days?from=2026-10-01&to=2026-10-31" -H "Authorization: Bearer $PW"          # → {"days":{…}}
   curl -s -X PUT "$API/days/2026-12-31" -H "Authorization: Bearer $PW" -H "Content-Type: application/json" \
        -d '{"theme":"test","items":[]}'                                                  # → {"date":…}
   curl -s -X PUT "$API/days/2026-12-31" -H "Authorization: Bearer $PW" -H "Content-Type: application/json" \
        -d '{"theme":"","items":[]}'                                                      # deletes the test row
   curl -s -o /dev/null -w "%{http_code}\n" "$API/days?from=2026-10-01&to=2026-10-31" -H "Authorization: Bearer wrong"   # → 401
   ```
3. In this repo, set the URL in `admin/admin.js`: `const PLAN_API = "https://…/admin-plan";`. Then bump `?v=` on both asset links in `admin/index.html` (see docs/ADMIN.md).
4. Check locally: `python3 -m http.server 8000`, open http://localhost:8000/admin/, unlock. The Plan header should say **Saved**. Add an item, reload, and it's still there. Open the page in a second browser: the same item shows.
5. Commit and push: `git commit -m "feat(admin): save day plans to the family-fridge database"`. The page deploys in about a minute.

On its first connection, each browser uploads days it had saved locally that the database doesn't have yet. After that, the database is the source of truth.

## 6. Done when

- [ ] Table and endpoint exist; no existing family-fridge data changed.
- [ ] curl checks in §5 pass, including `401` for a wrong password and CORS for `https://lego651.github.io`.
- [ ] `PLAN_API` is set; the Plan header shows **Saved**; an item added in one browser appears in another after reload.
- [ ] No secret, key or password in either repo (`git grep` for the key and the password before pushing).
- [ ] Jason is told the API URL, where the code lives, and how to redeploy it.

## How the page uses the API (for reference)

`admin/admin.js` → `PLAN_API`, `api()`, `touch()`, `flush()`, `need()`, `connect()`:
- Every change caches the day in the browser, then PUTs it about 0.6s later. Failed saves are kept (`admin.plan.pending`) and retried every 20s and on reload. The header shows "Not saved yet, retrying".
- Opening a day, the 3-day view or a month GETs that month once per page load. Unsaved local edits win over what the server returns.
