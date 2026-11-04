/**
 * Forward session closes for the members Backtest look-back.
 *
 * Horizons are +5, +10 and +20 of that symbol's own later daily bars
 * (its trading sessions), counted after the mark date. Not calendar days,
 * and not a market-wide session calendar.
 *
 * Each value is the later close, or null when that session is not in the
 * series yet. Returns null when the mark date itself is missing, so the
 * caller can keep any fwd already stored.
 *
 * The members UI turns these closes into a % versus the stored mark-day
 * close. This is an observation of what price did afterward, not a return
 * series, win rate, or P&L.
 */
export const FWD_HORIZONS = [5, 10, 20];

export function forwardCloses(bars, markYmd) {
  if (!markYmd || !Array.isArray(bars) || bars.length === 0) return null;
  let i = -1;
  for (let n = 0; n < bars.length; n++) {
    const d = bars[n].asOf || bars[n].time;
    if (d === markYmd) {
      i = n;
      break;
    }
  }
  if (i < 0) return null;
  return FWD_HORIZONS.map((h) => {
    const b = bars[i + h];
    const c = b == null ? NaN : Number(b.close);
    return Number.isFinite(c) ? +c.toFixed(4) : null;
  });
}

/** public/_chartdata/<T>.json → { time, close }[] in session order. */
export function barsFromChartFile(doc) {
  const d0 = doc?.d0;
  if (!Number.isFinite(d0) || !Array.isArray(doc?.b)) return [];
  return doc.b.map((x) => ({
    time: new Date((d0 + x[0]) * 864e5).toISOString().slice(0, 10),
    close: x[4],
  }));
}
