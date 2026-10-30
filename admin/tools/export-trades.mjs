// Exports Jason's trades from the family-fridge Supabase database into admin/data/trades.json
// (plain, git-ignored), the format in docs/ADMIN.md. Then run encrypt-trades.mjs.
//   node admin/tools/export-trades.mjs [out=admin/data/trades.json]
// Read only: one SELECT through the supabase CLI's linked login (`supabase db query --linked`),
// so no database keys live in this repo. FAMILY_FRIDGE_DIR overrides the family-fridge checkout.
//
// trade_logs has no R, strategy or take-profit columns, only result win/loss and the symbol, so:
//   r = -1 for a loss, +1.5 for a win (the default R); trades with no result yet (still open) are
//   left out until they close; tpEdited = false;
//   strategy = the pair: GC and NQ are the NY-session strategies, MGC and MNQ the Asia-session ones.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const [, , output = "admin/data/trades.json"] = process.argv;
const dir = process.env.FAMILY_FRIDGE_DIR || join(homedir(), "@Pomo651/family-fridge");
const ref = JSON.parse(readFileSync(join(dir, "backend/supabase/.temp/linked-project.json"), "utf8")).ref;

// Local trading day in the trader's own time zone; only traders named Jason.
const sql = `
  select to_char(t.created_at at time zone u.timezone, 'YYYY-MM-DD') as date,
         to_char(t.created_at at time zone u.timezone, 'HH24:MI') as time,
         t.pair, t.result,
         to_char(now() at time zone u.timezone, 'YYYY-MM-DD') as today
  from public.trade_logs t join public.users u on u.id = t.trader_user_id
  where u.name ilike 'jason%' and t.result is not null
  order by t.created_at`;

const raw = execFileSync("supabase", ["db", "query", "--linked", "--project-ref", ref, sql], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const rows = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
if (!rows?.length) { console.error("No trades returned from trade_logs."); process.exit(1); }

// Display order; a pair not listed here becomes its own strategy, appended.
const STRATEGIES = [
  { id: "gc", name: "GC · NY", pair: "GC" },
  { id: "nq", name: "NQ · NY", pair: "NQ" },
  { id: "mgc", name: "MGC · Asia", pair: "MGC" },
  { id: "mnq", name: "MNQ · Asia", pair: "MNQ" },
];
const R = { loss: -1, win: 1.5 };

const strategies = STRATEGIES.map(({ id, name }) => ({ id, name }));
const trades = rows.map((t) => {
  let s = STRATEGIES.find((x) => x.pair === t.pair);
  if (!s) {
    s = { id: t.pair.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: t.pair, pair: t.pair };
    STRATEGIES.push(s);
    strategies.push({ id: s.id, name: s.name });
  }
  return { date: t.date, time: t.time, strategy: s.id, r: R[t.result], tpEdited: false };
});

writeFileSync(output, JSON.stringify({ asOf: rows[0].today, strategies, trades }, null, 2) + "\n");
console.log(`Exported ${trades.length} trades (${strategies.map((s) => s.name).join(", ")}) → ${output}`);
