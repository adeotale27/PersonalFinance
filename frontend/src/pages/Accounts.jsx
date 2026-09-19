import React from "react";
import { Wallet } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Badge } from "../components/ui";
import KpiCard from "../components/KpiCard";
import CrudManager from "../components/CrudManager";
import { inr } from "../lib/format";

const TYPES = ["BANK", "CASH", "WALLET", "OTHER"];

export default function Accounts() {
  const { data, loading, error, refetch } = useFetch("/accounts");
  const accts = data || [];
  const total = accts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const bank = accts.filter((a) => a.type !== "CASH").reduce((s, a) => s + (a.current_balance || 0), 0);
  const cash = accts.filter((a) => a.type === "CASH").reduce((s, a) => s + (a.current_balance || 0), 0);

  const fields = [
    { key: "name", label: "Account Name", required: true, full: true },
    { key: "type", label: "Type", type: "select", options: TYPES, default: "BANK", required: true },
    { key: "bank_name", label: "Bank / Institution" },
    { key: "masked_number", label: "Account No. (last 4)" },
    { key: "opening_balance", label: "Opening Balance (₹)", type: "money", default: 0 },
    { key: "owner", label: "Owner", default: "Self" },
    { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  ];
  const columns = [
    { key: "name", label: "Account", render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-xs text-faint">{r.bank_name} {r.masked_number}</div></div> },
    { key: "type", label: "Type", render: (r) => <Badge tone={r.type === "CASH" ? "amber" : "blue"}>{r.type}</Badge> },
    { key: "owner", label: "Owner" },
    { key: "current_balance", label: "Balance", align: "right", render: (r) => <span className="num font-semibold text-ink">{inr(r.current_balance)}</span> },
  ];

  return (
    <>
      <PageHeader title="Accounts & Cash" subtitle="Bank accounts and cash in hand with live balances." icon={Wallet} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <KpiCard label="Total Balance" raw={total} tone="brand" testid="acc-total" />
          <KpiCard label="Bank Balance" raw={bank} tone="ink" testid="acc-bank" />
          <KpiCard label="Cash in Hand" raw={cash} tone="amber" testid="acc-cash" />
        </div>
      </StateBlock>
      <CrudManager title="Accounts" endpoint="/accounts" addLabel="Add account" fields={fields} columns={columns} onChanged={refetch} deps={[]} />
    </>
  );
}
