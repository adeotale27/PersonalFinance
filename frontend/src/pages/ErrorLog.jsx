import React, { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Trash2 } from "lucide-react";
import { Button, Card, PageHeader, Segmented, StateBlock } from "../components/ui";
import { useFetch } from "../lib/useFetch";
import api, { apiError } from "../lib/api";
import { fmtDateTime } from "../lib/format";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "API", label: "API" },
  { value: "UI", label: "UI" },
];

export default function ErrorLog() {
  const [scope, setScope] = useState("ALL");
  const [before, setBefore] = useState("");
  const [flushing, setFlushing] = useState(false);
  const [notice, setNotice] = useState("");
  const { data, loading, error, refetch } = useFetch(`/error-logs?scope=${scope}`, [scope]);
  const rows = data || [];
  const totalOccurrences = useMemo(() => rows.reduce((sum, item) => sum + Math.max(Number(item.occurrences) || 1, 1), 0), [rows]);

  useEffect(() => { api.post("/error-logs/mark-seen").catch(() => {}); }, []);

  const flush = async (rangeOnly = false) => {
    if (rangeOnly && !before) { setNotice("Choose a date before clearing a range."); return; }
    const description = rangeOnly ? `all ${scope === "ALL" ? "" : `${scope} `}errors through ${before}` : `all ${scope === "ALL" ? "" : `${scope} `}errors`;
    if (!window.confirm(`Clear ${description}? This cannot be undone.`)) return;
    setFlushing(true); setNotice("");
    try {
      const params = new URLSearchParams({ scope });
      if (rangeOnly) params.set("before", before);
      const response = await api.delete(`/error-logs?${params}`);
      setNotice(`${response.data.deleted || 0} error ${response.data.deleted === 1 ? "record" : "records"} cleared.`);
      refetch();
    } catch (err) { setNotice(apiError(err)); } finally { setFlushing(false); }
  };

  return <>
    <PageHeader title="Error log" subtitle="API, UI and logger errors. Repeated matching errors are grouped, with their occurrence count shown at right." />
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-line space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm text-subink"><Filter size={15} /> <span><strong className="text-ink">{rows.length}</strong> records · <strong className="text-ink">{totalOccurrences}</strong> occurrences</span></div>
          <Button variant="secondary" size="sm" onClick={refetch}><RefreshCw size={14} /> Refresh</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <Segmented value={scope} onChange={setScope} options={FILTERS} testid="error-log-scope" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-subink" htmlFor="error-log-before">Clear through</label>
            <input id="error-log-before" type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="h-8 px-2 rounded-lg border border-line text-xs text-ink" />
            <Button variant="secondary" size="sm" disabled={flushing} onClick={() => flush(true)}><Trash2 size={14} /> Delete range</Button>
            <Button variant="danger" size="sm" disabled={flushing} onClick={() => flush(false)}><Trash2 size={14} /> Flush all</Button>
          </div>
        </div>
        {notice && <p className="text-sm text-subink" role="status">{notice}</p>}
      </div>
      <StateBlock loading={loading} error={error} empty={!loading && !error && rows.length === 0} emptyText="No errors recorded." onRetry={refetch}>
        <div className="overflow-auto max-h-[calc(100vh-19rem)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-slate-50 text-faint overline border-b border-line"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Message</th><th className="px-4 py-3 text-right">Count</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="border-b border-line/70 align-top hover:bg-teal-50/30"><td className="px-4 py-3 whitespace-nowrap text-xs text-subink">{fmtDateTime(item.last_seen_at || item.timestamp)}</td><td className="px-4 py-3"><span className="font-medium text-ink">{String(item.scope || "unknown").toLowerCase()}</span>{item.workspace_name && <span className="block mt-1 text-xs text-faint">{item.workspace_name}</span>}</td><td className="px-4 py-3 text-ink">{item.kind || "Error"}</td><td className="px-4 py-3 max-w-xl"><div className="whitespace-pre-wrap break-words text-ink">{item.message}</div>{item.route && <div className="mt-1 text-xs text-faint break-all">{item.route}</div>}</td><td className="px-4 py-3 text-right num font-semibold text-ink">{Math.max(Number(item.occurrences) || 1, 1)}</td></tr>)}</tbody>
          </table>
        </div>
      </StateBlock>
    </Card>
  </>;
}
