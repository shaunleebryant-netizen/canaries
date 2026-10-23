/**
 * The three filter stacks for the private owner page (/owner). Pure functions over the contract history
 * (data/private/options-contract-history.json) so the scanner and tests share one implementation.
 * Every threshold comes from scripts/lib/options-scan-config.mjs.
 */

/** "Flagged" = the unusual-activity rule (used for repeat flow). */
export function isFlagged(r, T) {
  return (
    r.dte >= T.MIN_DTE &&
    r.v >= T.UNUSUAL_MIN_VOL &&
    r.v >= T.UNUSUAL_VOL_OI * r.oi &&
    r.prem >= T.UNUSUAL_MIN_PREMIUM &&
    (r.iv ?? 0) > 0 &&
    r.itm <= T.DEEP_ITM_PCT
  );
}

const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const volOi = (v, oi) => (oi > 0 ? +(v / oi).toFixed(1) : null); // null = OI 0 ("new")
const volOiAtLeast = (v, oi, x) => (oi > 0 ? v / oi >= x : v > 0);

export function buildStacks(chist, session, cfg) {
  const { thresholds: T, proxies: PX, stacks: ST } = cfg;
  const dates = Object.keys(chist.sessions).filter((d) => d <= session).sort();
  const at = (d) => chist.sessions[d] || { snap: {}, tracked: {} };
  const rec = (d, sym) => at(d).snap?.[sym] || at(d).tracked?.[sym] || null;
  const nextOf = (d) => dates[dates.indexOf(d) + 1] ?? null;
  const excluded = new Set(ST.EXCLUDE_TICKERS || []);
  const singleName = (r) => r.sec === "stock" && !excluded.has(r.t);

  function confirm(d, sym, r) {
    const next = nextOf(d);
    const needed = Math.ceil(PX.OPEN_CONFIRM_SHARE * r.v);
    if (!next) return { status: "pending", needed };
    const n = rec(next, sym);
    if (!n) return { status: "unknown", next, needed };
    const oiChange = n.oi - r.oi;
    return { status: oiChange >= needed ? "confirmed" : "not_confirmed", next, oiChange, needed };
  }
  const windowDates = dates.slice(-ST.repeat.WINDOW_SESSIONS);
  const repeatCount = (sym) => windowDates.filter((d) => at(d).snap?.[sym]?.flag).length;

  function view(d, sym, r) {
    const pct = ((r.k - r.spot) / r.spot) * 100;
    const otm = r.type === "call" ? pct : -pct;
    return {
      sym, ticker: r.t, type: r.type, strike: r.k, expiry: r.exp, flagDate: d, dte: r.dte, dteNow: daysBetween(session, r.exp),
      volume: r.v, oi: r.oi, volOi: volOi(r.v, r.oi), premium: r.prem, iv: r.iv, mid: r.mid, bid: r.bid, ask: r.ask, last: r.last,
      aggr: r.aggr, spot: r.spot, moneyness: Math.abs(pct) <= 2 ? "ATM" : otm > 0 ? "OTM" : "ITM", pctFromSpot: +pct.toFixed(1),
      strictOtm: r.type === "call" ? r.k > r.spot : r.k < r.spot, flagged: !!r.flag, repeat: repeatCount(sym), confirm: confirm(d, sym, r), sec: r.sec, itm: r.itm,
    };
  }

  // Candidate rows: latest session + LOOKBACK−1 earlier sessions; one row per contract (latest date wins).
  const look = dates.slice(-ST.LOOKBACK_SESSIONS);
  const bySym = new Map();
  for (const d of look) for (const [sym, r] of Object.entries(at(d).snap || {})) bySym.set(sym, view(d, sym, r));
  const cands = [...bySym.values()].filter((x) => x.dteNow >= T.MIN_DTE && x.pctFromSpot != null);
  const cap = (rows) => ({ total: rows.length, rows: rows.slice(0, ST.MAX_ROWS) });

  const A = ST.aggressive;
  const aggressive = cands
    .filter((x) => x.premium >= A.MIN_PREMIUM && volOiAtLeast(x.volume, x.oi, A.MIN_VOL_OI) && (!A.REQUIRE_AT_ASK || x.aggr === "ask"))
    .filter((x) => x.dte >= A.MIN_DTE && x.dte <= A.MAX_DTE && (!A.SINGLE_NAMES_ONLY || singleName(x)))
    .filter((x) => x.itm <= T.DEEP_ITM_PCT)
    .sort((a, b) => b.premium - a.premium);

  const S = ST.swing;
  const rank = { confirmed: 0, pending: 1, unknown: 1, not_confirmed: 2 };
  const swing = cands
    .filter((x) => x.premium >= S.MIN_PREMIUM && (!S.OTM_ONLY || x.strictOtm) && x.dte >= S.MIN_DTE && x.dte <= S.MAX_DTE)
    .filter((x) => volOiAtLeast(x.volume, x.oi, S.MIN_VOL_OI) && (!S.SINGLE_NAMES_ONLY || singleName(x)))
    .sort((a, b) => (S.CONFIRMED_FIRST ? rank[a.confirm.status] - rank[b.confirm.status] : 0) || b.premium - a.premium);

  const R = ST.repeat;
  const syms = new Set(windowDates.flatMap((d) => Object.keys(at(d).snap || {})));
  const repeat = [];
  for (const sym of syms) {
    const flaggedOn = windowDates.filter((d) => at(d).snap?.[sym]?.flag);
    if (flaggedOn.length < R.MIN_SESSIONS) continue;
    const latest = rec(session, sym);
    if (!latest || !volOiAtLeast(latest.v, latest.oi, R.LATEST_MIN_VOL_OI)) continue;
    const combinedPremium = flaggedOn.reduce((a, d) => a + at(d).snap[sym].prem, 0);
    if (combinedPremium < R.MIN_COMBINED_PREMIUM) continue;
    const lastFlag = flaggedOn[flaggedOn.length - 1];
    const base = view(lastFlag, sym, at(lastFlag).snap[sym]);
    if (base.dteNow < T.MIN_DTE) continue;
    const first = at(flaggedOn[0]).snap[sym];
    repeat.push({
      ...base,
      flaggedOn,
      combinedPremium,
      latest: { volume: latest.v, oi: latest.oi, volOi: volOi(latest.v, latest.oi) },
      oiChangeSinceFirst: latest.oi - first.oi,
      confirmations: flaggedOn.map((d) => ({ date: d, ...confirm(d, sym, at(d).snap[sym]) })),
    });
  }
  repeat.sort((a, b) => b.combinedPremium - a.combinedPremium);

  return {
    lookbackDates: look,
    aggressive: cap(aggressive),
    swing: cap(swing),
    repeat: { ...cap(repeat), building: windowDates.length < R.MIN_SESSIONS, sessionsSoFar: windowDates.length, needSessions: R.MIN_SESSIONS },
  };
}
