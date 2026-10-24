# Desk Ideas refresh (members box) — agent procedure

> **HIDDEN (owner 2026-10-09 6:59 PM NZ).** The box is behind `NEXT_PUBLIC_MEMBERS_DESK_IDEAS`
> (default OFF), so it does not render on `/members`. **Skip this whole refresh while the flag is
> off** (no x calls, no ingest). Code, `data/desk-ideas.json`, `data/desk-ideas-accounts.json` and
> `scripts/desk-ideas-ingest.mjs` are kept. Resume this procedure only after the owner turns the
> flag on (build with `NEXT_PUBLIC_MEMBERS_DESK_IDEAS=1`).

Owner decision 2026-10-09: **Desk Ideas** is back on `/members` (Stocks tab → Sub Scanners). It is
**members only**, never on the homepage. **Unusual Options stays archived** (`archive/trade-ideas-from-x-2026-09-26/`): nothing from it goes on `/members` or the homepage.

X can only be read through the agent's **x connector**, so this is an agent step, not a script fetch.
Run it in the post-close routine **after** `refresh-full-pack.mjs` and **before** `npm run deploy`.
It is **non-fatal**: if any part fails, skip it, keep the previous `data/desk-ideas.json`, and deploy
anyway (the box then shows "held since <date>").

## Accounts

`data/desk-ideas-accounts.json` (edit there, not in code): **amitisinvesting, JonahLupton,
TraderJohnny_, MMMTwealth, ZeeContrarian1** (owner, 2026-10-09 6:36 PM / 6:40 PM NZ). Dropped: dannycheng2022, stocksavvyshay,
aleabitoreddit; PolymarketTrade and RyanDetrick were sampled and left out. The ingest ignores, and
removes from the file, any account not on the list.

## Steps (≤ 20 x calls; usually 2–4)

1. `SINCE` = now minus 7 days, as UTC ISO (e.g. `2026-10-02T22:30:00Z`).
2. Call `x` → `search_posts_all` with:
   - `query`: `(from:amitisinvesting OR from:JonahLupton OR from:TraderJohnny_ OR from:MMMTwealth OR from:ZeeContrarian1) -is:retweet -is:reply has:cashtags (bought OR buying OR added OR adding OR add OR "add more" OR "added more" OR "bought more" OR starter OR position OR long OR trimmed OR trimming OR "took profits" OR sold OR selling OR exited OR initiated OR doubled OR close)`
   - `start_time`: `SINCE`, `max_results`: 25, `sort_order`: `recency`
   - `post.fields`: `created_at,author_id,referenced_tweets`, `expansions`: `author_id`, `user.fields`: `username`
3. While `meta.next_token` is present, repeat the same call with `next_token` (stop at 20 calls total).
4. Save every returned post as one JSON array to
   `/home/box/canaries/cache/desk-ideas/candidates-<YYYY-MM-DD>.json`, each item
   `{ "id", "author": <username from includes.users>, "text", "created_at", "url", "referenced_tweets" }`.
   Copy the text exactly; do not add or edit posts.
5. Run: `node scripts/desk-ideas-ingest.mjs --in /home/box/canaries/cache/desk-ideas/candidates-<YYYY-MM-DD>.json`
   It keeps only clear first-person buy / add / new position / long / trim / sell posts with a
   `$TICKER` (e.g. "bought $MSFT $382.54", "started a small position in $AEHR", "long $SNDK for a
   relief bounce", "$HTFL add today", "Took a starter", "New Position $UBER", "I initiated a position in $UBER",
   "I doubled my position", "close 90% of the position"), drops news, analyst targets / PTs,
   intentions ("can add", "considering"), crypto, foreign listings, replies and reposts, keeps the
   latest move per account + ticker, writes our own short line ("Added more PLTR"),
   merges with the last 14 days, and writes `data/desk-ideas.json` (`asOf` = now).
6. Report the printed list (date, @account, idea) in the routine summary. Then deploy as usual.

## Rules

- Education only. The box never repeats returns, gains or performance claims; it shows ticker,
  account, a plain action (Add / Buy / Trim / Sell), post date, and a link to the original post.
- Ticker click opens the chart lightbox only when the ticker is in our universe.
- Not a Canary signal and not a Main Scanner / Bullish Setups condition.
- Do not add accounts or posts by hand outside this procedure; change the list in
  `data/desk-ideas-accounts.json` only with owner approval.
