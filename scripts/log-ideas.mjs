#!/usr/bin/env node
// Save tonight's Ideas to data/ideas-log/YYYY-MM-DD.json (asOf = US session date). Idempotent: rerun overwrites the same day.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeJson, nzNowIso } from "./lib/scan-common.mjs";

const ideas = JSON.parse(readFileSync(join(ROOT, "data/ideas.json"), "utf8"));
const dir = join(ROOT, "data/ideas-log");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const pick = (i) => ({ t: i.t, side: i.side, play: i.play, close: i.close, entryZone: i.entryZone, wrongIf: i.wrongIf, target: i.target, rr: i.rr, sector: i.sector, sectorRank: i.sectorRank });
const out = { v: 1, date: ideas.asOf, loggedAt: nzNowIso(), light: ideas.light, regime: ideas.regime, ideas: [...ideas.longs, ...ideas.shorts].map(pick) };
writeJson(join(dir, `${ideas.asOf}.json`), out);
console.log(`log-ideas: ${out.ideas.length} ideas → data/ideas-log/${ideas.asOf}.json`);
