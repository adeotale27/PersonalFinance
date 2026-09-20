import React from "react";
import { Scale } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Badge } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Donut, Bars, TrendLine } from "../components/charts";
import CrudManager from "../components/CrudManager";
import { inr } from "../lib/format";

export default function NetWorth() {
  const { data, loading, error, refetch } = useFetch("/networth");
  const history = useFetch("/networth/history");
  const family = useFetch("/family");
  const ownerOpts = ["Self", ...((family.data || []).map((f) => f.name))];

  const assetFields = [
    { key: "name", label: "Asset Name", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: ["Property", "Vehicle", "Equipment", "Gold", "Investment Asset", "Other"], default: "Property" },
    { key: "purchase_value", label: "Purchase Value (₹)", type: "money" },
    { key: "current_value", label: "Current Value (₹)", type: "money", required: true },
    { key: "owner", label: "Owner", type: "select", options: ownerOpts, default: "Self" },
    { key: "ownership_percent", label: "Ownership %", type: "number", default: 100 },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  const assetCols = [
    { key: "name", label: "Asset", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "type", label: "Type", render: (r) => <Badge tone="blue">{r.type}</Badge> },
    { key: "current_value", label: "Value", align: "right", type: "money" },
  ];
  const liabFields = [
    { key: "name", label: "Liability", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: ["Loan", "Mortgage", "Credit", "Other"], default: "Loan" },
    { key: "principal", label: "Principal (₹)", type: "money" },
    { key: "outstanding", label: "Outstanding (₹)", type: "money", required: true },
    { key: "interest_rate", label: "Interest %", type: "number" },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "owner", label: "Owner", type: "select", options: ownerOpts, default: "Self" },
    { key: "ownership_percent", label: "Ownership %", type: "number", default: 100 },
  ];
  const liabCols = [
    { key: "name", label: "Liability", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "type", label: "Type", render: (r) => <Badge tone="amber">{r.type}</Badge> },
    { key: "interest_rate", label: "Rate", render: (r) => r.interest_rate ? `${r.interest_rate}%` : "—" },
    { key: "outstanding", label: "Outstanding", align: "right", render: (r) => <span className="num font-semibold text-expense">{inr(r.outstanding)}</span> },
  ];

  return (
    <>
      <PageHeader title="Net Worth" subtitle="Everything you own minus everything you owe." icon={Scale} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Net Worth" raw={data.net_worth} tone="brand" testid="nw-total" />
              <KpiCard label="Total Assets" raw={data.total_assets} tone="income" testid="nw-assets" />
              <KpiCard label="Total Liabilities" raw={data.total_liabilities} tone="expense" testid="nw-liabilities" />
            </div>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <ChartCard title="Net Worth History" subtitle="Recorded daily valuations only" height={230} className="lg:col-span-3">
                {history.data?.items?.length > 1 ? <TrendLine data={history.data.items} xKey="date" yKey="net_worth" name="Net worth" monthLabels={false} /> : <div className="h-full flex items-center justify-center text-sm text-faint">History will appear as Nivara records daily snapshots.</div>}
              </ChartCard>
              <ChartCard title="Asset Allocation" height={230} className="lg:col-span-1">
                <Donut data={(data.allocation || []).filter((a) => a.value > 0)} centerLabel="Assets" centerValue={inr(data.total_assets, { compact: true })} />
              </ChartCard>
              <ChartCard title="Assets vs Liabilities" height={230} className="lg:col-span-2">
                <Bars data={[
                  { name: "Assets", value: data.total_assets },
                  { name: "Liabilities", value: data.total_liabilities },
                  { name: "Net Worth", value: data.net_worth },
                ]} series={[{ key: "value", name: "Amount", color: "#0D9488" }]} />
              </ChartCard>
            </div>
            <Card className="p-5 mb-6">
              <h3 className="font-display font-semibold text-ink mb-3">Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(data.breakdown).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg bg-muted/60">
                    <div className="overline text-faint capitalize">{k.replace(/_/g, " ")}</div>
                    <div className="num font-semibold text-ink mt-1">{inr(v, { compact: true })}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </StateBlock>
      <div className="space-y-6">
        <CrudManager title="Assets" endpoint="/assets" addLabel="Add asset" fields={assetFields} columns={assetCols} onChanged={refetch} />
        <CrudManager title="Liabilities" endpoint="/liabilities" addLabel="Add liability" fields={liabFields} columns={liabCols} onChanged={refetch} />
      </div>
    </>
  );
}
