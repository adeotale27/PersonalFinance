import React from "react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { inr, fmtMonth } from "../lib/format";
import { Card } from "./ui";

export const PALETTE = ["#0D9488", "#2563EB", "#F59E0B", "#8B5CF6", "#EC4899", "#F97316", "#10B981", "#64748B"];
const AXIS = { fontSize: 11, fill: "#94A3B8", fontFamily: "JetBrains Mono" };

function TT({ active, payload, label, labelFmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-lg shadow-pop px-3 py-2 text-xs">
      <p className="font-semibold text-ink mb-1">{labelFmt ? labelFmt(label) : label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 num">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-subink">{p.name}:</span>
          <span className="font-semibold text-ink">{inr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, children, right, className, height = 260, testid }) {
  return (
    <Card className={"p-5 " + (className || "")} data-testid={testid}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-subink mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </Card>
  );
}

export function CashFlowArea({ data, xKey = "month", monthLabels = true }) {
  const fmt = monthLabels ? fmtMonth : (x) => x;
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
        <defs>
          <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
          <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3} /><stop offset="100%" stopColor="#F43F5E" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v, { compact: true })} width={64} />
        <Tooltip content={<TT labelFmt={fmt} />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="in" name="Money In" stroke="#10B981" strokeWidth={2} fill="url(#gIn)" />
        <Area type="monotone" dataKey="out" name="Money Out" stroke="#F43F5E" strokeWidth={2} fill="url(#gOut)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, xKey = "month", yKey = "value", name = "Value", color = "#0D9488", monthLabels = true }) {
  const fmt = monthLabels ? fmtMonth : (x) => x;
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v, { compact: true })} width={64} />
        <Tooltip content={<TT labelFmt={fmt} />} />
        <Line type="monotone" dataKey={yKey} name={name} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, xKey = "name", series = [{ key: "value", name: "Value", color: "#0D9488" }], monthLabels = false, stacked = false }) {
  const fmt = monthLabels ? fmtMonth : (x) => (typeof x === "string" && x.length > 12 ? x.slice(0, 12) + "…" : x);
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} interval={0} angle={data.length > 6 ? -18 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 44 : 24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v, { compact: true })} width={64} />
        <Tooltip content={<TT labelFmt={monthLabels ? fmtMonth : undefined} />} cursor={{ fill: "#F1F5F9" }} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} stackId={stacked ? "a" : undefined} maxBarSize={46} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
            {data.map((d, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip content={<TT />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="overline text-faint">{centerLabel}</span>
        <span className="num font-bold text-lg text-ink">{centerValue != null ? centerValue : inr(total, { compact: true })}</span>
      </div>
    </div>
  );
}

export function Legendish({ data }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-subink">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            {d.name}
          </span>
          <span className="num font-semibold text-ink">{inr(d.value, { compact: true })}</span>
        </div>
      ))}
    </div>
  );
}
