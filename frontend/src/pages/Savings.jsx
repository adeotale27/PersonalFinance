import React from "react";
import { PiggyBank, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Badge } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Donut, TrendLine } from "../components/charts";
import CrudManager from "../components/CrudManager";
import { inr, todayISO } from "../lib/format";

export default function Savings() {
  const nav = useNavigate();
  const { data: s, loading, error, refetch } = useFetch("/savings/summary");
  const invSummary = useFetch("/investments");
  const family = useFetch("/family");
  const ownerOpts = ["Self", ...((family.data || []).map((f) => f.name))];

  const invTotal = (invSummary.data || []).reduce((a, i) => a + (i.current_value || 0), 0);
  const invCost = (invSummary.data || []).reduce((a, i) => a + (i.cost || 0), 0);

  const savingsFields = [
    { key: "name", label: "Name", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: ["SAVINGS", "FD", "RD", "CASH", "OTHER"], default: "SAVINGS", required: true },
    { key: "institution", label: "Institution" },
    { key: "owner", label: "Owner", type: "select", options: ownerOpts, default: "Self" },
    { key: "ownership_percent", label: "Ownership %", type: "number", default: 100 },
    { key: "current_value", label: "Current Value (₹)", type: "money", required: true },
    { key: "interest_rate", label: "Interest %", type: "number" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "maturity_date", label: "Maturity Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  const savingsCols = [
    { key: "name", label: "Name", render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-xs text-faint">{r.institution}</div></div> },
    { key: "type", label: "Type", render: (r) => <Badge tone="brand">{r.type}</Badge> },
    { key: "owner", label: "Owner" },
    { key: "interest_rate", label: "Rate", render: (r) => r.interest_rate ? `${r.interest_rate}%` : "—" },
    { key: "current_value", label: "Value", align: "right", type: "money" },
  ];

  const invFields = [
    { key: "name", label: "Investment", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: ["Stocks", "Mutual Fund", "Bonds", "Deposits", "Gold", "Crypto", "Other"], default: "Mutual Fund" },
    { key: "cost", label: "Invested (₹)", type: "money", required: true },
    { key: "current_value", label: "Current Value (₹)", type: "money", required: true },
    { key: "owner", label: "Owner", type: "select", options: ownerOpts, default: "Self" },
    { key: "ownership_percent", label: "Ownership %", type: "number", default: 100 },
  ];
  const invCols = [
    { key: "name", label: "Investment", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "type", label: "Type", render: (r) => <Badge tone="blue">{r.type}</Badge> },
    { key: "cost", label: "Invested", align: "right", type: "money" },
    { key: "current_value", label: "Current", align: "right", type: "money" },
    { key: "gain", label: "Gain/Loss", align: "right", render: (r) => { const g = (r.current_value || 0) - (r.cost || 0); return <span className={"num font-semibold " + (g >= 0 ? "text-income" : "text-expense")}>{g >= 0 ? "+" : ""}{inr(g)}</span>; } },
  ];

  return (
    <>
      <PageHeader title="Savings & Investments" subtitle="Deposits, savings instruments and market investments." icon={PiggyBank} actions={<button onClick={()=>nav("/smart-import")} className="inline-flex h-9 items-center gap-2 px-3 rounded-lg bg-brand text-white text-xs font-semibold"><Bot size={15}/> Smart import</button>} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {s && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Total Savings" raw={s.total} tone="brand" testid="sav-total" />
              <KpiCard label="Savings Products" value={String(s.count)} tone="ink" testid="sav-count" />
              <KpiCard label="Investments Value" raw={invTotal} tone="info" testid="sav-inv" />
              <KpiCard label="Investment Gain" raw={invTotal - invCost} tone={invTotal - invCost >= 0 ? "income" : "expense"} testid="sav-gain" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <ChartCard title="Savings by Type" height={220}>
                {s.by_type?.length ? <Donut data={s.by_type} centerLabel="Total" centerValue={inr(s.total, { compact: true })} /> : <NoData />}
              </ChartCard>
              <ChartCard title="Contribution Trend" height={220}>
                {s.contribution_trend?.length ? <TrendLine data={s.contribution_trend} color="#0D9488" name="Contributed" /> : <NoData />}
              </ChartCard>
            </div>
          </>
        )}
      </StateBlock>
      <div className="space-y-6">
        <CrudManager title="Savings Products" endpoint="/savings" addLabel="Add savings" fields={savingsFields} columns={savingsCols} onChanged={refetch} />
        <CrudManager title="Investments" endpoint="/investments" addLabel="Add investment" fields={invFields} columns={invCols} onChanged={() => { refetch(); invSummary.refetch(); }} />
      </div>
    </>
  );
}
function NoData() { return <div className="h-full flex items-center justify-center text-sm text-faint">No data yet</div>; }
