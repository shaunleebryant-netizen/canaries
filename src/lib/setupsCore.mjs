/**
 * Main Scanner rules — Bullish Setups / Bearish Setups.
 * Plain JS so both the Next.js members page (via bullishSetups.ts /
 * bearishSetups.ts) and scripts/refresh-full-pack.mjs (manifest report) use the
 * exact same logic on the same pack data and one as-of date.
 *
 * A ticker qualifies with >= SETUPS_MIN_CONDITIONS distinct conditions AND at
 * least one recent timing print (rules v2, owner 2026-09-25):
 *   Bullish timing = 🐟 / 😊 / 🤑 ; Bearish timing = 😡 / 🥵 / 💀.
 * Weekly state, Monthly 20MA and IBD count toward the total but cannot
 * qualify a ticker on their own.
 * A ticker that also qualifies for Bearish Setups on the same as-of is left
 * out of Bullish Setups (Bearish unchanged; owner 2026-09-25).
 * Bullish (each counted once):
 *   fish    🐟  equity Fish box print (fish/both) within 14 calendar days of asOf
 *   smile   😊  smile print within 14d — equity Fish box (smile/both) or ETF Watch smile
 *   mfi_os  💵  MFI Washout v6.1 bottomSignal print within the last 5 TRADING days (owner 2026-10-06;
 *               not the 14-calendar-day window). Calendar = money-flow-alerts.json sessionDates.
 *   weekly_bull 🟢 current weekly Market State = bull (green); dots = min(weeks,3); ONE condition
 *   monthly_20ma 📈 in Monthly 20MA output (this month or last)
 *   ibd     IBD  in IBD Setups box
 * Bearish:
 *   mfi_ob  🍒  RETIRED 2026-10-06 (old MFI ≥ 80 zone; v6 has no sell side, so no new prints)
 *   sweaty  🥵  Sweaty (exhaustion) print within 14d
 *   skull   💀  Skull print within 14d
 *   weekly_bear 🔴 current weekly Market State = bear (red); dots = min(weeks,3); ONE condition
 *
 * Per-kind print dates: rows carrying several kinds (equity Fish "both", ETF
 * Watch multi-signal rows) record each kind's date in the note
 * ("smile@YYYY-MM-DD" / "🙂@YYYY-MM-DD"); that date is used when present,
 * else the row asOf. Never invents prints; empty is OK.
 * Added date ("qualified since"): each condition has a `since` date —
 *   prints: earliest in-window print (condition true continuously since then);
 *   weekly state: first week of the weeks-in-state run (sinceWeek);
 *   Monthly 20MA: first day of the cross month (this month / last month);
 *   IBD: the IBD scan date.
 * computedAdded = the date the ticker first met both rules: the later of the
 * 2nd-earliest condition `since` and the earliest timing-print `since`.
 * applySetupsHistory() keeps a ticker's original added date while it stays
 * qualified run-to-run (data/setups-history.json) and resets once it drops out.
 * Sort: count desc, then added desc (newest first), then ticker.
 */

export const SETUPS_WINDOW_DAYS = 14;
/** Owner 2026-10-06: "Count MFI 💵 from the last 5 trading days only" (other kinds keep 14 calendar days). */
export const MFI_WINDOW_TRADING_DAYS = 5;
export const SETUPS_MIN_CONDITIONS = 2;
/** Bump when qualification rules change — prior history is discarded (dates reset). */
export const SETUPS_RULES_VERSION = 2;
/** Timing prints: at least one must be present (within the 14-day window). */
export const BULLISH_TIMING_IDS = ["fish", "smile", "mfi_os"];
export const BEARISH_TIMING_IDS = ["mfi_ob", "sweaty", "skull"];

const KIND_NOTE_TAGS = {
  smile: ["smile@", "🙂@"],
  fish: ["fish@", "🐟@"],
  exhaustion: ["exhaustion@", "🥵@"],
  skull: ["skull@", "💀@"],
};

function norm(t) {
  return String(t || "").trim().toUpperCase();
}

