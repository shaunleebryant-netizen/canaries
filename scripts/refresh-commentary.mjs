#!/usr/bin/env node
/**
 * Generate plain-English members commentary from live pack JSON.
 * Reads state / regime / vol-curve / volume-breadth / market-quotes cache.
 * Never invents Decide S — uses composite.S / light as written by the scripted
 * Decide score (scripts/refresh-decide.mjs; runs earlier in the full pack).
 * Writes data/commentary.json (+ mirror under /home/box/canaries/).
 *
 * Usage:
 *   node scripts/refresh-commentary.mjs
 *   node scripts/refresh-commentary.mjs --session-date 2026-09-23
 */

import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "data");
const MIRROR = "/home/box/canaries";
const OUT = join(DATA, "commentary.json");

function parseArgs(argv) {
  const out = { sessionDate: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--session-date") out.sessionDate = argv[++i];
  }
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function nzNowIso() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const asUtc = Date.UTC(
    Number(g("year")),
    Number(g("month")) - 1,
    Number(g("day")),
    Number(g("hour")),
    Number(g("minute")),
    Number(g("second"))
  );
  const diffMin = Math.round((asUtc - d.getTime()) / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}${sign}${hh}:${mm}`;
}

function fmtS(S) {
  if (typeof S !== "number" || Number.isNaN(S)) return null;
  const sign = S >= 0 ? "+" : "";
  return `${sign}${S.toFixed(2)}`;
}

function lightLabel(light) {
  const L = String(light || "").toLowerCase();
  if (L === "green") return "Green";
  if (L === "red") return "Red";
  if (L === "amber") return "Amber";
  return light ? String(light) : "Unknown";
}

function sectorLines(mq) {
  const ranked = [...(mq?.sectors || [])].filter(
    (s) => s?.quote?.changePct != null
  );
  ranked.sort(
    (a, b) => (b.quote.changePct ?? -999) - (a.quote.changePct ?? -999)
  );
  const top = ranked[0];
  const worst = ranked[ranked.length - 1];
  const fmt = (s) =>
    s && s.quote?.changePct != null
      ? `${s.symbol} ${s.quote.changePct >= 0 ? "+" : ""}${s.quote.changePct.toFixed(2)}%`
      : null;
  return { topLine: fmt(top), worstLine: fmt(worst) };
}

function softSeats(regimeV2) {
  const soft = [];
  const votes = regimeV2?.votes || {};
  // Plain-English labels (members copy must stay jargon-free).
  const labels = {
    "nyse-ad": "market breadth (how many stocks are rising)",
    sp600: "small caps",
    "qqq-sma20": "the Nasdaq trend",
    "cyclical-defensive": "growth vs safety sectors",
    "vix-vix3m": "the fear gauge",
    "hyg-ief-sma20": "credit markets",
  };
  for (const [id, v] of Object.entries(votes)) {
    if (v < 0) soft.push(labels[id] || id);
  }
  return soft;
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function regimePlain(state) {
  if (state === "RISK_ON") return "supportive (Risk-On)";
  if (state === "RISK_OFF") return "defensive (Risk-Off)";
  if (state === "MIXED") return "mixed";
  return "unclear";
}

function specPlain(spec) {
  if (spec === "FULL") return "riskier speculative trades look OK";
  if (spec === "HALF") return "riskier speculative trades deserve a lighter touch";
  return "riskier speculative trades are off for now";
}

function buildCommentary({ state, vol, vb, mq, sessionDate }) {
  const composite = state?.composite || {};
  const S = composite.S;
  const light = lightLabel(composite.light);
  const regimeV2 = state?.regimeV2 || {};
  const spec = String(regimeV2.spec || "").toUpperCase() || "—";
  const soft = softSeats(regimeV2);
  const volBand =
    vol?.computed?.band ||
    vol?.computed?.stance ||
    (typeof vol?.seedRatio === "number" ? "see ratio" : null);
  const volRatio =
    typeof vol?.computed?.mediumRatio === "number"
      ? vol.computed.mediumRatio
      : typeof vol?.seedRatio === "number"
        ? vol.seedRatio
        : null;
  const band = String(volBand || "").toUpperCase();
  const heldTxt =
    vol?.held && vol?.heldSince
      ? ` (this reading is held since ${vol.heldSince} because it wasn’t updated today)`
      : "";
  const volSentence =
    band === "SAFE"
      ? `Short-term fear is calm${heldTxt}. That helps, but it’s no excuse to get careless.`
      : band === "CAUTION"
        ? `Short-term fear is creeping up${heldTxt}, so smaller position sizes may be wise.`
        : band === "DANGER"
          ? `Short-term fear is high${heldTxt}. This is a time to protect capital first.`
          : "The fear gauge is showing its last good reading. See the Vol curve card.";
  const volBullet =
    band === "SAFE"
      ? "Fear is calm, but that’s no excuse to get careless."
      : band === "CAUTION"
        ? "Fear is creeping up, so consider sizing a little smaller."
        : band === "DANGER"
          ? "Fear is high, so protect capital first."
          : "Fear gauge: see the Vol curve card.";

  const vbRegime = vb?.regime || "PENDING";
  const vbAsOf = vb?.asOf || null;

  const { topLine, worstLine } = sectorLines(mq);

  const headline =
    light === "Amber"
      ? "Amber: stay invested, but keep your eyes open"
      : light === "Green"
        ? "Green: conditions look healthy, stay disciplined"
        : light === "Red"
          ? "Red: protect what you have first"
          : `${light}: use the light as a guide, education only`;

  const paragraphs = [];
  paragraphs.push(
    `The traffic light is ${light}. ${
      light === "Amber"
        ? "Things are softer than a clean Green week, but not bad enough for Red. It makes sense to stay involved without betting as big as you would on Green."
        : light === "Green"
          ? "Conditions look healthy. Staying invested makes sense, but keep an eye on any soft spots."
          : light === "Red"
            ? "Conditions look risky. Protecting capital comes first until things improve."
            : "Use it as context, not as a trade signal."
    }`
  );

  if (regimeV2.stateShown) {
    const softTxt = soft.length
      ? ` The soft spots are ${joinList(soft)}.`
      : " There are no obvious soft spots right now.";
    paragraphs.push(
      `The overall backdrop is ${regimePlain(regimeV2.stateShown)}, and ${specPlain(spec)}.${softTxt}`
    );
  }

  paragraphs.push(volSentence);

  if (vbRegime === "RISK_ON") {
    paragraphs.push(
      "Trading volume is mostly flowing into rising stocks, which supports the market. Think of it as a weather check, not a buy or sell signal."
    );
  } else if (vbRegime === "RISK_OFF") {
    paragraphs.push(
      "Trading volume is mostly flowing into falling stocks, so rallies may struggle. Think of it as a weather check, not a buy or sell signal."
    );
  } else if (vbRegime === "NO_REGIME") {
    paragraphs.push(
      "Buying and selling volume are fairly balanced, so liquidity gives no clear message today."
    );
  } else {
    paragraphs.push("Liquidity data is still coming in, so we’re not reading anything into it yet.");
  }

  paragraphs.push("Education only. No position changes are called out today.");

  const whatToDo = [
    `${light}: ${
      light === "Amber"
        ? "stay invested with your eyes open, and don’t size up like it’s a Green week."
        : light === "Green"
          ? "lean into risk, but keep your usual risk rules."
          : light === "Red"
            ? "protect capital first until things improve."
            : "use the light as a guide."
    }`,
    `Backdrop ${regimePlain(regimeV2.stateShown)}; ${specPlain(spec)}.${
      soft.length ? ` Soft spots: ${joinList(soft)}.` : ""
    }`,
    volBullet,
  ];
  if (topLine && worstLine) {
    whatToDo.push(
      `Sectors today: strongest ${topLine}; weakest ${worstLine}. Favour the leaders over the laggards.`
    );
  } else {
    whatToDo.push("Sectors: see the live strip, and favour the leaders over the laggards.");
  }

  return {
    asOf: sessionDate,
    sessionDate,
    generatedAt: nzNowIso(),
    headline,
    paragraphs,
    whatToDo,
    inputs: {
      S,
      light: composite.light,
      regime: regimeV2.stateShown || null,
      spec: regimeV2.spec || null,
      volRatio,
      volBand,
      volumeBreadth: { asOf: vbAsOf, ratio: vb?.ratio ?? null, regime: vbRegime },
      sectors: { best: topLine, worst: worstLine },
    },
    note: "Generated from live pack JSON. Education only — does not change Decide S.",
  };
}

function main() {
  const args = parseArgs(process.argv);
  const state = readJson(join(DATA, "state.json"));
  const sessionDate =
    args.sessionDate ||
    state.sessionDate ||
    (typeof state.asOf === "string" ? state.asOf.slice(0, 10) : null) ||
    new Date().toISOString().slice(0, 10);

  const vol = existsSync(join(DATA, "vol-curve-stub.json"))
    ? readJson(join(DATA, "vol-curve-stub.json"))
    : {};
  const vb = existsSync(join(DATA, "volume-breadth-stub.json"))
    ? readJson(join(DATA, "volume-breadth-stub.json"))
    : {};
  const mq = existsSync(join(DATA, "market-quotes-cache.json"))
    ? readJson(join(DATA, "market-quotes-cache.json"))
    : {};

  const doc = buildCommentary({ state, vol, vb, mq, sessionDate });
  writeJson(OUT, doc);
  if (existsSync(MIRROR)) {
    try {
      copyFileSync(OUT, join(MIRROR, "commentary.json"));
    } catch (e) {
      console.warn("mirror skip:", e instanceof Error ? e.message : e);
    }
  }
  console.log(`commentary → ${OUT}`);
  console.log(`headline: ${doc.headline}`);
  console.log(`whatToDo: ${doc.whatToDo.length} bullets · S=${doc.inputs.S}`);
}

main();
