/**
 * Members-facing row note: keep only which mark printed and when.
 * Scan notes in data/*.json carry internal detail (scores, indicator values)
 * that must stay proprietary, e.g. "smile@2026-09-24 deep score=3 · fish@2026-09-25 RSI=33.7"
 * becomes "🙂 09-24 · 🐟 09-25".
 */
const WORD_EMOJI: Record<string, string> = {
  smile: "🙂",
  fish: "🐟",
  exhaustion: "🥵",
  sweaty: "🥵",
  skull: "💀",
};

export function plainSignalNote(note: string | null | undefined): string {
  if (!note) return "";
  const parts = note
    .split(" · ")
    .map((seg) => {
      const m = seg.trim().match(/^(\S+?)@(\d{4})-(\d{2})-(\d{2})/u);
      if (!m) return null;
      const mark = WORD_EMOJI[m[1].toLowerCase()] ?? m[1];
      return `${mark} ${m[3]}-${m[4]}`;
    })
    .filter((x): x is string => Boolean(x));
  return parts.join(" · ");
}
