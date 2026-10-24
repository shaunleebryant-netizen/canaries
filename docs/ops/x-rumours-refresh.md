# X Rumours refresh (members Stocks tab) — agent procedure

Owner approved 2026-10-10; ships with the **Tue 13 Oct 11:24 AM NZ** post-close update.
X Rumours is the full-width row **directly under Insider Buying** on the members **Stocks** tab
(flag `NEXT_PUBLIC_MEMBERS_X_RUMOURS`, default ON; build with `=0` to hide). Members only, never on
the homepage. Rumours aren't facts; education only. We write each line **in our own words**, credit
the outlet, and link out. **No post text is embedded or copied.**

X can only be read through the agent's **x connector**, so discovery is an agent step (same two-step
pattern as Desk Ideas): the agent reads X and saves the raw results; scripts do every check.
Run it in the post-close routine **after** `refresh-full-pack.mjs` and **before** `npm run deploy`.
It is **non-fatal**: on any failure skip it, keep the previous `data/x-rumours.json` (pack step 8f has
already refreshed move-since, expiry and the SEC re-check) and deploy anyway.

## What qualifies

- **Stocks in our universe only** (`data/fish-universe.json` minus ETFs, metals, crypto).
- **Types** (`data/x-rumours-config.json`): M&A, Activist, Partnership, Supply deal, Financing,
  Regulatory/FDA, Spin-off, Index. Earnings, analyst targets, layoffs, lawsuits etc. are out.
- **Source gate:** a named outlet (Bloomberg, Reuters, WSJ, FT, The Information, CNBC, Business
  Insider, Washington Post, … see `outlets` in the config; a post from the outlet's own X account,
  e.g. `@business`, counts) **or** a party source (company announcement, index provider, activist
  letter, SEC filing). Trader chatter with no source is filtered.
- **Corroboration:** ≥ 2 independent sources (distinct authors / X news stories), or 1 source plus a
  matching SEC filing. Otherwise → audit as "Unconfirmed".
- **Ticker match:** the company must be the subject of the deal in the evidence (its name or
  cashtag near a deal word, in an outlet-citing post or X news story, or in ≥ 2 items). Stops
  mis-tickers (e.g. a post calling WDC the TDK bidder when Bloomberg named Seagate).
- **Own words:** the line may not share an 8-word run with any evidence text; ≤ 220 characters.
- **Status:** 🔴 **Denied** only when **the row's own company** (the ticker) denies it: the story's
  `deniedBy` must be one of the ticker's names, and a `denialEvidence` item must name it right before
  denial wording. A denial or dispute by **anyone else** (the rival bidder, the other party, Musk,
  etc.) keeps the status (Reported / Confirmed) and adds a short note shown in grey under the rumour
  line (`denialNote`, e.g. "Toshiba disputed the report; Seagate hasn't commented.") (owner rule
  2026-10-10). 🟢 **Confirmed**: company / filing / other party said so (`confirmEvidence` with party
  wording, or the SEC check). 🟡 **Reported**: named outlet only.
