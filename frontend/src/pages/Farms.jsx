import React, { useState } from "react";
import { Sprout, MapPin, Leaf } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Badge, Segmented } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, CashFlowArea } from "../components/charts";
import CrudManager from "../components/CrudManager";
import { inr, todayISO } from "../lib/format";

export default function Farms() {
  const { data: s, loading, error, refetch } = useFetch("/farms/summary");
  const farms = useFetch("/farms");
  const [filter, setFilter] = useState("all");

  const farmOpts = (farms.data || []).map((f) => ({ value: f.id, label: `${f.name} (${f.number})` }));
  const farmMap = Object.fromEntries((farms.data || []).map((f) => [f.id, f.name]));

  const farmFields = [
    { key: "name", label: "Farm Name", required: true },
    { key: "number", label: "Farm Number / ID", required: true },
    { key: "crop", label: "Crop", default: "Guava" },
    { key: "area", label: "Area", type: "number" },
    { key: "area_unit", label: "Unit", type: "select", options: ["acre", "hectare", "guntha", "bigha"], default: "acre" },
    { key: "location", label: "Location", full: true },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  const farmCols = [
    { key: "name", label: "Farm", render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-xs text-faint num">{r.number}</div></div> },
    { key: "crop", label: "Crop", render: (r) => <Badge tone="green"><Leaf size={11} /> {r.crop}</Badge> },
    { key: "area", label: "Area", render: (r) => `${r.area || "—"} ${r.area_unit || ""}` },
    { key: "location", label: "Location" },
  ];

  const ledgerFields = [
    { key: "type", label: "Type", type: "select", options: [{ value: "INCOME", label: "Income" }, { value: "EXPENSE", label: "Expense" }], default: "EXPENSE", required: true },
    { key: "farm_id", label: "Farm", type: "select", options: farmOpts, required: true },
    { key: "date", label: "Date", type: "date", default: todayISO(), required: true },
    { key: "amount", label: "Amount (₹)", type: "money", required: true },
    { key: "category", label: "Category / Source", placeholder: "Guava Sale, Fertilizer, Labour…", required: true },
    { key: "description", label: "Note", full: true },
  ];
  const ledgerCols = [
    { key: "date", label: "Date", type: "date" },
    { key: "farm_id", label: "Farm", render: (r) => <span className="font-medium text-ink">{farmMap[r.farm_id] || "—"}</span> },
    { key: "type", label: "Type", render: (r) => <Badge tone={r.type === "INCOME" ? "green" : "red"}>{r.type}</Badge> },
    { key: "category", label: "Category", render: (r) => r.category || r.source || "—" },
    { key: "amount", label: "Amount", align: "right", render: (r) => <span className={"num font-semibold " + (r.type === "INCOME" ? "text-income" : "text-expense")}>{inr(r.amount)}</span> },
  ];

  const ledgerUrl = filter === "all" ? "/transactions?scope=FARM" : `/transactions?scope=FARM&farm_id=${filter}`;

  return (
    <>
      <PageHeader title="Farms & Farming" subtitle="Per-farm income & expense ledger for your guava farms." icon={Sprout} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {s && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Farm Income" raw={s.total_income} tone="income" testid="farm-income" />
              <KpiCard label="Farm Expense" raw={s.total_expense} tone="expense" testid="farm-expense" />
              <KpiCard label="Net Profit" raw={s.net} tone={s.net >= 0 ? "brand" : "expense"} testid="farm-net" />
              <KpiCard label="Farms" value={String(s.count)} tone="violet" icon={Sprout} testid="farm-count" />
            </div>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {s.per_farm.map((f) => (
                <Card key={f.id} className="p-5" data-testid={`farm-summary-${f.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div><h3 className="font-display font-semibold text-ink">{f.name}</h3><div className="flex items-center gap-1 text-xs text-faint mt-0.5"><MapPin size={11} /> {f.location || "—"} · {f.area} {f.area_unit}</div></div>
                    <Badge tone="green">{f.number}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-50"><div className="overline text-faint">Income</div><div className="num font-semibold text-sm text-income">{inr(f.income, { compact: true })}</div></div>
                    <div className="p-2 rounded-lg bg-rose-50"><div className="overline text-faint">Expense</div><div className="num font-semibold text-sm text-expense">{inr(f.expense, { compact: true })}</div></div>
                    <div className="p-2 rounded-lg bg-teal-50"><div className="overline text-faint">Net</div><div className="num font-semibold text-sm text-brand">{inr(f.net, { compact: true })}</div></div>
                  </div>
                </Card>
              ))}
            </div>
            {s.monthly?.length > 0 && (
              <ChartCard title="Farm Cash Flow" subtitle="Income vs expense" height={240} className="mb-6">
                <CashFlowArea data={s.monthly} />
              </ChartCard>
            )}
          </>
        )}
      </StateBlock>

      <div className="space-y-6">
        <CrudManager title="Farms" endpoint="/farms" addLabel="Add farm" fields={farmFields} columns={farmCols} onChanged={() => { refetch(); farms.refetch(); }} />
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="font-display font-semibold text-ink px-1">Farm Ledger</h3>
            <Segmented testid="farm-filter" value={filter} onChange={setFilter}
              options={[{ value: "all", label: "All" }, ...(farms.data || []).map((f) => ({ value: f.id, label: f.name }))]} />
          </div>
          <CrudManager title="Ledger Entries" endpoint="/transactions" listEndpoint={ledgerUrl}
            addLabel="Add entry" fields={ledgerFields} columns={ledgerCols} onChanged={refetch}
            transform={(x) => ({ ...x, scope: "FARM", source: x.type === "INCOME" ? x.category : undefined })} deps={[filter, farms.data?.length]} />
        </div>
      </div>
    </>
  );
}
