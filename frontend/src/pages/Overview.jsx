import React, { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CircleDollarSign, Landmark, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import { useAuth } from "../lib/auth";
import { Badge, Card, DetailDrawer, Segmented, StateBlock } from "../components/ui";
import { Bars, ChartCard, Donut, Legendish, TrendLine } from "../components/charts";
import { inr } from "../lib/format";
import ActionCenter from "../components/ActionCenter";

const ranges = [{ value: "1M", label: "1M" }, { value: "6M", label: "6M" }, { value: "1Y", label: "1Y" }, { value: "ALL", label: "All" }];

export default function Overview() {
  const nav = useNavigate();
  const [range, setRange] = useState("ALL");
  const [drawer, setDrawer] = useState(null);
  const overview = useFetch("/dashboard/overview");
  const history = useFetch("/networth/history");
  const { user } = useAuth();
  const data = overview.data;
  const historyData = useMemo(() => {
    const all = history.data?.items || [];
    if (range === "ALL") return all;
    const days = range === "1M" ? 31 : range === "6M" ? 183 : 365;
    const after = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return all.filter((point) => point.date >= after);
  }, [history.data, range]);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return <StateBlock loading={overview.loading || history.loading} error={overview.error || history.error} onRetry={() => { overview.refetch(); history.refetch(); }}>
    {data && <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 px-0.5">
        <div><Badge tone="green" className="mb-3"><Sparkles size={12} /> Complete financial picture</Badge><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">{greeting}, {(user?.name || "there").split(" ")[0]}.</h1><p className="mt-1 text-sm text-subink">Your wealth moved <span className={data.month_savings >= 0 ? "font-bold text-income" : "font-bold text-expense"}>{data.month_savings >= 0 ? "+" : ""}{inr(data.month_savings, { compact: true })}</span> this month.</p></div>
        <Segmented options={ranges} value={range} onChange={setRange} />
      </section>

      <section className="grid xl:grid-cols-12 gap-4 sm:gap-5">
        <div className="nivara-hero rounded-2xl p-5 sm:p-6 xl:col-span-8 min-h-[390px] flex flex-col">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-semibold text-subink">Total net worth</div><div className="num text-4xl sm:text-5xl font-bold text-ink mt-1.5">{inr(data.net_worth, { compact: true })}<span className="ml-3 align-middle font-sans text-xs font-bold text-income bg-emerald-100/90 px-2 py-1 rounded-full">↗ 12.4%</span></div><p className="text-xs text-subink mt-2">Updated moments ago · <button onClick={() => nav("/net-worth")} className="hover:text-brand">1Y view</button></p></div><button onClick={() => nav("/net-worth")} className="soft-tile px-3.5 py-2 rounded-lg text-xs font-bold text-ink hover:text-brand transition-colors">View statement <ArrowRight size={15} className="inline ml-1" /></button></div>
          <div className="hero-chart-shell relative z-10 rounded-xl mt-5 flex-1 min-h-[190px] p-2.5"><TrendLine data={historyData} xKey="date" yKey="net_worth" name="Net worth" monthLabels={false} color="#4B5BE5" /></div>
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3"><MiniStat label="Assets" value={inr(data.total_assets, { compact: true })} onClick={() => setDrawer("assets")} /><MiniStat label="Liabilities" value={inr(data.total_liabilities, { compact: true })} onClick={() => setDrawer("liabilities")} /><MiniStat label="This month" value={`${data.month_savings >= 0 ? "+" : ""}${inr(data.month_savings, { compact: true })}`} positive /></div>
        </div>

        <Card className="xl:col-span-4 p-5 sm:p-6 flex flex-col min-h-[390px]"><div className="flex items-start justify-between"><div><div className="overline text-faint">Financial health</div><h2 className="font-display text-xl font-semibold text-ink mt-1">Looking strong</h2></div><span className="w-10 h-10 rounded-xl bg-emerald-100 text-income grid place-items-center"><Sparkles size={18} /></span></div><div className="flex items-center gap-5 mt-6"><div className="health-ring w-28 h-28 rounded-full p-3" style={{ "--score": "82%" }}><div className="w-full h-full rounded-full bg-white grid place-items-center text-center"><strong className="num text-2xl">82</strong><span className="text-[9px] text-faint -mt-2">out of 100</span></div></div><div className="space-y-2 text-xs"><HealthItem label="Liquidity" value="Excellent" /><HealthItem label="Debt ratio" value="Healthy" /><HealthItem label="Diversification" value="Good" /></div></div><div className="mt-auto rounded-xl bg-emerald-100/80 border border-emerald-100 px-4 py-3.5"><p className="font-bold text-xs text-income">You’re ahead of plan</p><p className="text-[11px] text-subink mt-1">Your current pace could bring your next goal closer.</p><button onClick={() => nav("/planner")} className="mt-2 text-xs text-income font-bold">Review plan <ArrowRight size={13} className="inline" /></button></div></Card>
      </section>

      <section className="grid lg:grid-cols-12 gap-4 sm:gap-5"><ChartCard className="lg:col-span-7" title="Asset allocation" subtitle="Your capital, balanced across holdings" right={<button onClick={() => nav("/net-worth")} className="text-xs font-bold text-income">View portfolio <ArrowRight size={13} className="inline" /></button>} height={235}><div className="h-full grid sm:grid-cols-[180px_1fr] items-center gap-3"><div className="h-[180px]"><Donut data={(data.allocation || []).filter((row) => row.value > 0)} centerLabel="Total assets" centerValue={inr(data.total_assets, { compact: true })} /></div><Legendish data={(data.allocation || []).filter((row) => row.value > 0)} /></div></ChartCard><ChartCard className="lg:col-span-5" title="Monthly cash flow" subtitle="Income versus expenses" right={<button onClick={() => nav("/cash-flow")} className="text-xs font-bold text-income">See details <ArrowRight size={13} className="inline" /></button>} height={235}><div className="grid grid-cols-2 gap-3 mb-4"><CashTile label="Income" value={data.month_income} positive /><CashTile label="Expenses" value={data.month_expense} /></div><div className="h-[132px]"><Bars data={data.cash_flow || []} xKey="month" monthLabels series={[{ key: "in", name: "Income", color: "#05A66C" }, { key: "out", name: "Expenses", color: "#F6B4A7" }]} /></div></ChartCard></section>

      <section className="grid lg:grid-cols-12 gap-4 sm:gap-5"><div className="lg:col-span-7 min-w-0"><ActionCenter compact /></div><Card className="lg:col-span-5 min-w-0 p-5 sm:p-6"><div className="flex items-start justify-between"><div><div className="overline text-faint">Your position</div><h3 className="font-display font-semibold text-lg text-ink mt-1">At a glance</h3></div><button onClick={() => nav("/planner")} className="w-9 h-9 rounded-xl bg-brand-light text-brand grid place-items-center"><ArrowUpRight size={17} /></button></div><div className="divide-y divide-line mt-4">{[["Liquid today", data.cash_position?.available_now, Wallet, "/accounts"], ["Expected receivables", data.cash_position?.expected_receivables, CircleDollarSign, "/lending"], ["Known obligations", data.cash_position?.upcoming_obligations, Landmark, "/loans"]].map(([label, value, Icon, path]) => <button key={label} onClick={() => nav(path)} className="w-full flex items-center justify-between py-3.5 text-left group"><span className="flex min-w-0 items-center gap-3 text-sm text-subink"><span className="w-8 h-8 shrink-0 rounded-lg bg-muted text-brand grid place-items-center"><Icon size={15} /></span><span className="truncate">{label}</span></span><span className="num shrink-0 font-bold text-ink group-hover:text-brand">{inr(value, { compact: true })}</span></button>)}</div></Card></section>

      <DetailDrawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer === "assets" ? "Asset allocation" : "Liabilities"} eyebrow="Financial breakdown"><div className="space-y-3">{(drawer === "assets" ? data.allocation : data.liability_allocation).filter((row) => row.value > 0).map((row) => <button onClick={() => nav(drawer === "assets" ? "/net-worth" : "/loans")} key={row.name} className="w-full text-left p-4 rounded-xl border border-line hover:border-brand/30 hover:bg-brand-light/30 flex justify-between"><span className="font-semibold text-ink">{row.name}</span><span className="num font-bold">{inr(row.value)}</span></button>)}</div></DetailDrawer>
    </div>}
  </StateBlock>;
}

function MiniStat({ label, value, positive, onClick }) { return <button onClick={onClick} className="soft-tile text-left rounded-xl px-3 py-2.5 min-w-0"><span className="block text-[10px] text-subink truncate">{label}</span><strong className={`num block text-sm sm:text-base mt-1 truncate ${positive ? "text-income" : "text-ink"}`}>{value}</strong></button>; }
function HealthItem({ label, value }) { return <div><span className="block text-faint">{label}</span><strong className="block text-income font-bold">{value}</strong></div>; }
function CashTile({ label, value, positive }) { return <div className="rounded-xl bg-muted/80 p-3"><span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] ${positive ? "bg-emerald-100 text-income" : "bg-rose-100 text-expense"}`}>{positive ? "↓" : "↗"}</span><span className="block text-[10px] text-subink mt-2">{label}</span><strong className="num text-lg text-ink mt-0.5 block">{inr(value, { compact: true })}</strong></div>; }
