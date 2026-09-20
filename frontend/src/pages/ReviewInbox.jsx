import React, { useState } from "react";
import { Inbox, Search, CheckCircle2 } from "lucide-react";
import { PageHeader, Card, Button, Input, Segmented, StateBlock, Badge } from "../components/ui";
import { useFetch } from "../lib/useFetch";
import api from "../lib/api";
import { fmtDate, inr } from "../lib/format";

export default function ReviewInbox() {
  const [query, setQuery] = useState(""); const [state, setState] = useState("NEEDS_REVIEW");
  const endpoint = `/planning/inbox?state=${state}&q=${encodeURIComponent(query)}`;
  const { data, loading, error, refetch } = useFetch(endpoint, [endpoint]);
  const review = async (row, next) => { await api.post(`/planning/inbox/${row.source}/${encodeURIComponent(row.source_id)}/review`, { state: next }); refetch(); };
  return <><PageHeader title="Review Inbox" subtitle="One searchable queue for transactions, dues and records that still need your confirmation." icon={Inbox}/><Card className="p-4 mb-5"><div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-faint"/><Input className="pl-9" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search income, rent, EMI, person or date…"/></div><Segmented value={state} onChange={setState} options={[{value:"NEEDS_REVIEW",label:"Needs review"},{value:"REVIEWED",label:"Reviewed"},{value:"ALL",label:"All"}]}/></div></Card><Card className="overflow-hidden"><StateBlock loading={loading} error={error} onRetry={refetch} empty={!data?.length} emptyText="Nothing is waiting for review."><div className="divide-y divide-line">{(data||[]).map(row=><div key={row.id} className="px-5 py-4 flex gap-4 items-center"><div className="min-w-0 flex-1"><div className="flex gap-2 items-center"><p className="font-medium text-sm text-ink truncate">{row.title}</p><Badge tone={row.state === "REVIEWED" ? "green" : "amber"}>{row.state === "REVIEWED" ? "reviewed" : "needs review"}</Badge></div><p className="text-xs text-subink mt-1 truncate">{row.detail || row.kind} · {fmtDate(row.date)}</p></div><div className="text-right"><p className="num text-sm font-semibold">{row.amount ? inr(row.amount) : "—"}</p>{row.state !== "REVIEWED" && <Button size="sm" variant="secondary" className="mt-2" onClick={()=>review(row,"REVIEWED")}><CheckCircle2 size={14}/> Mark reviewed</Button>}</div></div>)}</div></StateBlock></Card></>;
}
