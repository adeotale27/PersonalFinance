import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Badge, Button } from "../components/ui";
import { fmtDate } from "../lib/format";
export default function ErrorLog() {
 const [scope,setScope]=useState("ALL"); const {data,loading,error,refetch}=useFetch(`/error-logs?scope=${scope}`); const logs = Array.isArray(data) ? data : [];
 React.useEffect(() => { import("../lib/api").then(({default: api}) => api.post("/error-logs/mark-seen").catch(() => {})); }, []);
 return <><PageHeader title="Error log" subtitle="Operational failures grouped by source, route and screen for faster resolution." icon={ShieldAlert}/><div className="flex gap-2 mb-5">{["ALL","UI","API"].map(x=><Button key={x} size="sm" variant={scope===x?"primary":"secondary"} onClick={()=>setScope(x)}>{x}</Button>)}</div><StateBlock loading={loading} error={error} empty={!logs.length} emptyText="No errors recorded." onRetry={refetch}>{<div className="space-y-2">{logs.map(x=><Card key={x.id} className="p-4"><div className="flex justify-between gap-3"><div><div className="flex gap-2 items-center"><Badge tone={x.scope==="API"?"red":"amber"}>{x.scope}</Badge><span className="font-semibold text-sm text-ink">{x.kind}</span></div><p className="text-sm text-subink mt-2 break-words">{x.message}</p><p className="text-xs text-faint mt-2">{x.route || x.meta?.screen || "Unattributed"} · {fmtDate(x.timestamp)}</p></div>{x.status_code && <span className="text-xs font-bold text-expense">HTTP {x.status_code}</span>}</div></Card>)}</div>}</StateBlock></>;
}
