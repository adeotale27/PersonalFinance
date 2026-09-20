import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale, Wallet, TrendingUp, CreditCard, Handshake, Landmark, PiggyBank,
  LineChart as LineIcon, Building2, FolderKanban, AlertTriangle, ChevronRight, Activity, Sparkles, Target, ArrowUpRight,
} from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { StateBlock, Card } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, CashFlowArea, Donut, Legendish, Bars } from "../components/charts";
import { inr, fmtDate } from "../lib/format";
import ActionCenter from "../components/ActionCenter";

export default function Overview() {
  const { data, loading, error, refetch } = useFetch("/dashboard/overview");
  const nav = useNavigate();
  const health = data ? Math.max(0, Math.min(100, Math.round(55 + (data.month_income > data.month_expense ? 18 : -12) + (data.savings > 0 ? 12 : 0) - (data.attention?.length || 0) * 4))) : 0;
  const available = data ? Math.max(0, data.month_income - data.month_expense) : 0;

  return (
    <StateBlock loading={loading} error={error} onRetry={refetch}>
      {data && (
        <>
          <div className="relative overflow-hidden rounded-[28px] mb-6 p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-teal-950 to-teal-700 text-white shadow-[0_24px_70px_rgba(4,47,46,.25)]">
            <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
            <div className="absolute -right-8 -top-8 w-64 h-64 rounded-full bg-emerald-300/15 blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-100 bg-white/10 rounded-full px-3 py-1"><Sparkles size={13}/> Nivara Finance · action-led overview</div>
                <div className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Know what deserves your attention.</div>
                <p className="text-sm text-teal-100/80 mt-2 max-w-xl">{available > 0 ? `${inr(available, { compact: true })} remains after this month’s tracked spending.` : "Review spending and upcoming actions to regain room this month."}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-teal-50/90">
                  <span>Assets <span className="num font-semibold text-white">{inr(data.total_assets, { compact: true })}</span></span>
                  <span className="w-px h-4 bg-white/20" />
                  <span>Liabilities <span className="num font-semibold text-white">{inr(data.total_liabilities, { compact: true })}</span></span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-right px-4 py-3 rounded-2xl bg-white/10 backdrop-blur border border-white/10 min-w-[130px]">
                  <div className="overline text-teal-100/80">Money health</div>
                  <div className="flex justify-end items-baseline gap-1 mt-1"><span className="num font-bold text-2xl">{health}</span><span className="text-teal-100 text-xs">/100</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <KpiCard label="Total Assets" raw={data.total_assets} tone="income" icon={Wallet} onClick={() => nav("/net-worth")} sub="shown separately" testid="kpi-total-assets" />
            <KpiCard label="Total Liabilities" raw={data.total_liabilities} tone="expense" icon={Landmark} onClick={() => nav("/net-worth")} sub="shown separately" testid="kpi-total-liabilities" />
            <KpiCard label="Financial Snapshot" value="View details" tone="brand" icon={Scale} onClick={() => nav("/net-worth")} sub="assets and obligations separately" testid="kpi-net-worth" />
            <KpiCard label="Income · This Month" raw={data.month_income} tone="income" icon={TrendingUp} onClick={() => nav("/income")} testid="kpi-month-income" />
            <KpiCard label="Expense · This Month" raw={data.month_expense} tone="expense" icon={CreditCard} onClick={() => nav("/expenses")} testid="kpi-month-expense" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
            <Card className="p-5 lg:col-span-2 bg-gradient-to-br from-white to-teal-50/55">
              <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="w-8 h-8 grid place-items-center rounded-xl bg-teal-100 text-brand"><Target size={16}/></span><h3 className="font-display font-semibold text-ink">This month’s focus</h3></div><p className="text-sm text-subink mt-3">{available >= 0 ? "Your tracked income currently covers spending. Keep building a buffer for planned payments." : "Tracked spending is ahead of income. Review expenses and upcoming commitments."}</p></div><button onClick={() => nav("/cash-flow")} className="text-brand text-sm font-semibold inline-flex items-center gap-1 whitespace-nowrap">Explore cash flow <ArrowUpRight size={15}/></button></div>
              <div className="mt-4 h-2.5 rounded-full bg-teal-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${Math.min(100, Math.max(8, health))}%` }}/></div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100"><div className="overline text-brand">Saved this month</div><div className="num text-3xl font-extrabold text-ink mt-2">{inr(data.month_savings, { compact: true })}</div><p className="text-xs text-subink mt-2">A clearer view, without reducing your finances to a single number.</p></Card>
          </div>

          <div className="mb-6"><ActionCenter compact /></div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <KpiCard label="Money Lent Out" raw={data.lending_outstanding} tone="info" icon={Handshake} onClick={() => nav("/lending")} sub="outstanding" testid="kpi-lending" />
            <KpiCard label="Borrowings" raw={data.borrowing_outstanding} tone="amber" icon={Landmark} onClick={() => nav("/lending?tab=BORROWED")} sub="outstanding" testid="kpi-borrowing" />
            <KpiCard label="Savings + PF/PPF" raw={data.savings + data.pf_ppf} tone="brand" icon={PiggyBank} onClick={() => nav("/savings")} testid="kpi-savings" />
            <KpiCard label="Investments" raw={data.investments} tone="ink" icon={LineIcon} onClick={() => nav("/net-worth")} testid="kpi-investments" />
          </div>

          {/* Cash flow + allocation */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <ChartCard title="Cash Flow" subtitle="Money in vs money out · last 12 months" className="lg:col-span-2" testid="chart-cashflow">
              <CashFlowArea data={data.cash_flow} />
            </ChartCard>
            <ChartCard title="Wealth Allocation" subtitle="Where your money sits" height={200} testid="chart-allocation">
              <Donut data={(data.allocation || []).filter((a) => a.value > 0)} centerLabel="Assets" centerValue={inr(data.total_assets, { compact: true })} />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <ChartCard title="Liability Allocation" subtitle="What you owe, by obligation" height={210}>
              {(data.liability_allocation || []).some((item) => item.value > 0) ? <Donut data={data.liability_allocation.filter((item) => item.value > 0)} centerLabel="Liabilities" centerValue={inr(data.total_liabilities, { compact: true })} /> : <Empty />}
            </ChartCard>
            <Card className="p-5 lg:col-span-2"><div className="flex items-center justify-between"><div><div className="overline text-faint">Cash position</div><h3 className="font-display font-semibold text-ink mt-1">Available and expected cash</h3></div><button onClick={() => nav("/cash-flow")} className="text-sm font-semibold text-brand">Open forecast</button></div><div className="grid sm:grid-cols-3 gap-3 mt-5">{[["Available now", data.cash_position?.available_now], ["Expected receivables", data.cash_position?.expected_receivables], ["Known obligations", data.cash_position?.upcoming_obligations]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/60 p-3"><div className="overline text-faint">{label}</div><div className="num font-bold text-lg text-ink mt-1">{inr(value, { compact: true })}</div></div>)}</div></Card>
          </div>

          {/* Breakdown + attention */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <ChartCard title="Income by Source" height={220} testid="chart-income-breakdown">
              {data.income_breakdown?.length ? <Bars data={data.income_breakdown} series={[{ key: "value", name: "Income", color: "#10B981" }]} /> : <Empty />}
            </ChartCard>
            <ChartCard title="Expenses by Category" height={220} testid="chart-expense-breakdown">
              {data.expense_breakdown?.length ? <Bars data={data.expense_breakdown} series={[{ key: "value", name: "Expense", color: "#F43F5E" }]} /> : <Empty />}
            </ChartCard>

            <Card className="p-5" data-testid="attention-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-amber-light text-amber flex items-center justify-center"><AlertTriangle size={16} /></span>
                <h3 className="font-display font-semibold text-ink">Attention Required</h3>
              </div>
              {data.attention?.length ? (
                <div className="space-y-2">
                  {data.attention.map((a, i) => (
                    <button key={i} onClick={() => nav(a.path)} data-testid={`attention-${a.type}`}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted text-left transition-colors group">
                      <span className="text-sm text-ink">{a.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="num font-semibold text-sm text-expense">{inr(a.value, { compact: true })}</span>
                        <ChevronRight size={15} className="text-faint group-hover:text-brand" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-subink py-6 text-center">All clear — nothing needs attention. 🎉</p>}
            </Card>
          </div>

          {/* Projects strip + recent activity */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <KpiCard label="Active Projects" value={String(data.active_projects)} tone="brand" icon={FolderKanban} onClick={() => nav("/projects")} sub={`${data.total_projects} total`} testid="kpi-projects" />
              <KpiCard label="Rent Collected · Month" raw={data.month_rent_collected} tone="income" icon={Building2} onClick={() => nav("/rental")} testid="kpi-rent" />
            </div>
            <Card className="p-5 lg:col-span-2" data-testid="recent-activity">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-muted text-subink flex items-center justify-center"><Activity size={16} /></span>
                <h3 className="font-display font-semibold text-ink">Recent Activity</h3>
              </div>
              {data.recent_activity?.length ? (
                <div className="divide-y divide-line">
                  {data.recent_activity.slice(0, 7).map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-ink capitalize">{(a.action || "").replace(/_/g, " ")} <span className="text-faint">· {a.entity}</span></span>
                      <span className="text-xs text-faint">{fmtDate(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-subink py-6 text-center">No activity yet.</p>}
            </Card>
          </div>
        </>
      )}
    </StateBlock>
  );
}

function Empty() { return <div className="h-full flex items-center justify-center text-sm text-faint">No data yet</div>; }