- **SEC check** (`data.sec.gov/submissions/CIK##########.json`, UA `Canary Dashboard research
  shaun@canarydashboard.com`, ≤ 5 req/s): 8-K items 1.01 / 2.01 / 7.01 / 8.01, SC 13D(/A), SC TO-T /
  TO-C / TO-I, SC 14D9, DEFM14A / PREM14A, 425 filed from first-seen − 5 days; up to 6 documents are
  opened and must mention the **counterparty** keyword (never the subject's own name). A match
  upgrades the row to Confirmed and links the filing.
- **Expiry:** a row with no update for **10 sessions** is removed (log keeps it as Stale).
- **De-dup:** key = ticker | type | first counterparty keyword; reruns merge into the same row.
- **Move since:** Yahoo daily close before the story first appeared (previous session if first seen
  before 4 pm ET, else that day's close) to the latest close. Not a forecast.

## Steps (≤ 25 X reads a night)

`D` = the pack `sessionDate` (US session, `YYYY-MM-DD`). `C` = `/home/box/canaries/cache/x-rumours`.

1. **Plan.** `node scripts/x-rumours-raw.mjs --plan --since <last run's UTC time, or now − 36 h>`
   prints the exact discovery calls as JSON: 3 `x` → `search_news` (36 h) and one `x` →
   `search_posts_all` per cashtag batch of the universe (currently 3 batches for 198 stocks), each
   with the deal-keyword and source-keyword filters and `-is:retweet`. ~6 reads.
2. **Discover.** Make each call exactly as printed with `write_to_file: true`.
3. **Verify (≤ 19 reads left).** For each candidate story on a universe stock, one targeted
   `search_posts_all` or `search_news` (e.g. `"Seagate TDK (Toshiba OR denied OR Bloomberg)"`,
   `from:Reuters OR from:business OR from:WSJ` + company) to find a second source, the outlet's own
   post, the company release, or a denial. Also re-check rows already shown that are still Reported.
   Stop at 25 reads total.
4. **Merge raw.** `node scripts/x-rumours-raw.mjs --out C/raw-D.json --x-reads <n> <all result files>`
   (copies posts/news exactly; dedupes by id). `--list C/raw-D.json` prints a compact list.
5. **Draft stories** in `C/stories-D.json`, in our own words:
   ```json
   { "stories": [ { "ticker": "STX", "type": "M&A", "claim": "reported|confirmed|denied",
       "source": "Bloomberg", "partyKeywords": ["TDK"],
       "line": "Seagate was reported to be bidding …",
       "evidence": ["<post or news ids>"], "confirmEvidence": [], "denialEvidence": [],
       "deniedBy": "Toshiba", "denialNote": "Toshiba disputed the report; Seagate hasn't commented.",
       "statusNote": "optional short note", "link": "https://x.com/<outlet or best source>/status/<id>" } ],
     "rejected": [ { "ticker": "VKTX", "why": "buyout chatter, no named source", "link": "" } ] }
   ```
   `partyKeywords` = the **counterparty** (target / bidder / activist / lender / index), not the
   subject company. `deniedBy` = who denied/disputed (only the ticker's own company makes it Denied);
   `denialNote` = the short grey note used when someone else did. `link` should be the outlet's own post or the clearest sourced post.
   Then `node scripts/x-rumours-raw.mjs --out C/raw-D.json --stories C/stories-D.json`.
6. **Check:** `node scripts/x-rumours-ingest.mjs --in C/raw-D.json --session-date D --dry-run`.
   Fix only your own drafting (wrong ids, copied wording); never loosen a rule to get a row in.
7. **Write:** same command without `--dry-run`. Writes `data/x-rumours.json` (rows + log of first
   shown / status changes / removals) and the owner-only `data/private/x-rumours-audit.json`, and
   mirrors both to `/home/box/canaries/` (`private/` for the audit).
8. Continue with build/deploy as usual. Report: rows shown (R/C/D), filtered count, X reads used.

## Pack step (no X)

`scripts/refresh-full-pack.mjs` step 8f runs
`node scripts/x-rumours-ingest.mjs --refresh-only --session-date <sessionDate>`: Move since, expiry,
SEC re-check of Reported rows. Non-fatal; manifest key `xRumours`.

## SEC test

`node scripts/x-rumours-ingest.mjs --sec-test SWKS "Qorvo" 2026-10-06 M&A` → 8-K filed 2026-10-07
(items 1.01, 2.03, 9.01). Negative control: `--sec-test ESTC "Zzyzx Capital" 2026-10-04` → no match.

## Never

- Never copy or embed post text on the page; never add our own views or price calls.
- Never show the audit on member pages (it lives in `data/private/`, shown on `/owner` only).
- Never exceed 25 X reads a night (x limits: 30/min, 1000/day).
