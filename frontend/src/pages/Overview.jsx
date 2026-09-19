import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale, Wallet, TrendingUp, CreditCard, Handshake, Landmark, PiggyBank,
  LineChart as LineIcon, Building2, FolderKanban, AlertTriangle, ChevronRight, Activity,
} from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { StateBlock, Card } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, CashFlowArea, Donut, Legendish, Bars } from "../components/charts";
import { inr, fmtDate } from "../lib/format";

export default function Overview() {
  const { data, loading, error, refetch } = useFetch("/dashboard/overview");
  const nav = useNavigate();

  return (
    <StateBlock loading={loading} error={error} onRetry={refetch}>
      {data && (
        <>
          <div className="relative overflow-hidden rounded-2xl mb-6 p-6 sm:p-7 bg-gradient-to-br from-brand-dark via-brand to-teal-600 text-white shadow-pop">
            <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
            <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="overline text-teal-100/80">Total Net Worth</div>
                <div className="num font-extrabold text-4xl sm:text-5xl tracking-tight mt-1">{inr(data.net_worth)}</div>
                <div className="flex items-center gap-4 mt-3 text-sm text-teal-50/90">
                  <span>Assets <span className="num font-semibold text-white">{inr(data.total_assets, { compact: true })}</span></span>
                  <span className="w-px h-4 bg-white/20" />
                  <span>Liabilities <span className="num font-semibold text-white">{inr(data.total_liabilities, { compact: true })}</span></span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-right px-4 py-2 rounded-xl bg-white/10 backdrop-blur">
                  <div className="overline text-teal-100/80">Saved this month</div>
                  <div className="num font-bold text-xl">{inr(data.month_savings, { compact: true })}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <KpiCard label="Net Worth" raw={data.net_worth} tone="brand" icon={Scale} onClick={() => nav("/net-worth")} sub={`Assets ${inr(data.total_assets, { compact: true })}`} testid="kpi-net-worth" />
            <KpiCard label="Cash + Bank" raw={data.cash + data.bank} tone="ink" icon={Wallet} onClick={() => nav("/accounts")} sub={`Cash ${inr(data.cash, { compact: true })}`} testid="kpi-cash-bank" />
            <KpiCard label="Income · This Month" raw={data.month_income} tone="income" icon={TrendingUp} onClick={() => nav("/income")} testid="kpi-month-income" />
            <KpiCard label="Expense · This Month" raw={data.month_expense} tone="expense" icon={CreditCard} onClick={() => nav("/expenses")} testid="kpi-month-expense" />
          </div>

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
