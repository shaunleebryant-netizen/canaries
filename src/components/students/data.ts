/** Student portal — LOCAL DRAFT PROTOTYPE. Mock data only; no real enrolment/backend. */
export const MODULES = [
  { t: "How markets work", d: "US exchanges, order types, brokers that access US stocks, costs and FX." },
  { t: "Reading a chart", d: "Candles, timeframes, trend, support and resistance, volume." },
  { t: "Risk first", d: "Position sizing, stops, the 1–2% rule, drawdown maths." },
  { t: "Market health, the canary way", d: "The traffic light, breadth, and sitting out." },
  { t: "Indicators without the hype", d: "RSI, Relative RSI, MFI, moving averages and their limits." },
  { t: "Setups as patterns to study", d: "Fish, MFI, Fairy Godmother, IBD, Baby Bulls, Warriors, Sweaty, Bearish." },
  { t: "Your trading plan and journal", d: "Entry/exit rules, trade review, paper trading first." },
  { t: "Psychology and routine", d: "FOMO, revenge trading, a calm 20-minute daily routine." },
];
export const DOWNLOADS = [
  { t: "Slides", f: "PDF" },
  { t: "Student notes", f: "PDF" },
  { t: "Worksheet", f: "PDF" },
  { t: "Glossary", f: "PDF" },
];
export type Progress = { video: boolean[]; quiz: boolean[] };
const KEY = "canary_student_demo_progress";
const GATE = "canary_student_demo";
export const empty = (): Progress => ({ video: Array(8).fill(false), quiz: Array(8).fill(false) });
export function load(): Progress {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); }
}
export function save(p: Progress) { localStorage.setItem(KEY, JSON.stringify(p)); }
export function reset() { localStorage.removeItem(KEY); }
/** ?demo=1 enrols this browser (mock), ?demo=0 un-enrols. */
export function isEnrolled(): boolean {
  const q = new URLSearchParams(location.search).get("demo");
  if (q === "1") localStorage.setItem(GATE, "1");
  if (q === "0") localStorage.removeItem(GATE);
  return localStorage.getItem(GATE) === "1";
}
export function setEnrolled(v: boolean) { v ? localStorage.setItem(GATE, "1") : localStorage.removeItem(GATE); }
/** Module n (0-based) is unlocked when previous module video+quiz done. */
export const unlocked = (p: Progress, n: number) => n === 0 || (p.video[n - 1] && p.quiz[n - 1]);
export const MOCK_HOURS = 3.5; // owner-stamped hours (mock)
export const MOCK_BOOKINGS = [
  { when: "Tue 3 Nov · 7:00 pm SGT", what: "1-to-1 · Module 2 review", status: "Confirmed" },
  { when: "Tue 10 Nov · 7:00 pm SGT", what: "1-to-1 · Module 3 risk", status: "Requested" },
];
