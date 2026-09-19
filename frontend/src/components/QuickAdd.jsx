import React, { useEffect, useState } from "react";
import { TrendingUp, CreditCard, Handshake, Landmark } from "lucide-react";
import { Modal, Field, Input, Select, Textarea, Button, cx, DatalistInput } from "./ui";
import api, { apiError } from "../lib/api";
import { todayISO } from "../lib/format";

const TYPES = [
  { key: "EXPENSE", label: "Expense", icon: CreditCard, tone: "text-expense" },
  { key: "INCOME", label: "Income", icon: TrendingUp, tone: "text-income" },
  { key: "LENT", label: "Lend Money", icon: Handshake, tone: "text-info" },
  { key: "BORROWED", label: "Borrow", icon: Landmark, tone: "text-amber" },
];

export default function QuickAdd({ open, onClose, onDone }) {
  const [type, setType] = useState("EXPENSE");
  const [form, setForm] = useState({ date: todayISO() });
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ date: todayISO() }); setError(""); setType("EXPENSE");
    Promise.all([
      api.get("/accounts").then((r) => setAccounts(r.data)).catch(() => {}),
      api.get("/settings").then((r) => setSettings(r.data)).catch(() => {}),
      api.get("/projects").then((r) => setProjects(r.data)).catch(() => {}),
    ]);
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(""); setSaving(true);
    try {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (type === "INCOME" || type === "EXPENSE") {
        await api.post("/transactions", {
          type, amount, date: form.date,
          account_id: form.account_id || null,
          source: type === "INCOME" ? form.category : undefined,
          category: type === "EXPENSE" ? form.category : undefined,
          project_id: form.project_id || null,
          scope: form.project_id ? "PROJECT" : "PERSONAL",
          party: form.party || undefined,
          payment_mode: form.payment_mode || "UPI",
          description: form.description || "",
        });
      } else {
        await api.post("/lending", {
          direction: type, counterparty: form.counterparty, amount,
          date: form.date, due_date: form.due_date || null, purpose: form.purpose || "",
          interest_rate: parseFloat(form.interest_rate) || 0, repayments: [], notes: form.description || "",
        });
      }
      onDone();
    } catch (e) {
      setError(e.response ? apiError(e) : e.message);
    } finally {
      setSaving(false);
    }
  };

  const cats = type === "INCOME" ? settings?.income_categories : settings?.expense_categories;
  const isTxn = type === "INCOME" || type === "EXPENSE";

  return (
    <Modal open={open} onClose={onClose} title="Record a transaction">
      <div className="grid grid-cols-4 gap-2 mb-5">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} data-testid={`quick-type-${t.key}`}
            className={cx("flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all",
              type === t.key ? "border-brand bg-brand-light text-brand-dark" : "border-line text-subink hover:bg-muted")}>
            <t.icon size={18} className={type === t.key ? "text-brand" : t.tone} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><Input type="number" autoFocus value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="0" data-testid="quick-amount" /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} data-testid="quick-date" /></Field>
        </div>

        {isTxn && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select value={form.category || ""} onChange={(e) => set("category", e.target.value)} data-testid="quick-category">
                  <option value="">Select…</option>
                  {(cats || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Account">
                <Select value={form.account_id || ""} onChange={(e) => set("account_id", e.target.value)} data-testid="quick-account">
                  <option value="">Select…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Link to project (optional)">
              <Select value={form.project_id || ""} onChange={(e) => set("project_id", e.target.value)} data-testid="quick-project">
                <option value="">Personal</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </>
        )}

        {!isTxn && (
          <>
            <Field label={type === "LENT" ? "Borrower (who took the money)" : "Lender (who gave the money)"}>
              <Input value={form.counterparty || ""} onChange={(e) => set("counterparty", e.target.value)} placeholder="Name" data-testid="quick-counterparty" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date"><Input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} /></Field>
              <Field label="Interest %"><Input type="number" value={form.interest_rate || ""} onChange={(e) => set("interest_rate", e.target.value)} placeholder="0" /></Field>
            </div>
          </>
        )}

        <Field label="Note"><Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" /></Field>

        {error && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="quick-error">{error}</div>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving} data-testid="quick-submit">{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Modal>
  );
}
