/**
 * Bottom Zone 🧚 (owner pt801u Pine "Bottom Zone Finder 🧚 (Sensitive)", defaults). Replaces the old CCI(27) fairy.
 * bottomSignal = WVF extreme AND RSI was-oversold AND bullish close (volume spike off by default).
 *   wvf = (highest(close,22) − low) / highest(close,22) × 100;  extreme = wvf > sma(wvf,20) + 1.5 × stdev(wvf,20)
 *   rsi = ta.rsi(close,14) (Wilder RMA);  wasOversold = lowest(rsi,3) < 35 or crossover(rsi,35)
 * Bars need { open, high, low, close, volume? }. File/function names kept so existing imports work.
 */
export const BZ = { pd: 22, bbLen: 20, bbMult: 1.5, rsiLen: 14, rsiOS: 35, volLen: 20, volMult: 1.2, useWVF: true, useRSI: true, useVolume: false, useBullish: true };

function rsiSeries(close, len) {
  const out = new Array(close.length).fill(null);
  let up = 0, dn = 0;
  for (let i = 1; i < close.length; i++) {
    const ch = close[i] - close[i - 1], u = Math.max(ch, 0), d = Math.max(-ch, 0);
    if (i <= len) { up += u; dn += d; if (i === len) { up /= len; dn /= len; out[i] = dn === 0 ? 100 : up === 0 ? 0 : 100 - 100 / (1 + up / dn); } continue; }
    up = (up * (len - 1) + u) / len; dn = (dn * (len - 1) + d) / len;
    out[i] = dn === 0 ? 100 : up === 0 ? 0 : 100 - 100 / (1 + up / dn);
  }
  return out;
}

/** Per-bar series + signal flags (null where warm-up is incomplete). */
export function bottomZoneSeries(bars, o = BZ) {
  const n = bars.length, close = bars.map((b) => b.close);
  const wvf = new Array(n).fill(null), upper = new Array(n).fill(null), sig = new Array(n).fill(false);
  for (let i = o.pd - 1; i < n; i++) {
    let hc = -Infinity; for (let k = i - o.pd + 1; k <= i; k++) hc = Math.max(hc, close[k]);
    wvf[i] = ((hc - bars[i].low) / hc) * 100;
  }
  for (let i = 0; i < n; i++) {
    if (i - o.bbLen + 1 < 0 || wvf[i - o.bbLen + 1] == null) continue;
    let s = 0; for (let k = i - o.bbLen + 1; k <= i; k++) s += wvf[k];
    const m = s / o.bbLen; let v = 0; for (let k = i - o.bbLen + 1; k <= i; k++) v += (wvf[k] - m) ** 2;
    upper[i] = m + o.bbMult * Math.sqrt(v / o.bbLen); // TradingView ta.stdev = population stdev
  }
  const rsi = rsiSeries(close, o.rsiLen);
  const rsiMin3 = rsi.map((_, i) => (i >= 2 && rsi[i - 2] != null ? Math.min(rsi[i], rsi[i - 1], rsi[i - 2]) : null));
  for (let i = 0; i < n; i++) {
    const wvfOk = !o.useWVF || (upper[i] != null && wvf[i] > upper[i]);
    const cross = rsi[i] != null && rsi[i - 1] != null && rsi[i] > o.rsiOS && rsi[i - 1] <= o.rsiOS;
    const rsiOk = !o.useRSI || (rsiMin3[i] != null && (rsiMin3[i] < o.rsiOS || cross));
    let volOk = true;
    if (o.useVolume) {
      if (i < o.volLen - 1) volOk = false;
      else { let s = 0; for (let k = i - o.volLen + 1; k <= i; k++) s += bars[k].volume || 0; volOk = (bars[i].volume || 0) > (s / o.volLen) * o.volMult; }
    }
    const bullOk = !o.useBullish || bars[i].close > bars[i].open;
    sig[i] = wvfOk && rsiOk && volOk && bullOk && rsi[i] != null && wvf[i] != null;
  }
  return { wvf, upper, rsi, rsiMin3, sig };
}

/** Bar indices where 🧚 prints. */
export function cciFairyMarks(bars, o = BZ) {
  const { sig } = bottomZoneSeries(bars, o), out = [];
  sig.forEach((s, i) => s && out.push(i));
  return out;
}
export const bottomZoneMarks = cciFairyMarks;
