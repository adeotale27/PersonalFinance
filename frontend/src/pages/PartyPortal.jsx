import React, { useRef, useState } from "react";
import { FileUp, CheckCircle2 } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, Card, StateBlock, Button, Badge } from "../components/ui";
import api, { apiError, docUrl } from "../lib/api";
import { fmtDate, inr } from "../lib/format";

export default function PartyPortal() {
  const portal = useFetch("/party-portal");
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const data = portal.data;
  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setError("");
    try { const form = new FormData(); form.append("file", file); form.append("category", "Party submission"); await api.post("/documents", form, { headers: { "Content-Type": "multipart/form-data" } }); portal.refetch(); }
    catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };
  const acknowledge = async (id) => {
    try { await api.post(`/party-portal/payments/${id}/acknowledge`); portal.refetch(); }
    catch (e) { setError(apiError(e)); }
  };
  return <><PageHeader title={data?.party?.name || "Party Portal"} subtitle="Only your project records and shared documents are visible here." icon={CheckCircle2}/>
    <StateBlock loading={portal.loading} error={portal.error || error} onRetry={portal.refetch}>
      {data && <div className="space-y-6">
        <Card className="overflow-hidden"><div className="px-5 py-4 border-b border-line flex justify-between items-center"><h3 className="font-display font-semibold text-ink">Payments recorded for you</h3><Badge tone="brand">Private</Badge></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted text-faint overline"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Details</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Status</th><th className="p-3"/></tr></thead><tbody>{data.payments.map((p) => <tr key={p.id} className="border-t border-line"><td className="p-3">{fmtDate(p.date)}</td><td className="p-3">{p.description || p.category || "Payment"}<div className="text-xs text-faint">{p.payment_mode}{p.utr_number ? ` · UTR ${p.utr_number}` : ""}</div></td><td className="p-3 text-right num font-semibold">{inr(p.amount)}</td><td className="p-3"><Badge tone={p.payment_status === "PARTY_ACKNOWLEDGED" ? "green" : "amber"}>{(p.payment_status || "recorded").replaceAll("_", " ")}</Badge></td><td className="p-3">{["Cash", "UPI"].includes(p.payment_mode) && !p.party_acknowledged_at && <Button size="sm" onClick={() => acknowledge(p.id)}>Acknowledge</Button>}</td></tr>)}{!data.payments.length && <tr><td colSpan="5" className="text-center p-8 text-subink">No payments have been recorded for you yet.</td></tr>}</tbody></table></div></Card>
        <Card className="p-5"><div className="flex flex-wrap justify-between gap-3 items-center"><div><h3 className="font-display font-semibold text-ink">Shared documents & bills</h3><p className="text-xs text-subink mt-1">Upload bills for the owner to review. You can only see documents in your folder.</p></div><input ref={fileRef} className="hidden" type="file" onChange={(e) => upload(e.target.files?.[0])}/><Button onClick={() => fileRef.current?.click()} disabled={busy}><FileUp size={15}/>{busy ? "Uploading…" : "Submit bill or document"}</Button></div><div className="mt-4 space-y-2">{data.documents.map((d) => <a key={d.id} href={docUrl(d.id)} target="_blank" rel="noreferrer" className="block p-3 rounded-lg border border-line hover:bg-muted text-sm font-medium text-brand">{d.filename}<span className="text-xs text-faint ml-2">{fmtDate(d.created_at)}</span></a>)}{!data.documents.length && <p className="text-sm text-subink py-3">No documents shared yet.</p>}</div></Card>
      </div>}</StateBlock></>;
}
