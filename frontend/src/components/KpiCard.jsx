import React from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { cx } from "./ui";
import { inr } from "../lib/format";

const toneMap = {
  brand: "text-brand", income: "text-income", expense: "text-expense",
  amber: "text-amber", info: "text-info", ink: "text-ink",
};

export default function KpiCard({ label, value, raw, sub, trend, tone = "ink", icon: Icon, onClick, compact = true, testid, prefix }) {
  const clickable = !!onClick;
  const display = typeof value === "string" ? value : inr(raw != null ? raw : value, { compact });
  return (
    <div
      onClick={onClick}
      data-testid={testid}
      className={cx(
        "group relative bg-surface rounded-xl border border-line p-4 sm:p-5 shadow-xs transition-all",
        clickable && "cursor-pointer hover:border-brand/40 hover:shadow-card"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="overline text-faint">{label}</span>
        {Icon && (
          <span className={cx("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", toneMap[tone])}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={cx("num font-bold text-xl sm:text-2xl tracking-tight", toneMap[tone])}>
          {prefix}{display}
        </span>
        {clickable && <ChevronRight size={18} className="text-faint group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 mb-1" />}
      </div>
      {(sub || trend != null) && (
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          {trend != null && (
            <span className={cx("inline-flex items-center gap-0.5 font-semibold", trend >= 0 ? "text-income" : "text-expense")}>
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-subink">{sub}</span>}
        </div>
      )}
    </div>
  );
}
