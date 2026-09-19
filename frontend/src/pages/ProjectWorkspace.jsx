import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { StateBlock, Card, Badge, StatusBadge, Segmented, Spinner } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Bars, CashFlowArea, Donut } from "../components/charts";
import CrudManager from "../components/CrudManager";
import DocumentsPanel from "../components/DocumentsPanel";
import { inr } from "../lib/format";

export default function ProjectWorkspace() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const project = useFetch(`/projects/${id}`, [id]);
  const finance = useFetch(`/projects/${id}/finance`, [id]);
  const accounts = useFetch("/accounts");
  const settings = useFetch("/settings");

  const p = project.data;
  const f = finance.data;

  const partyFields = [
    { key: "name", label: "Party Name", required: true, full: true },
    { key: "party_type", label: "Type", type: "select", options: ["Architect", "Civil Contractor", "Contractor A", "Contractor B", "Plumber", "Electrician", "Structural Consultant", "Interior Contractor", "Material Supplier", "Consultant", "Other"], default: "Civil Contractor" },
    { key: "scope", label: "Scope of Work" },
    { key: "contact", label: "Contact" },
    { key: "contract_value", label: "Contract Value (₹)", type: "money" },
  ];
  const partyCols = [
    { key: "name", label: "Party", render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-xs text-faint">{r.scope}</div></div> },
    { key: "party_type", label: "Type", render: (r) => <Badge tone="blue">{r.party_type}</Badge> },
    { key: "contract_value", label: "Contract", align: "right", type: "money" },
    { key: "paid", label: "Paid", align: "right", render: (r) => <span className="num text-income">{inr(r.paid)}</span> },
    { key: "outstanding", label: "Outstanding", align: "right", render: (r) => <span className="num font-semibold">{inr(r.outstanding)}</span> },
  ];

  const expFields = settings.data && accounts.data ? [
    { key: "date", label: "Date", type: "date", required: true },
    { key: "amount", label: "Amount (₹)", type: "money", required: true },
    { key: "category", label: "Category", type: "select", options: settings.data.project_categories || [], required: true },
    { key: "party", label: "Paid To (party)" },
    { key: "account_id", label: "From Account", type: "select", options: (accounts.data || []).map((a) => ({ value: a.id, label: a.name })) },
    { key: "description", label: "Description", full: true },
  ] : null;
  const expCols = [
    { key: "date", label: "Date", type: "date" },
    { key: "category", label: "Category", render: (r) => <Badge tone="brand">{r.category}</Badge> },
    { key: "party", label: "Paid To" },
    { key: "description", label: "Note", render: (r) => <span className="text-subink">{r.description || "—"}</span> },
    { key: "amount", label: "Amount", align: "right", render: (r) => <span className="num font-semibold text-expense">{inr(r.amount)}</span> },
  ];

  return (
    <StateBlock loading={project.loading} error={project.error} onRetry={project.refetch}>
      {p && (
        <>
          <button onClick={() => nav("/projects")} className="flex items-center gap-1.5 text-sm text-subink hover:text-ink mb-4" data-testid="back-projects"><ArrowLeft size={16} /> All projects</button>
          <Card className="overflow-hidden mb-6">
            <div className="h-40 sm:h-52 bg-muted relative">
              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="flex items-center gap-2 mb-1"><Badge tone="brand">{p.type}</Badge><StatusBadge status={p.status} /></div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{p.name}</h1>
                {p.location && <div className="flex items-center gap-1 text-sm text-white/80 mt-1"><MapPin size={13} /> {p.location}</div>}
              </div>
            </div>
          </Card>

          <div className="mb-6 overflow-x-auto -mx-1 px-1">
            <Segmented testid="proj-tabs" value={tab} onChange={setTab}
              options={[{ value: "overview", label: "Overview" }, { value: "finance", label: "Finance" }, { value: "parties", label: "Parties" }, { value: "documents", label: "Documents" }]} />
          </div>

          {!f ? <div className="py-10 flex justify-center"><Spinner className="w-6 h-6 text-brand" /></div> : (
            <>
              {(tab === "overview" || tab === "finance") && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <KpiCard label="Budget" raw={f.budget} tone="ink" testid="pf-budget" />
                    <KpiCard label="Received" raw={f.received} tone="income" testid="pf-received" />
                    <KpiCard label="Spent" raw={f.spent} tone="expense" testid="pf-spent" />
                    <KpiCard label="Remaining Budget" raw={f.remaining_budget} tone={f.remaining_budget >= 0 ? "brand" : "expense"} testid="pf-remaining" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <KpiCard label="Committed" raw={f.committed} tone="amber" testid="pf-committed" />
                    <KpiCard label="Outstanding" raw={f.outstanding} tone="ink" />
                    <KpiCard label="Available" raw={f.available} tone="info" />
                    <KpiCard label="Utilization" value={`${f.utilization}%`} tone="brand" />
                  </div>
                  <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    <ChartCard title="Monthly In vs Out" className="lg:col-span-2" height={240}>
                      {f.monthly?.length ? <CashFlowArea data={f.monthly} /> : <NoData />}
                    </ChartCard>
                    <ChartCard title="Cost by Category" height={240}>
                      {f.cost_by_category?.length ? <Donut data={f.cost_by_category} centerLabel="Spent" centerValue={inr(f.spent, { compact: true })} /> : <NoData />}
                    </ChartCard>
                  </div>
                  <ChartCard title="Cost by Party" height={240} className="mb-6">
                    {f.cost_by_party?.length ? <Bars data={f.cost_by_party} series={[{ key: "value", name: "Paid", color: "#0D9488" }]} /> : <NoData />}
                  </ChartCard>
                </>
              )}

              {tab === "finance" && expFields && (
                <CrudManager title="Project Expenses" endpoint="/transactions" listEndpoint={`/transactions?type=EXPENSE&project_id=${id}`}
                  addLabel="Add expense" fields={expFields} columns={expCols} onChanged={() => { finance.refetch(); project.refetch(); }}
                  transform={(x) => ({ ...x, type: "EXPENSE", scope: "PROJECT", project_id: id })} deps={[id]} />
              )}

              {tab === "parties" && (
                <CrudManager title="Parties & Vendors" endpoint="/parties" listEndpoint={`/parties?project_id=${id}`}
                  addLabel="Add party" fields={partyFields} columns={partyCols} onChanged={finance.refetch}
                  transform={(x) => ({ ...x, project_id: id })} deps={[id]} />
              )}

              {tab === "documents" && <DocumentsPanel projectId={id} title="Project Documents" />}
            </>
          )}
        </>
      )}
    </StateBlock>
  );
}
function NoData() { return <div className="h-full flex items-center justify-center text-sm text-faint">No data yet</div>; }
