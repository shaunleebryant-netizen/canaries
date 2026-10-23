"use client";

/**
 * Growth Score UI (owner approved 2026-10-10, preview v2; flag MEMBERS_GROWTH_SCORE).
 * - GrowthCell: score + thin 0–100 bar (+ red "!" for Danger); hover (mouse) or tap opens the breakdown card.
 * - ColumnsMenu / useColumnPrefs: per-box column checklist saved in localStorage, "Reset to default".
 * Data: data/growth-score.json (scripts/build-fundamentals.mjs). Education only.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GrowthRow } from "@/lib/loadGrowthScore";

export const fmtPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`;
export const fmtPp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}pp`;
export const fmtRun = (run: GrowthRow["run"]) => (run == null ? null : run === "cash+" ? "cash+" : run >= 120 ? "10y+" : `${run} mo`);

const PART_LABEL: Record<string, string> = {
  rev: "revenue growth",
  gm: "gross-margin trend",
  evs: "EV/Sales vs peers",
  run: "cash runway",
  path: "path to profit",
};

function Bar({ v, className = "" }: { v: number | null | undefined; className?: string }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-slate-400/15 ${className}`} aria-hidden>
      <span className="block h-full rounded-full bg-gradient-to-r from-yellow-700 to-canary-gold" style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%` }} />
    </span>
  );
}

function CardBody({ ticker, row, scored }: { ticker: string; row: GrowthRow; scored: number }) {
  const s = row.s ?? ({} as NonNullable<GrowthRow["s"]>);
  const rev =
    row.rg == null
      ? "Not available"
      : `${fmtPct(row.rg)} y/y (12 months)${row.qg != null ? ` · latest quarter ${fmtPct(row.qg)}` : ""}${row.tiny ? " · from a tiny base" : ""}`;
  const gm = row.gmd == null || row.gm == null ? "Not available, weight moved to the others" : `${fmtPp(row.gmd)} vs a year ago → gross margin ${(row.gm * 100).toFixed(1)}%`;
  const ev = row.rel == null || row.evs == null || row.pm == null ? "Not available, weight moved to the others" : `EV/Sales ${row.evs.toFixed(1)}× vs ${row.pm.toFixed(1)}× peer median (${row.pg})`;
  const run =
    row.run == null
      ? "Not available"
      : row.run === "cash+"
        ? "Cash-generative (free cash flow positive)"
        : `≈ ${fmtRun(row.run)} of cash at the current burn${row.fcfm != null ? ` · FCF margin ${fmtPct(row.fcfm)}` : ""}`;
  const path = row.om == null ? "Not available" : `Operating margin ${fmtPct(row.om)}${row.omd != null ? ` (${fmtPp(row.omd)} y/y)` : ""}`;
  const parts: [string, string, number | null | undefined, string][] = [
    ["Revenue growth", "40%", s.rev, rev],
    ["Gross-margin trend", "20%", s.gm, gm],
    ["EV/Sales vs peers", "20%", s.evs, ev],
    ["Cash runway", "10%", s.run, run],
    ["Path to profit", "10%", s.path, path],
  ];
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold tracking-wide text-white">{ticker} · Canary Score</span>
        <span className="text-lg font-extrabold text-amber-200">
          {Math.round(row.gs ?? 0)}
          <span className="text-[10px] font-medium text-slate-400"> /100</span>
        </span>
      </div>
      <Bar v={row.gs} className="mb-2 mt-0.5 h-1.5" />
      {parts.map(([nm, w, v, raw]) => (
        <div key={nm} className="grid grid-cols-[1fr_46px_22px] items-center gap-x-2 border-t border-slate-400/10 py-1.5">
          <span className={`font-semibold ${v == null ? "text-slate-600" : "text-slate-200"}`}>
            {nm}
            <span className="ml-1 text-[10px] font-medium text-slate-400">{w}</span>
          </span>
          <Bar v={v} className="h-1" />
          <span className={`text-right font-bold ${v == null ? "text-slate-600" : "text-amber-200"}`}>{v ?? "—"}</span>
          <span className="col-span-3 text-[10.5px] text-slate-400">{raw}</span>
        </div>
      ))}
      {row.d ? (
        <div className="mt-1.5 rounded-md border border-rose-500/45 bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-100">
          <span className="text-[9.5px] font-extrabold tracking-wider text-rose-300">DANGER</span>
          {(row.dw ?? []).map((d) => (
            <span key={d} className="block">
              {d}
            </span>
          ))}
        </div>
      ) : null}
      {row.miss && row.miss.length ? (
        <p className="mt-1.5 text-[10.5px] text-slate-400">
          ◐ Partial: no {row.miss.map((m) => PART_LABEL[m] ?? m).join(", ")}. {row.cov}% of the weight available, the rest reweighted.
          {row.pt ? " Left out of the ranking." : ""}
        </p>
      ) : null}
      <p className="mt-1.5 text-[10px] text-slate-500">Percentiles vs our {scored} ranked stocks · Education only</p>
    </>
  );
}

const fine = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/** Score cell with the hover / tap breakdown card. variant "compact" = number over a thin bar (Setups). */
export function GrowthCell({
  ticker,
  row,
  scored,
  variant = "compact",
  showDanger = true,
  barClass = "h-[5px] w-11",
}: {
  ticker: string;
  row: GrowthRow | undefined;
  scored: number;
  /** compact = number over a tiny bar; wide = bar then number; row = fixed "!" slot · bar · number (tables). */
  variant?: "compact" | "wide" | "row";
  showDanger?: boolean;
  /** Bar size for variant "row". */
  barClass?: string;
}) {
  const [open, setOpen] = useState<null | "hover" | "pin">(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    const c = card.current;
    if (!b || !c) return;
    const w = c.offsetWidth, h = c.offsetHeight;
    const x = Math.max(8, Math.min(b.left + b.width / 2 - w / 2, window.innerWidth - w - 8));
    let y = b.bottom + 6;
    if (y + h > window.innerHeight - 8) y = Math.max(8, b.top - h - 6);
    setPos({ x, y });
  }, []);
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (btn.current?.contains(e.target as Node) || card.current?.contains(e.target as Node))) return;
      setOpen(null);
    };
    const onScroll = () => setOpen(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  if (!row || row.gs == null) {
    return (
      <span className="text-slate-500" title={row?.why ?? "No SEC data"}>
        —
      </span>
    );
  }
  const enter = () => {
    if (!fine()) return;
    if (hideT.current) clearTimeout(hideT.current);
    setOpen((o) => o ?? "hover");
  };
  const leave = () => {
    if (!fine()) return;
    hideT.current = setTimeout(() => setOpen((o) => (o === "hover" ? null : o)), 140);
  };
  const score = Math.round(row.gs);
  const part = Boolean(row.pt);
  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={card}
            role="dialog"
            aria-label={`${ticker} Canary Score breakdown`}
            onMouseEnter={enter}
            onMouseLeave={leave}
            className="fixed z-[80] w-[300px] max-w-[calc(100vw-16px)] rounded-[10px] border border-canary-gold/55 bg-[#0b1222] px-3 py-2.5 text-left text-[11.5px] font-normal normal-case tracking-normal text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0 }}
          >
            <CardBody ticker={ticker} row={row} scored={scored} />
          </div>,
          document.body
        )
      : null;
  if (variant === "row")
    return (
      <span className="gs-row inline-flex items-center gap-1.5 align-middle">
        {showDanger ? (
          <span className="inline-flex w-3 justify-center">
            {row.d ? (
              <span
                className="rounded-[3px] border border-rose-500/55 bg-rose-500/20 px-[3px] text-[8.5px] font-extrabold leading-[12px] text-rose-300"
                title="Danger: hover or tap the score for the reasons"
                aria-label="Danger"
              >
                !
              </span>
            ) : null}
          </span>
        ) : null}
        <button
          ref={btn}
          type="button"
          aria-expanded={open != null}
          aria-label={`Canary Score ${score}${row.d ? ", Danger" : ""}. Show breakdown`}
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={() => setOpen((o) => (o === "pin" ? null : "pin"))}
          className="gs-row group/gs inline-flex cursor-pointer items-center gap-1.5"
        >
          <Bar v={row.gs} className={barClass} />
          <span className={`min-w-[1.35rem] text-right font-bold leading-none decoration-dotted underline-offset-2 group-hover/gs:underline ${part ? "text-slate-400" : "text-amber-200"}`}>
            {score}
          </span>
        </button>
        {portal}
      </span>
    );
  return (
    <>
      {showDanger && row.d ? (
        <span
          className="mr-1 inline-block rounded border border-rose-500/55 bg-rose-500/20 px-[3px] align-[3px] text-[8.5px] font-extrabold leading-[13px] text-rose-300"
          title="Danger: hover or tap the score for the reasons"
          aria-label="Danger"
        >
          !
        </span>
      ) : null}
      <button
        ref={btn}
        type="button"
        aria-expanded={open != null}
        aria-label={`Canary Score ${score}${row.d ? ", Danger" : ""}. Show breakdown`}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onClick={() => setOpen((o) => (o === "pin" ? null : "pin"))}
        className={`group/gs inline-flex cursor-pointer align-middle ${variant === "wide" ? "flex-row items-center gap-1.5" : "flex-col items-end gap-0.5"}`}
      >
        {variant === "wide" ? <Bar v={row.gs} className="h-1.5 w-11" /> : null}
        <span
          className={`font-bold leading-none decoration-dotted underline-offset-2 group-hover/gs:underline ${part ? "text-slate-400" : "text-amber-200"} ${variant === "wide" ? "min-w-[1.4rem] text-right" : ""}`}
        >
          {score}
        </span>
        {variant === "compact" ? <Bar v={row.gs} className="h-[3px] w-7" /> : null}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={card}
              role="dialog"
              aria-label={`${ticker} Canary Score breakdown`}
              onMouseEnter={enter}
              onMouseLeave={leave}
              className="fixed z-[80] w-[300px] max-w-[calc(100vw-16px)] rounded-[10px] border border-canary-gold/55 bg-[#0b1222] px-3 py-2.5 text-left text-[11.5px] font-normal normal-case tracking-normal text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
              style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0 }}
            >
              <CardBody ticker={ticker} row={row} scored={scored} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/* ---------- column preferences + menu ---------- */
