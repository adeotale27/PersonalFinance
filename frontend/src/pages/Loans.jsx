import React from "react";
import { Download, Landmark } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Badge, StatusBadge, Card, Button } from "../components/ui";
import KpiCard from "../components/KpiCard";
import CrudManager from "../components/CrudManager";
import { inr, fmtDate } from "../lib/format";
import { downloadEntity } from "../lib/export";

export default function Loans() {
  const { data: s, loading, error, refetch } = useFetch("/loans/summary");
  const list = useFetch("/loans");
  const family = useFetch("/family");
  const ownerOpts = ["Self", ...((family.data || []).map((f) => f.name))];

  const fields = [
    { key: "name", label: "Loan Name", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: ["Home Loan", "Vehicle Loan", "Personal Loan", "Business Loan", "Gold Loan", "Other"], default: "Home Loan" },
    { key: "lender", label: "Lender / Bank" },
    { key: "branch", label: "Branch" },
    { key: "property", label: "Property / Asset", full: true },
    { key: "sanctioned", label: "Sanctioned (₹)", type: "money" },
    { key: "disbursed", label: "Disbursed (₹)", type: "money" },
    { key: "outstanding", label: "Outstanding (₹)", type: "money", required: true },
    { key: "emi", label: "EMI (₹)", type: "money" },
    { key: "interest_rate", label: "Interest %", type: "number" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "disbursement_date", label: "Disbursement Date", type: "date" },
    { key: "next_due_date", label: "Next EMI Due", type: "date" },
    { key: "owner", label: "Owner", type: "select", options: ownerOpts, default: "Self" },
    { key: "ownership_percent", label: "Ownership %", type: "number", default: 100 },
    { key: "maturity_date", label: "Maturity Date", type: "date" },
    { key: "tenure_months", label: "Tenure (months)", type: "number" },
    { key: "status", label: "Status", type: "select", options: ["Open", "Closed"], default: "Open" },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];

  return (
    <>
      <PageHeader title="Loans" subtitle="Home, vehicle and personal loans with repayment progress." icon={Landmark}
        actions={<Button variant="secondary" size="sm" onClick={() => downloadEntity("loans", {}, "loans")}><Download size={15} /> Export Excel</Button>} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {s && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <KpiCard label="Total Outstanding" raw={s.total_outstanding} tone="expense" testid="loan-outstanding" />
            <KpiCard label="Total Sanctioned" raw={s.total_sanctioned} tone="ink" testid="loan-sanctioned" />
            <KpiCard label="Principal Repaid" raw={s.total_paid} tone="income" testid="loan-paid" />
            <KpiCard label="Monthly EMI" raw={s.monthly_emi} tone="amber" testid="loan-emi" />
          </div>
        )}
      </StateBlock>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mb-6">
        {(list.data || []).map((l) => (
          <Card key={l.id} className="p-5 relative overflow-hidden" data-testid={`loan-card-${l.id}`}>
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-brand/5" />
            <div className="relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display font-bold text-ink text-lg">{l.name}</h3>
                  <p className="text-xs text-faint">{l.lender} · {l.branch}</p>
                </div>
                <Badge tone="blue">{l.type}</Badge>
              </div>
              {l.property && <p className="text-sm text-subink mb-3">{l.property}</p>}
              <div className="flex items-end justify-between mb-1">
                <span className="text-sm text-subink">Outstanding</span>
                <span className="num font-bold text-xl text-expense">{inr(l.outstanding)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${l.progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-faint mb-4">
                <span>{l.progress}% repaid · {inr(l.principal_paid, { compact: true })} of {inr(l.sanctioned || l.disbursed, { compact: true })}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/60"><div className="overline text-faint">EMI</div><div className="num font-semibold text-sm text-ink">{inr(l.emi, { compact: true })}</div></div>
                <div className="p-2 rounded-lg bg-muted/60"><div className="overline text-faint">Rate</div><div className="num font-semibold text-sm text-ink">{l.interest_rate}%</div></div>
                <div className="p-2 rounded-lg bg-muted/60"><div className="overline text-faint">Next Due</div><div className="num font-semibold text-xs text-ink">{fmtDate(l.next_due_date)}</div></div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CrudManager title="Loan Accounts" endpoint="/loans" addLabel="Add loan" fields={fields}
        columns={[
          { key: "name", label: "Loan", render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-xs text-faint">{r.lender}</div></div> },
          { key: "outstanding", label: "Outstanding", align: "right", render: (r) => <span className="num font-semibold text-expense">{inr(r.outstanding)}</span> },
          { key: "emi", label: "EMI", align: "right", type: "money" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "Open" ? "ACTIVE" : "COMPLETED"} /> },
        ]}
        onChanged={() => { refetch(); list.refetch(); }} />
    </>
  );
}
