import React, { useEffect, useMemo, useState } from "react";
import { LockKeyhole, ShieldCheck, Plus, Trash2, TrendingDown } from "lucide-react";
import { PageHeader, StateBlock, Card, Button, Modal, Field, Input, Select, Textarea, Segmented } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Bars, TrendLine } from "../components/charts";
import api, { apiError } from "../lib/api";
import { inr, todayISO } from "../lib/format";

const TOKEN_KEY = "nivara_losses_token";

export default function Losses() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), group: "Stock Market", category: "FnO", kind: "REALIZED" });

  const headers = useMemo(() => ({ "X-Loss-Token": token }), [token]);
  const load = async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const suffix = year === "all" ? "" : `?year=${year}`;
      const [rows, totals] = await Promise.all([api.get(`/losses${suffix}`, { headers }), api.get(`/losses/summary${suffix}`, { headers })]);
      setData(rows.data); setSummary(totals.data);
    } catch (e) { setError(apiError(e)); if (e.response?.status === 423) { sessionStorage.removeItem(TOKEN_KEY); setToken(""); } }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token, year]);

  const unlock = async () => {
    setUnlocking(true); setUnlockError("");
    try {
      const res = await api.post("/losses/unlock", { password });
      sessionStorage.setItem(TOKEN_KEY, res.data.token); setToken(res.data.token); setPassword("");
    } catch (e) { setUnlockError(apiError(e)); } finally { setUnlocking(false); }
  };
  const categories = (form.group === "Stock Market" ? ["FnO", "Equity", "Mutual Fund"] : form.group === "Forex" ? ["Exness Loss"] : form.group === "Farm" ? ["Farm Loss"] : ["Crypto / Digital Assets", "Business", "Property", "Vehicle", "Medical", "Legal / Tax", "Fraud / Theft", "Defaulted Lending", "Unanticipated Loss", "Other Loss"]).concat("Add custom category…");
  const set = (key, value) => setForm((current) => key === "group" ? { ...current, group: value, category: value === "Stock Market" ? "FnO" : value === "Forex" ? "Exness Loss" : value === "Farm" ? "Farm Loss" : "Other Loss" } : { ...current, [key]: value });
  const save = async () => {
    const amount = form.kind === "LIVE_INVESTMENT" ? Number(form.invested_amount) - Number(form.current_value) : Number(form.amount);
    if (!amount || amount <= 0) { setError("Enter a valid loss amount."); return; }
    setSaving(true); setError("");
    try { await api.post("/losses", { ...form, category: form.category === "Add custom category…" ? form.custom_category : form.category, amount }, { headers }); setModal(false); setForm({ date: todayISO(), group: "Stock Market", category: "FnO", kind: "REALIZED" }); load(); }
    catch (e) { setError(apiError(e)); } finally { setSaving(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete this ${inr(row.amount)} loss entry?`)) return;
    try { await api.delete(`/losses/${row.id}`, { headers }); load(); } catch (e) { setError(apiError(e)); }
  };
  const lock = () => { sessionStorage.removeItem(TOKEN_KEY); setToken(""); setData(null); setSummary(null); };

  if (!token) return <>
    <PageHeader title="Losses" subtitle="A private ledger that is kept separate from net worth." icon={LockKeyhole} />
    <Modal open={true} onClose={() => window.history.back()} title="Unlock Losses">
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber mx-auto flex items-center justify-center mb-4"><LockKeyhole size={26} /></div>
      <h2 className="font-display font-bold text-xl text-ink">Losses folder is locked</h2><p className="text-sm text-subink mt-2 mb-5">Enter the admin password to view or change this private loss ledger. It will lock again when this browser session ends.</p>
      <Field label="Admin password"><Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} /></Field>
      {unlockError && <p className="text-sm text-expense mt-3">{unlockError}</p>}
      <Button className="w-full mt-4" disabled={unlocking} onClick={unlock}><ShieldCheck size={16} /> {unlocking ? "Unlocking…" : "Unlock Losses"}</Button>
    </div></Modal>
  </>;

  const years = ["all", ...Array.from(new Set((data || []).map((x) => (x.date || "").slice(0, 4)).filter(Boolean))).sort().reverse()];
  if (!years.includes(year)) years.push(year);
  return <>
    <PageHeader title="Losses" subtitle="Private tracking only — loss records never change overview or net worth." icon={TrendingDown}
      actions={<><Segmented value={year} onChange={setYear} options={years.map((v) => ({ value: v, label: v === "all" ? "All time" : v }))} /><Button variant="secondary" size="sm" onClick={lock}><LockKeyhole size={15} /> Lock</Button><Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> Add loss</Button></>} />
    <StateBlock loading={loading} error={error} onRetry={load}>
      {summary && <><div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6"><KpiCard label={year === "all" ? "Total Losses" : `${year} Losses`} raw={summary.total} tone="expense" testid="loss-total" /><KpiCard label="Recorded Items" value={String(summary.count)} tone="amber" testid="loss-count" /><KpiCard label="Largest Area" value={summary.by_group?.[0]?.name || "—"} tone="ink" testid="loss-largest" /></div>
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6"><ChartCard title="Losses by Area" height={250}>{summary.by_group?.length ? <Bars data={summary.by_group} series={[{ key: "value", name: "Loss", color: "#F43F5E" }]} /> : <Empty />}</ChartCard><ChartCard title={year === "all" ? "Yearly Loss Trend" : "Monthly Loss Trend"} height={250}>{summary.trend?.length ? <TrendLine data={summary.trend.map((x) => ({ month: x.period, value: x.value }))} color="#F43F5E" name="Loss" /> : <Empty />}</ChartCard></div>
        <Card className="overflow-hidden"><div className="px-5 py-4 border-b border-line"><h3 className="font-display font-semibold text-ink">Loss ledger</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/60 text-faint overline"><tr><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Area</th><th className="px-4 py-2.5">Category / item</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5 text-right">Loss</th><th /></tr></thead><tbody>{(data || []).map((row) => <tr key={row.id} className="border-t border-line/70"><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3 font-medium">{row.group}</td><td className="px-4 py-3"><div>{row.category}</div><div className="text-xs text-faint">{row.title || row.note || "—"}</div></td><td className="px-4 py-3 text-xs">{(row.kind || "REALIZED").replace(/_/g, " ")}</td><td className="px-4 py-3 text-right num font-semibold text-expense">{inr(row.amount)}</td><td className="px-4 py-3"><button onClick={() => remove(row)} className="text-faint hover:text-expense" aria-label="Delete loss"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></Card></>}
    </StateBlock>
    <Modal open={modal} onClose={() => setModal(false)} title="Add detailed loss"><div className="grid grid-cols-2 gap-3"><Field label="Date (YYYY-MM-DD)"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field><Field label="Loss type"><Select value={form.kind} onChange={(e) => set("kind", e.target.value)}><option value="REALIZED">Realized loss</option><option value="LIVE_INVESTMENT">Live investment in loss</option><option value="DEFAULTED_LENT">Money lent / vanished</option><option value="UNANTICIPATED">Unanticipated loss</option></Select></Field><Field label="Area"><Select value={form.group} onChange={(e) => set("group", e.target.value)}>{["Stock Market", "Forex", "Farm", "Other"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Category"><Select value={form.category} onChange={(e) => set("category", e.target.value)}>{categories.map((x) => <option key={x}>{x}</option>)}</Select></Field>{form.category === "Add custom category…" && <Field label="New category" className="col-span-2"><Input required value={form.custom_category || ""} onChange={(e) => set("custom_category", e.target.value)} placeholder="e.g. Travel cancellation" /></Field>}<Field label="What was lost?" className="col-span-2"><Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Bitcoin, person name, F&O trade, farm crop…" /></Field>{form.kind === "LIVE_INVESTMENT" ? <><Field label="Invested value (₹)"><Input type="number" autoFocus value={form.invested_amount || ""} onChange={(e) => set("invested_amount", e.target.value)} /></Field><Field label="Current value (₹)"><Input type="number" value={form.current_value || ""} onChange={(e) => set("current_value", e.target.value)} /></Field></> : <Field label="Loss amount (₹)" className="col-span-2"><Input type="number" autoFocus value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} /></Field>}</div><Field label="Details / sub-entry note" className="mt-3"><Textarea value={form.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="Reason, platform, person, quantity, reference…" /></Field>{error && <p className="text-sm text-expense mt-3">{error}</p>}<div className="flex gap-2 pt-4"><Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button><Button className="flex-1" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save loss"}</Button></div></Modal>
  </>;
}
function Empty() { return <div className="h-full flex items-center justify-center text-sm text-faint">No losses recorded</div>; }
