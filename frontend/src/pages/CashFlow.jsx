import React, { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Segmented } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, CashFlowArea } from "../components/charts";
import { Bars } from "../components/charts";

export default function CashFlow() {
  const [period, setPeriod] = useState("monthly");
  const { data, loading, error, refetch } = useFetch(`/dashboard/cashflow?period=${period}`, [period]);

  return (
    <>
      <PageHeader
        title="Cash Flow"
        subtitle="Money in vs money out over time."
        icon={ArrowLeftRight}
        actions={
          <Segmented
            testid="period-switch"
            value={period}
            onChange={setPeriod}
            options={[{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }]}
          />
        }
      />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <KpiCard label="Total In" raw={data.total_in} tone="income" testid="cf-in" />
              <KpiCard label="Total Out" raw={data.total_out} tone="expense" testid="cf-out" />
              <KpiCard label="Net Cash Flow" raw={data.net} tone={data.net >= 0 ? "brand" : "expense"} testid="cf-net" />
            </div>
            <ChartCard title="Money In vs Out" subtitle={`Grouped by ${period.replace("ly", "")}`} height={320} className="mb-6">
              <CashFlowArea data={data.series} xKey="period" monthLabels={period === "monthly"} />
            </ChartCard>
            <ChartCard title="Net Cash Flow" height={280}>
              <Bars data={data.series} xKey="period" monthLabels={period === "monthly"}
                series={[{ key: "in", name: "In", color: "#10B981" }, { key: "out", name: "Out", color: "#F43F5E" }]} />
            </ChartCard>
          </>
        )}
      </StateBlock>
    </>
  );
}
