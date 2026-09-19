import React from "react";
import { TrendingUp, CreditCard } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Segmented } from "./ui";
import KpiCard from "./KpiCard";
import { ChartCard, Bars, TrendLine } from "./charts";
import CrudManager from "./CrudManager";
import { inr, todayISO } from "../lib/format";

export default function TxnPage({ type }) {
  const isIncome = type === "INCOME";
  const groupField = isIncome ? "source" : "category";
  const color = isIncome ? "#10B981" : "#F43F5E";
  const { data: summary, loading, error, refetch } = useFetch(isIncome ? "/income/summary" : "/expenses/summary");
  const { data: accounts } = useFetch("/accounts");
  const { data: settings } = useFetch("/settings");
  const { data: projects } = useFetch("/projects");

  const ready = accounts && settings && projects;
  const acctMap = Object.fromEntries((accounts || []).map((a) => [a.id, a.name]));
  const projMap = Object.fromEntries((projects || []).map((p) => [p.id, p.name]));
  const cats = isIncome ? settings?.income_categories : settings?.expense_categories;

  const fields = [
    { key: "date", label: "Date", type: "date", required: true, default: todayISO() },
    { key: "amount", label: "Amount (₹)", type: "money", required: true },
    { key: groupField, label: isIncome ? "Source" : "Category", type: "select", required: true, options: cats || [] },
    { key: "account_id", label: "Account", type: "select", options: (accounts || []).map((a) => ({ value: a.id, label: a.name })) },
    { key: "payment_mode", label: "Payment Mode", type: "select", options: settings?.payment_methods || [] },
    { key: "project_id", label: "Link to Project (optional)", type: "select", options: (projects || []).map((p) => ({ value: p.id, label: p.name })) },
    { key: "description", label: "Description", type: "text", full: true },
  ];

  const columns = [
    { key: "date", label: "Date", type: "date" },
    { key: groupField, label: isIncome ? "Source" : "Category", render: (r) => <span className="font-medium text-ink">{r[groupField] || "—"}</span> },
    { key: "account_id", label: "Account", render: (r) => acctMap[r.account_id] || "—" },
    { key: "project_id", label: "Project", render: (r) => r.project_id ? <span className="text-brand text-xs font-medium">{projMap[r.project_id] || "Project"}</span> : <span className="text-faint text-xs">Personal</span> },
    { key: "description", label: "Note", render: (r) => <span className="text-subink">{r.description || "—"}</span> },
    { key: "amount", label: "Amount", align: "right", render: (r) => <span className="num font-semibold" style={{ color }}>{inr(r.amount)}</span> },
  ];

  return (
    <>
      <PageHeader title={isIncome ? "Income" : "Expenses"} subtitle={isIncome ? "All money coming in, by source." : "All money going out, by category."} icon={isIncome ? TrendingUp : CreditCard} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {summary && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Total" raw={summary.total} tone={isIncome ? "income" : "expense"} testid="txn-total" />
              <KpiCard label="This Month" raw={summary.this_month} tone="ink" testid="txn-month" />
              <KpiCard label="This Year" raw={summary.this_year} tone="ink" testid="txn-year" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <ChartCard title={isIncome ? "By Source" : "By Category"} height={240}>
                <Bars data={summary.by_group.slice(0, 8)} series={[{ key: "value", name: isIncome ? "Income" : "Expense", color }]} />
              </ChartCard>
              <ChartCard title="Monthly Trend" height={240}>
                <TrendLine data={summary.by_month} color={color} name={isIncome ? "Income" : "Expense"} />
              </ChartCard>
            </div>
          </>
        )}
      </StateBlock>
      {ready && (
        <CrudManager
          title={isIncome ? "Income Records" : "Expense Records"}
          endpoint="/transactions"
          listEndpoint={`/transactions?type=${type}`}
          addLabel={isIncome ? "Add income" : "Add expense"}
          fields={fields}
          columns={columns}
          onChanged={refetch}
          transform={(p) => ({ ...p, type, scope: p.project_id ? "PROJECT" : "PERSONAL" })}
        />
      )}
    </>
  );
}
