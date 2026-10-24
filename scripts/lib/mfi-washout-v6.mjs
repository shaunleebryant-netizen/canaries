/**
 * MFI Washout v6 — CANONICAL MFI engine (owner 2026-10-06: "update to this code and discard old;
 * ensure future updates use this MFI"). Exact port of the owner's Pine:
 *   /home/box/canaries/pine/mfi-washout-v6.pine  (repo copy: data/mfi-washout-v6.pine)
 * Pure function over daily bars [{high, low, close, volume}] → per-bar series + bottomSignal.
 * Pine semantics: comparisons with na are false; nz() where the Pine uses it; ta.mfi per the
 * Pine reference implementation. Re-checked line by line against the owner's verbatim file 2026-10-06.
 */

export const MFI_WASHOUT_V6_DEFAULTS = Object.freeze({
  mfiLen: 14,
  osLevel: 30,
  osLookback: 10,
  resetLevel: 45,
  useRelative: true,
  relPct: 25,
  requireHook: true,
  useDiv: false,
  divLook: 8,
  useVolFilter: true,
  volLen: 20,
  volClimaxMult: 1.3,
  climaxLookback: 6,
  requireContract: true,
});

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const gt = (a, b) => isNum(a) && isNum(b) && a > b;
const ge = (a, b) => isNum(a) && isNum(b) && a >= b;
const lt = (a, b) => isNum(a) && isNum(b) && a < b;
const le = (a, b) => isNum(a) && isNum(b) && a <= b;

/** Pine ta.mfi(src, length) reference implementation (upper/lower money-flow sums). */
export function pineMfi(src, volume, length) {
  const n = src.length;
  const up = new Array(n);
  const dn = new Array(n);
  for (let i = 0; i < n; i++) {
    const ch = i === 0 ? NaN : src[i] - src[i - 1];
    const v = volume[i];
    // ta.change(src) <= 0 ? 0 : src  (na change → false → src)
    up[i] = v * (le(ch, 0) ? 0 : src[i]);
    dn[i] = v * (ge(ch, 0) ? 0 : src[i]);
  }
  const out = new Array(n).fill(NaN);
  for (let i = length - 1; i < n; i++) {
    let u = 0;
    let d = 0;
    for (let k = i - length + 1; k <= i; k++) {
      u += up[k];
      d += dn[k];
    }
    if (!isNum(u) || !isNum(d)) continue;
    if (d === 0) out[i] = u === 0 ? NaN : 100;
    else out[i] = 100 - 100 / (1 + u / d);
  }
  return out;
}

function rolling(arr, len, i, pick) {
  if (i < len - 1) return NaN;
  let best = NaN;
  for (let k = i - len + 1; k <= i; k++) {
    const v = arr[k];
    if (!isNum(v)) continue;
    if (!isNum(best) || pick(v, best)) best = v;
  }
  return best;
}
const lowest = (a, len, i) => rolling(a, len, i, (v, b) => v < b);
const highest = (a, len, i) => rolling(a, len, i, (v, b) => v > b);

function sma(a, len, i) {
  if (i < len - 1) return NaN;
  let s = 0;
  for (let k = i - len + 1; k <= i; k++) {
    if (!isNum(a[k])) return NaN;
    s += a[k];
  }
  return s / len;
}

/**
 * Run MFI Washout v6 over bars. Returns { mfi[], bottomSignal[], armed[] }.
 */
export function mfiWashoutV6(bars, opts = {}) {
  const p = { ...MFI_WASHOUT_V6_DEFAULTS, ...opts };
  const n = bars.length;
  const hlc3 = bars.map((b) => (b.high + b.low + b.close) / 3);
  const vol = bars.map((b) => (isNum(b.volume) ? b.volume : 0));
  const low = bars.map((b) => b.low);
  const mfi = pineMfi(hlc3, vol, p.mfiLen);

  const bottomSignal = new Array(n).fill(false);
  const armedSeries = new Array(n).fill(false);
  let armed = false;
  let lastClimax = -1;

  for (let i = 0; i < n; i++) {
    const m = mfi[i];
    const m1 = i >= 1 ? mfi[i - 1] : NaN;
    const m2 = i >= 2 ? mfi[i - 2] : NaN;
    const ready = isNum(m) && vol[i] > 0;

    const mfiRising = gt(m, m1);
    const mfiHook = gt(m, m1) && le(m1, m2);
    const rawTurn = p.requireHook ? mfiHook : mfiRising;

    const mfiLo = lowest(mfi, p.osLookback, i);
    const mfiHi = highest(mfi, p.osLookback, i);
    const rng = isNum(mfiHi) && isNum(mfiLo) ? Math.max(mfiHi - mfiLo, 0.01) : NaN;
    const absOs = ready && le(mfiLo, p.osLevel);
    const relOs = ready && p.useRelative && le(((m - mfiLo) / rng) * 100, p.relPct);
    const osZone = absOs || relOs;
    const stillLow = ready && le(m, p.resetLevel);

    const volSma = sma(vol, p.volLen, i);
    // Pine: nz(volume) >= nz(volSma) * mult
    const barClimax = vol[i] >= (isNum(volSma) ? volSma : 0) * p.volClimaxMult;
    if (barClimax) lastClimax = i;
    const climaxInWindow = lastClimax >= 0 && i - lastClimax <= p.climaxLookback;
    const contracted = vol[i] <= (i >= 1 ? vol[i - 1] : 0); // nz(volume) <= nz(volume[1])
    const volOk = !p.useVolFilter || (climaxInWindow && (!p.requireContract || contracted));

    let divOk = false;
    if (p.useDiv && i >= 2 * p.divLook - 1) {
      const priceLL = lt(lowest(low, p.divLook, i), lowest(low, p.divLook, i - p.divLook));
      const mfiHL = gt(lowest(mfi, p.divLook, i), lowest(mfi, p.divLook, i - p.divLook));
      divOk = priceLL && mfiHL && stillLow;
    }

    if (osZone) armed = true;
    if (ready && gt(m, p.resetLevel)) armed = false;
    const sig = ready && armed && stillLow && volOk && (rawTurn || divOk);
    if (sig) armed = false;
    bottomSignal[i] = sig;
    armedSeries[i] = armed;
  }
  return { mfi, bottomSignal, armed: armedSeries };
}
