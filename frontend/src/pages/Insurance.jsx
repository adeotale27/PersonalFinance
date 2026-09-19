import React from "react";
import { Umbrella, CalendarClock, Car, Bike, HeartPulse, Shield } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Badge } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Donut } from "../components/charts";
import CrudManager from "../components/CrudManager";
import { inr, fmtDate } from "../lib/format";

const TYPE_ICON = { Car, Bike, Health: HeartPulse, Life: Shield, Home: Shield, Other: Shield };

export default function Insurance() {
  const { data: s, loading, error, refetch } = useFetch("/insurance/summary");
  const family = useFetch("/family");

  const insuredOpts = [{ value: "Self", label: "Self" }, { value: "Family", label: "Family" },
    ...((family.data || []).map((f) => ({ value: f.name, label: f.name })))];

  const fields = [
    { key: "type", label: "Type", type: "select", options: ["Car", "Bike", "Health", "Life", "Home", "Travel", "Other"], default: "Car", required: true },
    { key: "policy_name", label: "Policy Name", required: true, full: true },
    { key: "provider", label: "Provider / Insurer" },
    { key: "policy_number", label: "Policy Number" },
    { key: "insured", label: "Insured", type: "select", options: insuredOpts, default: "Self" },
    { key: "asset_ref", label: "Asset / Vehicle No." },
    { key: "premium", label: "Premium (₹)", type: "money", required: true },
    { key: "frequency", label: "Frequency", type: "select", options: ["Yearly", "Half-Yearly", "Quarterly", "Monthly"], default: "Yearly" },
    { key: "sum_insured", label: "Sum Insured (₹)", type: "money" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "renewal_date", label: "Renewal Date", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Lapsed"], default: "Active" },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  const columns = [
    { key: "policy_name", label: "Policy", render: (r) => { const Ic = TYPE_ICON[r.type] || Shield; return <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center"><Ic size={15} /></span><div><div className="font-medium text-ink">{r.policy_name}</div><div className="text-xs text-faint">{r.provider} · {r.insured}</div></div></div>; } },
    { key: "premium", label: "Premium", align: "right", type: "money" },
    { key: "sum_insured", label: "Cover", align: "right", render: (r) => <span className="num">{inr(r.sum_insured, { compact: true })}</span> },
    { key: "renewal_date", label: "Renewal", type: "date" },
    { key: "status", label: "Status", render: (r) => <Badge tone={r.status === "Active" ? "green" : "red"}>{r.status}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Insurance" subtitle="Vehicle, health and life cover with premium & renewal tracking." icon={Umbrella} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {s && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Annual Premium" raw={s.total_annual_premium} tone="expense" testid="ins-premium" />
              <KpiCard label="Total Cover" raw={s.total_cover} tone="income" testid="ins-cover" />
              <KpiCard label="Policies" value={String(s.count)} tone="ink" testid="ins-count" />
              <KpiCard label="Renewals ≤90d" value={String(s.upcoming_renewals.length)} tone="amber" icon={CalendarClock} testid="ins-renewals" />
            </div>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <Card className="p-5 lg:col-span-2" data-testid="renewals-card">
                <div className="flex items-center gap-2 mb-4"><span className="w-8 h-8 rounded-lg bg-amber-light text-amber flex items-center justify-center"><CalendarClock size={16} /></span><h3 className="font-display font-semibold text-ink">Upcoming Renewals</h3></div>
                {s.upcoming_renewals.length ? (
                  <div className="space-y-2">
                    {s.upcoming_renewals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/60">
                        <div><div className="text-sm font-medium text-ink">{r.policy_name}</div><div className="text-xs text-faint">{r.type} · due {fmtDate(r.renewal_date)}</div></div>
                        <div className="flex items-center gap-3">
                          <span className="num text-sm text-subink">{inr(r.premium, { compact: true })}</span>
                          <Badge tone={r.days <= 14 ? "red" : r.days <= 45 ? "amber" : "blue"}>{r.days < 0 ? "overdue" : `${r.days}d`}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-subink py-6 text-center">No renewals in the next 90 days.</p>}
              </Card>
              <ChartCard title="Premium by Type" height={210}>
                {s.by_type?.length ? <Donut data={s.by_type} centerLabel="Annual" centerValue={inr(s.total_annual_premium, { compact: true })} /> : <div className="h-full flex items-center justify-center text-sm text-faint">No data</div>}
              </ChartCard>
            </div>
          </>
        )}
      </StateBlock>
      <CrudManager title="Policies" endpoint="/insurance" addLabel="Add policy" fields={fields} columns={columns} onChanged={refetch} deps={[family.data?.length]} />
    </>
  );
}