function dayNum(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Calendar days from print date back to asOf (asOf - d). */
export function daysBefore(asOf, d) {
  return Math.round(dayNum(asOf) - dayNum(d));
}

function inWindow(asOf, d) {
  if (!d || !asOf) return false;
  return daysBefore(asOf, d) <= SETUPS_WINDOW_DAYS;
}

/**
 * Earliest date that still counts for MFI 💵: the Nth most recent trading session on or before asOf
 * (N = MFI_WINDOW_TRADING_DAYS). Uses the scan's session calendar; falls back to weekdays.
 */
export function mfiCutoffDate(asOf, sessionDates) {
  const n = MFI_WINDOW_TRADING_DAYS;
  const ds = [...new Set((sessionDates || []).filter((d) => typeof d === "string" && d <= asOf))].sort().reverse();
  if (!ds.includes(asOf)) ds.unshift(asOf);
  if (ds.length >= n) return ds[n - 1];
  let t = dayNum(asOf);
  let count = 0;
  for (;;) {
    const dow = new Date(t * 86_400_000).getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
    if (count === n) break;
    t -= 1;
  }
  return new Date(t * 86_400_000).toISOString().slice(0, 10);
}

/** Date of one kind inside a multi-kind row (note tag), else row asOf. */
export function kindDate(row, kind) {
  const explicit = row?.[`${kind}AsOf`];
  if (typeof explicit === "string" && /^\d{4}-\d{2}-\d{2}/.test(explicit)) return explicit.slice(0, 10);
  const note = typeof row?.note === "string" ? row.note : "";
  for (const tag of KIND_NOTE_TAGS[kind] || []) {
    const i = note.indexOf(tag);
    if (i >= 0) {
      const m = note.slice(i + tag.length).match(/^\d{4}-\d{2}-\d{2}/);
      if (m) return m[0];
    }
  }
  return row?.asOf ?? null;
}

/** First day of the Monthly 20MA cross month (YYYY-MM-01). */
function monthlyCrossStart(r) {
  const month = typeof r.month === "string" ? r.month.slice(0, 7) : null;
  if (!month) return null;
  if (r.cross !== "last_month") return `${month}-01`;
  let [y, m] = month.split("-").map(Number);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function sortSetups(rows) {
  rows.sort(
    (a, b) =>
      b.count - a.count ||
      String(b.added ?? "").localeCompare(String(a.added ?? "")) ||
      a.ticker.localeCompare(b.ticker)
  );
  return rows;
}

/**
 * Carry forward added dates from the previous run's history. A ticker that was
 * qualified last run and still qualifies keeps its original added date; new
 * qualifiers use computedAdded; drop-outs are removed (reset on re-entry).
 * Returns updated setups (sorted) and the new history document.
 */
export function applySetupsHistory(result, prevHistory) {
  const prevOk =
    prevHistory &&
    typeof prevHistory === "object" &&
    prevHistory.rulesVersion === SETUPS_RULES_VERSION;
  // Rule change → discard prior added dates (every ticker re-dated under new rules).
  const prev = prevOk ? prevHistory : {};
  const side = (name) => {
    const prevSide = prev[name] && typeof prev[name] === "object" ? prev[name] : {};
    const hist = {};
    const rows = result[name].map((row) => {
      const p = prevSide[row.ticker];
      const keep =
        p && typeof p.added === "string" && p.added <= (result.asOf || p.added);
      const added = keep ? p.added : row.computedAdded;
      hist[row.ticker] = {
        added,
        count: row.count,
        conditions: row.conditions.map((c) => c.id),
        lastQualifiedAsOf: result.asOf,
      };
      return { ...row, added };
    });
    sortSetups(rows);
    return { rows, hist };
  };
  const bull = side("bullish");
  const bear = side("bearish");
  const excludedFromBullish = result.excludedFromBullish ?? [];
  return {
    asOf: result.asOf,
    bullish: bull.rows,
    bearish: bear.rows,
    excludedFromBullish,
    history: {
      asOf: result.asOf,
      rulesVersion: SETUPS_RULES_VERSION,
      note:
        "Main Scanner added dates — ticker keeps its original added date while it stays qualified run-to-run; resets after dropping out. Written by refresh-full-pack.mjs.",
      bullish: bull.hist,
      bearish: bear.hist,
      // Met Bullish but also meet Bearish this as-of → left out of Bullish.
      excludedFromBullish,
    },
  };
}

function dots(weeks) {
  return Math.max(1, Math.min(Number(weeks) || 1, 3));
}

/**
 * @param {object} input
 * @param {string} input.asOf pack session date (YYYY-MM-DD)
 */
export function computeMainScanner(input) {
  const {
    asOf,
    fish = [],
    etfWatch = [],
    moneyFlow = [],
    mfiSessionDates = [],
    exhaustion = [],
    ibd = [],
    marketStates = [],
    monthly20 = [],
  } = input;

  /** ticker -> { conditions: Map(id -> cond) } */
  const bull = new Map();
  const bear = new Map();
  const add = (side, ticker, cond) => {
    const key = norm(ticker);
    if (!key) return;
    let e = side.get(key);
    if (!e) {
      e = new Map();
      side.set(key, e);
    }
    const prev = e.get(cond.id);
    // Counted once; keep the earliest in-window print (true since then).
    if (!prev || (cond.since && (!prev.since || cond.since < prev.since))) {
      e.set(cond.id, cond);
    }
  };

  // Equity Fish box: fish / smile (both = two kinds, dated separately).
  for (const r of fish) {
    const kinds =
      r.signal === "both" ? ["fish", "smile"] : r.signal === "fish" ? ["fish"] : r.signal === "smile" ? ["smile"] : [];
    for (const k of kinds) {
      const d = kindDate(r, k);
      if (!inWindow(asOf, d)) continue;
      add(bull, r.ticker, {
        id: k,
        since: d,
        source: "Fish",
        detail: `${k === "fish" ? "🐟 fish" : "😊 smile"} @ ${d} (Fish box)`,
      });
    }
  }
  // ETF Watch smile only (ETF Watch fish is not in the rule).
  for (const r of etfWatch) {
    if (!Array.isArray(r.signals) || !r.signals.includes("smile")) continue;
    const d = kindDate(r, "smile");
    if (!inWindow(asOf, d)) continue;
    add(bull, r.ticker, { id: "smile", since: d, source: "ETF Watch", detail: `😊 smile @ ${d} (ETF Watch)` });
  }
  // MFI: 💵 washout prints from the last 5 trading days only; retired 🍒 keeps the 14-day window.
  const mfiCutoff = mfiCutoffDate(asOf, mfiSessionDates);
  for (const r of moneyFlow) {
    const mfi = typeof r.mfi === "number" ? ` MFI ${r.mfi}` : "";
    if (r.signal === "mfi_os") {
      if (!r.asOf || r.asOf < mfiCutoff || r.asOf > asOf) continue;
      add(bull, r.ticker, { id: "mfi_os", since: r.asOf, detail: `💵${mfi} @ ${r.asOf}` });
      continue;
    }
    if (!inWindow(asOf, r.asOf)) continue;
    if (r.signal === "mfi_ob") {
      add(bear, r.ticker, { id: "mfi_ob", since: r.asOf, detail: `😡${mfi} @ ${r.asOf}` });
    }
  }
  // Sweaty box: latest 🥵 and latest 💀 per ticker (separate kinds + dates).
  for (const r of exhaustion) {
    const kinds = Array.isArray(r.signals) && r.signals.length ? r.signals : [r.signal];
    for (const k of kinds) {
      if (k !== "exhaustion" && k !== "skull") continue;
      const d = (k === "exhaustion" ? r.exhaustionAsOf : r.skullAsOf) || kindDate(r, k);
      if (!inWindow(asOf, d)) continue;
      add(bear, r.ticker, {
        id: k === "exhaustion" ? "sweaty" : "skull",
        since: d,
        detail: `${k === "exhaustion" ? "🥵 sweaty" : "💀 skull"} @ ${d}`,
      });
    }
  }
  // IBD Setups box (current scan).
  for (const r of ibd) {
    add(bull, r.ticker, {
      id: "ibd",
      since: r.asOf ?? null,
      detail: `IBD setup${typeof r.rsRating === "number" ? ` RS ${r.rsRating}` : ""}${r.asOf ? ` @ ${r.asOf}` : ""}`,
    });
  }
  // Weekly Market State (state, not a dated print).
  for (const r of marketStates) {
    if (r.state === "bull") {
      add(bull, r.ticker, {
        id: "weekly_bull",
        since: r.sinceWeek ?? null,
        weeks: r.weeksInState,
        dots: dots(r.weeksInState),
        detail: `weekly green (bull) ${r.weeksInState} wk`,
      });
    } else if (r.state === "bear") {
      add(bear, r.ticker, {
        id: "weekly_bear",
        since: r.sinceWeek ?? null,
        weeks: r.weeksInState,
        dots: dots(r.weeksInState),
        detail: `weekly red (bear) ${r.weeksInState} wk`,
      });
    }
  }
  // Monthly 20MA cross (state for the month).
  for (const r of monthly20) {
    add(bull, r.ticker, {
      id: "monthly_20ma",
      since: monthlyCrossStart(r),
      detail: `📈 monthly 20MA cross (${r.cross === "last_month" ? "last month" : "this month"}) +${r.pctAbove}%`,
    });
  }

  const BULL_ORDER = ["fish", "smile", "mfi_os", "weekly_bull", "monthly_20ma", "ibd"];
  const BEAR_ORDER = ["mfi_ob", "sweaty", "skull", "weekly_bear"];
  const finish = (side, order, timingIds) => {
    const out = [];
    for (const [ticker, conds] of side) {
      if (conds.size < SETUPS_MIN_CONDITIONS) continue;
      const timing = timingIds
        .filter((id) => conds.has(id))
        .map((id) => conds.get(id).since || asOf)
        .sort();
      if (timing.length === 0) continue;
      const conditions = order.filter((id) => conds.has(id)).map((id) => conds.get(id));
      const sinces = conditions.map((c) => c.since || asOf).sort();
      const second = sinces[SETUPS_MIN_CONDITIONS - 1] ?? asOf;
      const computedAdded = second >= timing[0] ? second : timing[0];
      out.push({
        ticker,
        count: conditions.length,
        added: computedAdded,
        computedAdded,
        conditions,
      });
    }
    sortSetups(out);
    return out;
  };

  const bearish = finish(bear, BEAR_ORDER, BEARISH_TIMING_IDS);
  // Owner 2026-09-25: a ticker that also qualifies for Bearish Setups on the
  // same as-of is left out of Bullish Setups (Bearish keeps it). Removed
  // tickers drop out of the bullish history, so their added date resets.
  const bearSet = new Set(bearish.map((r) => r.ticker));
  const bullAll = finish(bull, BULL_ORDER, BULLISH_TIMING_IDS);
  const bullish = bullAll.filter((r) => !bearSet.has(r.ticker));
  const excludedFromBullish = bullAll.filter((r) => bearSet.has(r.ticker)).map((r) => r.ticker);

  // Owner t583u (My Stocks preview): every ticker's current conditions, before the 2-condition rule.
  // Additive only — bullish / bearish above are unchanged.
  const conditionsByTicker = {};
  for (const [side, map, order] of [["bull", bull, BULL_ORDER], ["bear", bear, BEAR_ORDER]]) {
    for (const [ticker, conds] of map) {
      const e = (conditionsByTicker[ticker] ??= { bull: [], bear: [] });
      e[side] = order.filter((id) => conds.has(id)).map((id) => conds.get(id));
    }
  }

  return {
    asOf,
    bullish,
    bearish,
    excludedFromBullish,
    conditionsByTicker,
  };
}
