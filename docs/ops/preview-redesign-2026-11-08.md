# Preview redesign (2026-11-08)

This branch has two layers.

1. `a0d40db` syncs the sanitized 2026-11-08 live source, config, and public files from the three supplied ZIPs onto `backup/production-snapshot-2026-10-25`.
2. The following commit is the redesign preview. It does not deploy, email, migrate a live database, or change Stripe prices.

## Pull request base

Base: `backup/production-snapshot-2026-10-25`.

GitHub `main` was not used. It is an empty marker, and the October 25 snapshot is behind the live tree. The diff against that snapshot therefore includes the baseline sync plus this preview. Review the baseline commit separately from the feature commit.

Files that existed only in the October snapshot (the `data/` pack, docs, repo metadata) were kept. The ZIPs did not include them. They were not "restored" over the newer source.

## Not in the supplied source

- The whole `data/` pack, including the 2026-11-06 daily pack and Worker `114c2bb2`. The preview still reads the October snapshot files (composite through 2026-10-23).
- `data/ticker-tape.json`, `data/cci-fairy.json`, and `data/new-highs-lows.json`. Empty labelled fixtures were added so the app boots. No tickers, Fairy rows, or highs/lows were invented. The tape light is the snapshot composite (`red`, S=-0.535 on 2026-10-23).
- A dated composite archive. The only real series is `data/state.json` notes, 2026-10-13 through 2026-10-23, with gaps. The chart uses that log and says so. 2026-11-06 is unknown.
- The owner "learn about canaries" video. The paid dialog says the video is coming. No substitute file is played.
- A D1 schema for a free plan. Production accounts mode is unchanged and still requires a paid entitlement.

Held Backtest and Engulfing work was not merged.

## Provisional choices

- Free Decide access is a read-only overview. How-to-read notes are paid.
- Canary mark groups are labelled provisional: Trend & continuation, Pullbacks & bottoming, Warnings. Indicator math is unchanged.
- Member tuition is shown as `$70 USD/hr` because the same card and the membership plans are already USD.
- Founding prices stay US$35/mo billed annually (US$420/yr), with founding monthly US$70/mo secondary. Stripe price IDs and amounts were not edited.
- The TradingView grant sentence is shown only when a D1 `indicator_grant_tasks` row for that email is `done`. This preview cannot see a grant, so it does not claim one.
- Fish, Smiley, Fairy, and MFI need the composite colour recorded for that session. Red is hidden. Missing dates stay pending and are not zero. Sweaty, Skull, and monthly trend are not gated. Raw JSON files are not rewritten.

## Hydration

`next dev --hostname 0.0.0.0` allows origin host `0.0.0.0` only. A browser at `http://127.0.0.1` sends `Origin: http://127.0.0.1:3456`, and Next's dev cross-site check answers the HMR upgrade with a raw `Unauthorized` body. Chrome then reports an invalid websocket handshake, and `hydrate()` never gets past `await initialServerResponse`, so clicks do nothing.

`allowedDevOrigins` includes `127.0.0.1` and `localhost`. Run the preview with `--hostname 127.0.0.1`.

## Upgrade journey (preview)

Free Decide and the ETF tab are the confirmed free surface. Other tabs render generic blurred bars and an upgrade box. They do not include paid rows. Checkout is a Canary handoff under `/preview/checkout`. It does not call Stripe. A verified simulated payment writes `data/preview-fulfillment.json` and only then refreshes the preview cookie. `?checkout=success` alone does not unlock. The backup outbox stays `pending` until a separate simulated sync. Access does not wait for that sync.

Production still uses `/api/stripe/webhook` (signature check, idempotent `stripe_events`, D1 subscription rows) and the CSV exporters in `scripts/export-members-sheet.mjs` and `scripts/export-indicator-buyers.mjs`. There is no durable membership backup outbox in production. The preview file is not that outbox and is not a production backup.

## Preview entitlement

Set `CANARY_PREVIEW_TIER=1` and run outside production (`next dev`). The httpOnly cookie is ignored when the flag is off or `NODE_ENV` is production. A stub members cookie or a real paid entitlement stays paid. Free signup stores optional marketing consent in gitignored `data/preview-consents.json` and does not send mail.

Direct `/_chartdata/*` URLs return 404. Free chart requests are limited to the Sector ETF universe and locked layers are removed on the server.
