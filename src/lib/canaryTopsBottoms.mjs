/**
 * Faithful JS port of the owner's Pine "Canary RelRSI 🙂🐟🥵💀" (DAILY ONLY)
 * (data/canary-relrsi-daily.pine). Inputs: src/lib/canaryTopsBottomsConfig.mjs.
 *
 * RelRSI = ta.percentrank(ta.rsi(close, rsiLen), lookback) — percentile rank 0–100
 * of RSI over the lookback window (default 500).
 *
 * Edges (owner):
 *   🙂 smile: RelRSI crosses under smileLevel (cur < L and prev >= L)
 *   🐟 fish:  RelRSI reaches fishLevel      (cur <= L and prev > L)
 *   🥵 sweat: RelRSI reaches sweatLevel     (cur >= L and prev < L)  → event kind "exhaustion"
 *   💀 skull: RelRSI reaches skullLevel     (cur >= L and prev < L)
 *
 * Cluster (clusterBars=8): within a same-side cluster only the stronger mark
 * (fish on the bottom side, skull on the top side) may replot; weaker marks wait
 * until > clusterBars bars have passed.
 *
 * PRIVATE logic: never surface thresholds/lengths in public copy.
 */
import { CANARY_TOPS_BOTTOMS } from "./canaryTopsBottomsConfig.mjs";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function smaSeries(src, len) {
  const out = new Array(src.length).fill(null);
  let sum = 0;
  let naInWin = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (isNum(v)) sum += v;
    else naInWin++;
    if (i >= len) {
      const old = src[i - len];
      if (isNum(old)) sum -= old;
      else naInWin--;
    }
    if (i >= len - 1 && naInWin === 0) out[i] = sum / len;
  }
  return out;
}

/** Pine ta.rma */
function rmaSeries(src, len) {
  const out = new Array(src.length).fill(null);
  const sma = smaSeries(src, len);
  const alpha = 1 / len;
  let prev = null;
  for (let i = 0; i < src.length; i++) {
    if (prev == null) prev = sma[i];
    else if (isNum(src[i])) prev = alpha * src[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/** Pine ta.rsi(close, len) */
function rsiSeries(close, len) {
  const n = close.length;
  const up = new Array(n).fill(null);
  const dn = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const ch = close[i] - close[i - 1];
    up[i] = Math.max(ch, 0);
    dn[i] = Math.max(-ch, 0);
  }
  const ru = rmaSeries(up, len);
  const rd = rmaSeries(dn, len);
  return ru.map((u, i) => {
    const d = rd[i];
    if (u == null || d == null) return null;
    if (d === 0) return 100;
    if (u === 0) return 0;
    return 100 - 100 / (1 + u / d);
  });
}

/**
 * Pine ta.percentrank(source, length): percentage of values in the past `length`
 * bars that are strictly less than the current value. na until the window is full
 * and every bar in it is numeric.
 */
function percentRankSeries(src, length) {
  const n = src.length;
  const out = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i < length - 1) continue;
    const cur = src[i];
    if (!isNum(cur)) continue;
    let count = 0;
    let ok = true;
    for (let k = 0; k < length; k++) {
      const v = src[i - k];
      if (!isNum(v)) {
        ok = false;
        break;
      }
      if (v < cur) count++;
    }
    if (ok) out[i] = (100 * count) / length;
  }
  return out;
}

/**
 * @param {{open:number,high:number,low:number,close:number,volume:number|null,asOf:string}[]} bars oldest → newest, daily
 * @param {typeof CANARY_TOPS_BOTTOMS} [cfg]
 * @returns {{ events: {kind:"smile"|"fish"|"exhaustion"|"skull", i:number, asOf:string, rsi:number, relRsi:number, why:string}[],
 *             state: object, last: object }}
 */
export function runCanaryTopsBottoms(bars, cfg = CANARY_TOPS_BOTTOMS) {
  const P = { ...CANARY_TOPS_BOTTOMS, ...cfg };
  const n = bars.length;
  const close = bars.map((b) => b.close);
  const rsi = rsiSeries(close, P.rsiLen);
  const relRsi = percentRankSeries(rsi, P.lookback);

  let lastBot = null; // bar index of last bottom-side mark
  let lastTop = null; // bar index of last top-side mark
  const events = [];
  let snap = null;

  for (let i = 0; i < n; i++) {
    const r = rsi[i];
    const rr = relRsi[i];
    const rr1 = i > 0 ? relRsi[i - 1] : null;
    if (!isNum(rr) || !isNum(rr1) || !isNum(r)) {
      snap = {
        i,
        asOf: bars[i].asOf,
        rsi: r,
        relRsi: rr,
        inBotCluster: lastBot != null && i - lastBot <= P.clusterBars,
        inTopCluster: lastTop != null && i - lastTop <= P.clusterBars,
      };
      continue;
    }

    const smileEdge = rr < P.smileLevel && rr1 >= P.smileLevel;
    const fishEdge = rr <= P.fishLevel && rr1 > P.fishLevel;
    const sweatEdge = rr >= P.sweatLevel && rr1 < P.sweatLevel;
    const skullEdge = rr >= P.skullLevel && rr1 < P.skullLevel;

    const inBotCluster = lastBot != null && i - lastBot <= P.clusterBars;
    const inTopCluster = lastTop != null && i - lastTop <= P.clusterBars;

    // Weaker marks blocked inside cluster; stronger (fish/skull) may replot.
    if (smileEdge && !inBotCluster) {
      lastBot = i;
      events.push({
        kind: "smile",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        relRsi: rr,
        why: `smile RelRSI cross under`,
      });
    }
    if (fishEdge) {
      // fish always allowed (stronger bottom mark), including inside cluster
      lastBot = i;
      events.push({
        kind: "fish",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        relRsi: rr,
        why: `fish RelRSI reach`,
      });
    }
    if (sweatEdge && !inTopCluster) {
      lastTop = i;
      events.push({
        kind: "exhaustion",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        relRsi: rr,
        why: `sweat RelRSI reach`,
      });
    }
    if (skullEdge) {
      lastTop = i;
      events.push({
        kind: "skull",
        i,
        asOf: bars[i].asOf,
        rsi: r,
        relRsi: rr,
        why: `skull RelRSI reach`,
      });
    }

    snap = {
      i,
      asOf: bars[i].asOf,
      rsi: r,
      relRsi: rr,
      inBotCluster: lastBot != null && i - lastBot <= P.clusterBars,
      inTopCluster: lastTop != null && i - lastTop <= P.clusterBars,
    };
  }

  return {
    events,
    state: {
      lastBot,
      lastTop,
      lookback: P.lookback,
      rsiLen: P.rsiLen,
    },
    last: snap,
  };
}

export { rsiSeries, percentRankSeries };
