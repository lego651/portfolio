// All site content lives here. Edit this file to change the portfolio.
// Projects are listed in display order; the first one is featured on the home page.
// Timeline events (ev) are newest first. Event types: ship, fix, dec (decision), start.

window.SITE = {
  name: "Jason",
  tagline: "AI product builder · open to new roles",
  // TODO: replace with your real bio
  bio: "Placeholder bio: I build AI products end to end, and I run a team of AI agents that ships code every day.",
  kpis: [["4", "AI projects"], ["213", "commits on drop-note"], ["85", "PRs merged"], ["7", "AI agents on my team"]],
};

window.PROJECTS = [
  {
    id: "drop-note", name: "drop-note", status: "live", statusLabel: "Live · beta",
    short: "Email anything to one address. AI summarizes and tags it, and you browse it all in a clean dashboard.",
    imgs: ["dn-hero", "dn-app"],
    stack: "Next.js 15, Supabase, OpenAI, SendGrid, Vercel",
    link: "https://dropnote.me",
    stats: [["213", "commits"], ["85", "PRs merged"], ["7", "months"]],
    hl: [
      "One address, drop@dropnote.me, saves articles, links, PDFs and notes",
      "AI writes a summary and tags for every item in seconds",
      "Envelopes turn saved items into a plan you can tick off",
      "Own design system, Airmail, in light and dark",
    ],
    ev: [
      { d: "2026-10-24", ty: "ship", t: "Envelopes: Mood Sheet and daily idea pool", b: "Pick a mood and get a plan built from your own saved items. Also fixed search for Chinese queries." },
      { d: "2026-10-20", ty: "fix", t: "Mobile pass: 12 fixes in 2 days", b: "44px tap targets everywhere, iOS double-scroll fixed, admin tables usable on phones." },
      { d: "2026-10-18", ty: "ship", t: "Envelopes v1: turn saved items into plans", b: "Select items, generate an editable plan, tick lines off, regenerate with edits." },
      { d: "2026-10-16", ty: "dec", t: "Airmail redesign; dropped Redis", b: "Adopted a postal-themed design system. Moved rate limits into Postgres, removing a paid service." },
      { d: "2026-10-10", ty: "dec", t: "Handed engineering to an AI agent team", b: "Agents work tickets in isolated branches. I review and merge." },
      { d: "2026-05-30", ty: "dec", t: "Alpha complete; went hosted-only", b: "All planned features shipped. Dropped the open-source plan to focus on one hosted product." },
      { d: "2026-03-26", ty: "start", t: "First commit", b: "Monorepo, database schema with row-level security, and Google sign-in on day one." },
    ],
  },
  {
    id: "agent-team", name: "AI agent team", status: "run", statusLabel: "Running daily",
    short: "A small company of AI agents that plans, codes, tests and opens pull requests on drop-note. I set goals and merge.",
    imgs: ["pc"],
    stack: "Paperclip, Claude Code, git worktrees, GitHub",
    stats: [["7", "agents"], ["6", "tickets shipped in one day"], ["5 min", "watchdog check"]],
    hl: [
      "CEO, CTO, CMO and Release Engineer roles, each with its own job",
      "Every agent codes in its own git worktree, so work never collides",
      "A Release Engineer agent verifies each PR before I look at it",
      "A watchdog checks every 5 minutes and restarts stalled runs",
    ],
    ev: [
      { d: "2026-10-24", ty: "ship", t: "Six tickets in parallel, merged the same day", b: "Envelopes backend, UI, retrieval and a search fix ran side by side without conflicts." },
      { d: "2026-10-19", ty: "dec", t: "Agents wrote their own merge standard", b: "A mobile-friendly-before-merge checklist every PR now has to pass." },
      { d: "2026-10-19", ty: "ship", t: "Watchdog and concurrency caps", b: "A 5-minute check restarts stalled runs. Caps keep the team from overloading itself." },
      { d: "2026-10-16", ty: "ship", t: "First all-hands", b: "Agents proposed new product features; I picked which to build." },
      { d: "2026-10-10", ty: "start", t: "Team set up", b: "Each agent works in its own git worktree. Nothing public ships without my approval." },
    ],
  },
  {
    id: "blackout-clock", name: "Blackout Clock", status: "con", statusLabel: "Concept",
    short: "A news calendar for prop-firm traders that shows which of their accounts are blocked by each firm's news rules.",
    imgs: ["bc-screens", "bc-rows"],
    stack: "Mobile web + push (planned)",
    stats: [["10", "accounts per trader"], ["3", "views designed"], ["1", "design system"]],
    hl: [
      "Now, Today and Week views show every account's lock status at a glance",
      "Rule Radar flags when a firm changes its news rules",
      "Always shows the rule's source: guidance, not a guarantee",
      "Departure Board design system with split-flap countdowns",
    ],
    ev: [
      { d: "2026-10-24", ty: "dec", t: "Explored a broader AI trading desk", b: "Researched folding Blackout Clock into a multi-agent trading assistant." },
      { d: "2026-10-17", ty: "dec", t: "Design direction: Departure Board", b: "A dark, airport-board look for the Now, Today and Week views." },
      { d: "2026-10-17", ty: "dec", t: "Product decisions locked", b: "Forex and CFD firms first, staff-verified rules, always show the rule's source." },
      { d: "2026-10-17", ty: "start", t: "Research and PRD", b: "Mapped how prop firms restrict trading around news events." },
    ],
  },
  {
    id: "family-fridge", name: "Family Fridge", status: "con", statusLabel: "Concept",
    short: "An iOS app where a family logs meals by photo or voice. AI estimates the calories and everyone sees it.",
    imgs: ["ff-phones"],
    stack: "iOS, TestFlight (planned)",
    stats: [["1", "tap to log"], ["2", "ways in: photo or voice"], ["0", "calorie targets for kids"]],
    hl: [
      "A Family Board home with one tile per person",
      "Log a meal by photo or voice; AI estimates calories",
      "Any adult can log for a kid; kids need no account",
      "Kid profiles track meals, not calories, following pediatric guidance",
    ],
    ev: [
      { d: "2026-10-17", ty: "dec", t: "Visual direction: Gallery Wall", b: "Picked from six directions after asking for something more polished." },
      { d: "2026-10-17", ty: "dec", t: "Product shape agreed", b: "A Family Board home, one-tap photo/voice capture, and an activity feed." },
      { d: "2026-10-17", ty: "start", t: "Requirements", b: "Family accounts and kid profiles without logins or calorie targets." },
    ],
  },
];
