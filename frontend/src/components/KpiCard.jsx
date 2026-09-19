import React from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { cx } from "./ui";
import { inr } from "../lib/format";

const TONES = {
  brand:  { grad: "from-teal-500/12 to-teal-500/0",   ring: "ring-teal-500/15",  icon: "bg-teal-500 text-white",   text: "text-teal-700",   bar: "bg-teal-500" },
  income: { grad: "from-emerald-500/12 to-emerald-500/0", ring: "ring-emerald-500/15", icon: "bg-emerald-500 text-white", text: "text-emerald-700", bar: "bg-emerald-500" },
  expense:{ grad: "from-rose-500/12 to-rose-500/0",    ring: "ring-rose-500/15",  icon: "bg-rose-500 text-white",   text: "text-rose-700",    bar: "bg-rose-500" },
  amber:  { grad: "from-amber-500/14 to-amber-500/0",  ring: "ring-amber-500/15", icon: "bg-amber-500 text-white",  text: "text-amber-700",   bar: "bg-amber-500" },
  info:   { grad: "from-sky-500/12 to-sky-500/0",      ring: "ring-sky-500/15",   icon: "bg-sky-500 text-white",    text: "text-sky-700",     bar: "bg-sky-500" },
  violet: { grad: "from-violet-500/12 to-violet-500/0", ring: "ring-violet-500/15", icon: "bg-violet-500 text-white", text: "text-violet-700", bar: "bg-violet-500" },
  ink:    { grad: "from-slate-500/10 to-slate-500/0",  ring: "ring-slate-500/15", icon: "bg-ink text-white",        text: "text-ink",         bar: "bg-ink" },
};

export default function KpiCard({ label, value, raw, sub, trend, tone = "ink", icon: Icon, onClick, compact = true, testid, prefix }) {
  const t = TONES[tone] || TONES.ink;
  const clickable = !!onClick;
  const display = typeof value === "string" ? value : inr(raw != null ? raw : value, { compact });
  return (
    <div
      onClick={onClick}
      data-testid={testid}
      className={cx(
        "group relative overflow-hidden bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs ring-1 ring-transparent transition-all duration-300",
        clickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card hover:ring-line"
      )}
    >
      <div className={cx("absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none", t.grad)} />
      <div className={cx("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", t.bar)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="overline text-faint">{label}</span>
          {Icon && <span className={cx("w-9 h-9 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform", t.icon)}><Icon size={17} /></span>}
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className={cx("num font-extrabold text-xl sm:text-[26px] leading-none tracking-tight", t.text)}>{prefix}{display}</span>
          {clickable && <ChevronRight size={18} className="text-faint group-hover:text-ink group-hover:translate-x-1 transition-all shrink-0 mb-0.5" />}
        </div>
        {(sub || trend != null) && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs">
            {trend != null && (
              <span className={cx("inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md", trend >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)}%
              </span>
            )}
            {sub && <span className="text-subink">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
