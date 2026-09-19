import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Handshake, Plus, Wallet2, Pencil, Trash2 } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Segmented, Card, Button, Modal, Field, Input, Textarea, StatusBadge } from "../components/ui";
import KpiCard from "../components/KpiCard";
import { ChartCard, Bars, TrendLine } from "../components/charts";
import api, { apiError } from "../lib/api";
import { inr, fmtDate, todayISO } from "../lib/format";

export default function Lending() {
  const [params, setParams] = useSearchParams();
  const dir = params.get("tab") === "BORROWED" ? "BORROWED" : "LENT";
  const setDir = (d) => setParams(d === "BORROWED" ? { tab: "BORROWED" } : {});
  const lent = dir === "LENT";

  const summary = useFetch(`/lending/summary?direction=${dir}`, [dir]);
  const list = useFetch(`/lending?direction=${dir}`, [dir]);

  const [modal, setModal] = useState(null); // {mode:'add'|'edit'|'pay', row}
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = () => { summary.refetch(); list.refetch(); };
  const openAdd = () => { setForm({ date: todayISO() }); setErr(""); setModal({ mode: "add" }); };
  const openEdit = (row) => { setForm({ ...row }); setErr(""); setModal({ mode: "edit", row }); };
  const openPay = (row) => { setForm({ date: todayISO() }); setErr(""); setModal({ mode: "pay", row }); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setErr(""); setBusy(true);
    try {
      if (modal.mode === "pay") {
        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) throw new Error("Enter a valid amount");
        await api.post(`/lending/${modal.row.id}/repayment`, { amount, date: form.date, note: form.note || "" });
      } else {
        const body = { ...form, direction: dir, amount: parseFloat(form.amount) || 0, interest_rate: parseFloat(form.interest_rate) || 0 };
        if (!body.counterparty) throw new Error("Name is required");
        if (modal.mode === "edit") await api.put(`/lending/${modal.row.id}`, body);
        else await api.post("/lending", body);
      }
      setModal(null); refresh();
    } catch (e) { setErr(e.response ? apiError(e) : e.message); } finally { setBusy(false); }
  };

  const del = async (row) => { if (window.confirm(`Delete record for ${row.counterparty}?`)) { await api.delete(`/lending/${row.id}`); refresh(); } };

  const s = summary.data;
  const rows = list.data || [];

  return (
    <>
      <PageHeader title="Lending & Borrowing" subtitle={lent ? "Money you lent and its recovery." : "Money you borrowed and repayments."} icon={Handshake}
        actions={<>
          <Segmented testid="lend-switch" value={dir} onChange={setDir} options={[{ value: "LENT", label: "Lent Out" }, { value: "BORROWED", label: "Borrowed" }]} />
          <Button size="sm" onClick={openAdd} data-testid="add-lending"><Plus size={15} /> {lent ? "Lend" : "Borrow"}</Button>
        </>} />

      <StateBlock loading={summary.loading} error={summary.error} onRetry={refresh}>
        {s && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <KpiCard label={lent ? "Total Lent" : "Total Borrowed"} raw={s.total} tone="info" testid="lend-total" />
              <KpiCard label={lent ? "Recovered" : "Repaid"} raw={s.recovered} tone="income" testid="lend-recovered" />
              <KpiCard label="Outstanding" raw={s.outstanding} tone="ink" testid="lend-outstanding" />
              <KpiCard label="Overdue" raw={s.overdue} tone="expense" testid="lend-overdue" />
              <KpiCard label="Due This Month" raw={s.due_this_month} tone="amber" testid="lend-due-month" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <ChartCard title={lent ? "Outstanding by Person" : "Outstanding by Lender"} height={240}>
                {s.by_person?.length ? <Bars data={s.by_person} series={[{ key: "value", name: "Outstanding", color: "#0D9488" }]} /> : <NoData />}
              </ChartCard>
              <ChartCard title={lent ? "Recovery Trend" : "Repayment Trend"} height={240}>
                {s.recovery_trend?.length ? <TrendLine data={s.recovery_trend} color="#10B981" name={lent ? "Recovered" : "Repaid"} /> : <NoData />}
              </ChartCard>
            </div>
          </>
        )}
      </StateBlock>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line"><h3 className="font-display font-semibold text-ink">{lent ? "Borrowers" : "Lenders"}</h3></div>
        <StateBlock loading={list.loading} error={list.error} empty={rows.length === 0} emptyText="No records yet." onRetry={refresh}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-faint overline border-b border-line">
                <tr>
                  <th className="px-4 py-2.5">{lent ? "Borrower" : "Lender"}</th>
                  <th className="px-4 py-2.5">Purpose</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">{lent ? "Recovered" : "Repaid"}</th>
                  <th className="px-4 py-2.5 text-right">Outstanding</th>
                  <th className="px-4 py-2.5">Due</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/70 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-ink">{r.counterparty}</td>
                    <td className="px-4 py-3 text-subink">{r.purpose || "—"}</td>
                    <td className="px-4 py-3 text-right num">{inr(r.amount)}</td>
                    <td className="px-4 py-3 text-right num text-income">{inr(r.paid)}</td>
                    <td className="px-4 py-3 text-right num font-semibold">{inr(r.outstanding)}</td>
                    <td className="px-4 py-3 text-subink whitespace-nowrap">{fmtDate(r.due_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" className="mr-1" onClick={() => openPay(r)} data-testid={`pay-${r.id}`}><Wallet2 size={13} /> Record</Button>
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-brand"><Pencil size={15} /></button>
                      <button onClick={() => del(r)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-expense"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StateBlock>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "pay" ? `Record ${lent ? "recovery" : "repayment"} — ${modal?.row?.counterparty}` : modal?.mode === "edit" ? "Edit record" : lent ? "New lending" : "New borrowing"}>
        {modal?.mode === "pay" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹) *"><Input type="number" autoFocus value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} data-testid="pay-amount" /></Field>
              <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
            </div>
            <Field label="Note"><Input value={form.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={lent ? "Borrower name *" : "Lender name *"}><Input autoFocus value={form.counterparty || ""} onChange={(e) => set("counterparty", e.target.value)} data-testid="lend-name" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹) *"><Input type="number" value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} data-testid="lend-amount" /></Field>
              <Field label="Date"><Input type="date" value={form.date || todayISO()} onChange={(e) => set("date", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date"><Input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} /></Field>
              <Field label="Interest %"><Input type="number" value={form.interest_rate || ""} onChange={(e) => set("interest_rate", e.target.value)} /></Field>
            </div>
            <Field label="Purpose"><Input value={form.purpose || ""} onChange={(e) => set("purpose", e.target.value)} /></Field>
            <Field label="Notes"><Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
          </div>
        )}
        {err && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">{err}</div>}
        <div className="flex gap-2 pt-4">
          <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={busy} data-testid="lend-save">{busy ? "Saving…" : "Save"}</Button>
        </div>
      </Modal>
    </>
  );
}

function NoData() { return <div className="h-full flex items-center justify-center text-sm text-faint">No data yet</div>; }