export interface ColumnOption {
  key: string;
  label: string;
  group?: string;
  locked?: boolean;
}

/** Visible column keys for a box; starts at the defaults (SSR-safe), then reads localStorage. */
export function useColumnPrefs(storageKey: string, all: string[], defaults: string[], locked: string[]) {
  const [vis, setVis] = useState<string[]>(defaults);
  const allKey = all.join(",");
  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(s)) setVis(allKey.split(",").filter((k) => locked.includes(k) || s.includes(k)));
    } catch {
      /* keep defaults */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, allKey]);
  const set = useCallback(
    (next: string[]) => {
      const list = allKey.split(",").filter((k) => locked.includes(k) || next.includes(k));
      setVis(list);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(list));
      } catch {
        /* private mode */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey, allKey]
  );
  const reset = useCallback(() => {
    setVis(defaults);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  return { vis, set, reset };
}

export function ColumnsMenu({ options, visible, onChange, onReset }: { options: ColumnOption[]; visible: string[]; onChange: (keys: string[]) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const b = btn.current?.getBoundingClientRect();
    const w = menu.current?.offsetWidth ?? 200;
    if (b) setPos({ x: Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8)), y: b.bottom + 4 });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (btn.current?.contains(e.target as Node) || menu.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (menu.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);
  const groups: { g: string; items: ColumnOption[] }[] = [];
  for (const o of options) {
    if (o.locked) continue;
    const g = o.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.g === g) last.items.push(o);
    else groups.push({ g, items: [o] });
  }
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`shrink-0 rounded-md border bg-slate-950/60 px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-wide transition ${open ? "border-canary-gold/70 text-canary-gold" : "border-canary-gold/35 text-slate-300 hover:border-canary-gold/70 hover:text-canary-gold"}`}
      >
        Columns ▾
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menu}
              role="menu"
              aria-label="Show or hide columns"
              className="fixed z-[85] min-w-[190px] rounded-lg border border-canary-gold/55 bg-[#0b1222] px-1 py-1.5 text-xs text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
              style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0 }}
            >
              {groups.map((g, i) => (
                <div key={g.g || i} className={i ? "mt-1 border-t border-slate-400/15 pt-1" : ""}>
                  {g.g ? <p className="mx-2 mb-0.5 mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">{g.g}</p> : null}
                  {g.items.map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-[3px] hover:bg-canary-gold/10">
                      <input
                        type="checkbox"
                        className="accent-yellow-500"
                        checked={visible.includes(o.key)}
                        onChange={(e) => onChange(e.target.checked ? [...visible, o.key] : visible.filter((k) => k !== o.key))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              ))}
              <button type="button" onClick={() => { onReset(); setOpen(false); }} className="mx-2 mb-0.5 mt-1.5 block text-[10.5px] text-canary-gold hover:underline">
                Reset to default
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/** Small bordered red badge used in the ranking box Danger column. */
export function DangerBadge({ children = "DANGER" }: { children?: ReactNode }) {
  return <span className="inline-block rounded border border-rose-500/55 bg-rose-500/20 px-1 text-[8.5px] font-extrabold leading-[14px] tracking-wider text-rose-300">{children}</span>;
}
