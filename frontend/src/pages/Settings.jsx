import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Download, Trash2 } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Button, Field, Input, Select } from "../components/ui";
import api, { apiError } from "../lib/api";
import { downloadEntity } from "../lib/export";

const EXPORT_OPTIONS = [
  { value: "accounts", label: "Accounts" },
  { value: "income", label: "Income", params: { type: "INCOME" }, entity: "transactions" },
  { value: "expenses", label: "Expenses", params: { type: "EXPENSE" }, entity: "transactions" },
  { value: "transfers", label: "Transfers", params: { type: "TRANSFER" }, entity: "transactions" },
  { value: "loans", label: "Loans" },
  { value: "projects", label: "Projects" },
  { value: "farms", label: "Farms" },
  { value: "insurance", label: "Insurance" },
  { value: "pf_ppf", label: "PF & PPF" },
  { value: "savings", label: "Savings" },
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "lendings", label: "Lendings" },
  { value: "investments", label: "Investments" },
  { value: "family", label: "Family" },
  { value: "parties", label: "Parties" },
  { value: "work_logs", label: "Work Logs" },
  { value: "rental_properties", label: "Rental Properties" },
  { value: "rent_payments", label: "Rental Payments" },
  { value: "farm_rent_payments", label: "Farm Rent Payments" },
  { value: "losses", label: "Private Losses" },
];

const FLUSH_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expenses", label: "Expenses" },
  { value: "transfers", label: "Transfers" },
  { value: "accounts", label: "Accounts" },
  { value: "loans", label: "Loans" },
  { value: "projects", label: "Projects" },
  { value: "farms", label: "Farms" },
  { value: "insurance", label: "Insurance" },
  { value: "pf_ppf", label: "PF & PPF" },
  { value: "savings", label: "Savings" },
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "lendings", label: "Lendings" },
  { value: "investments", label: "Investments" },
  { value: "family", label: "Family" },
  { value: "parties", label: "Parties" },
  { value: "work_logs", label: "Work Logs" },
];

function ListEditor({ label, value, onChange }) {
  return (
    <Field label={label}>
      <textarea
        className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        value={(value || []).join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="Comma separated values"
      />
    </Field>
  );
}

export default function Settings() {
  const { data, loading, error, refetch } = useFetch("/settings");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [selectedExport, setSelectedExport] = useState(EXPORT_OPTIONS.map((o) => o.value));
  const [selectedFlush, setSelectedFlush] = useState([]);

  useEffect(() => { if (data) { setForm(data); localStorage.setItem("nivara_currency", data.currency || "INR"); localStorage.setItem("nivara_date_format", data.date_format || "DD-MM-YYYY"); localStorage.setItem("nivara_timezone", data.timezone || "Asia/Kolkata"); } }, [data]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    try { await api.put("/settings", form); localStorage.setItem("nivara_currency", form.currency || "INR"); localStorage.setItem("nivara_date_format", form.date_format || "DD-MM-YYYY"); localStorage.setItem("nivara_timezone", form.timezone || "Asia/Kolkata"); setMsg("Settings saved. New format applies throughout the app."); refetch(); setTimeout(() => setMsg(""), 2500); }
    catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  const toggleValue = (list, setList, value) => {
    setList((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const handleExportSelected = async () => {
    if (!selectedExport.length) {
      setErr("Select at least one stream or category to export.");
      return;
    }

    setErr(""); setMsg("");
    for (const item of EXPORT_OPTIONS) {
      if (!selectedExport.includes(item.value)) continue;
      const entity = item.entity || item.value;
      const params = item.params || {};
      try {
        await downloadEntity(entity, params, item.value);
      } catch (e) {
        setErr(apiError(e));
        return;
      }
    }
    setMsg(`Export started for ${selectedExport.length} selection${selectedExport.length > 1 ? "s" : ""}.`);
  };

  const handleFlushSelected = async () => {
    if (!selectedFlush.length) {
      setErr("Select at least one stream or category to flush.");
      return;
    }
    if (!window.confirm(`This will mark the selected data as deleted immediately. Continue?`)) return;

    setErr(""); setMsg("");
    try {
      await api.post("/settings/flush", { selection: selectedFlush });
      setMsg("Selected data has been flushed.");
      setSelectedFlush([]);
    } catch (e) {
      setErr(apiError(e));
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Currency, timezone and configurable categories." icon={SettingsIcon}
        actions={<Button onClick={save} disabled={busy || !form} data-testid="save-settings"><Save size={15} /> {busy ? "Saving…" : "Save"}</Button>} />
      <StateBlock loading={loading} error={error} onRetry={refetch}>
        {form && (
          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="font-display font-semibold text-ink mb-4">General</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Currency"><Select value={form.currency || "INR"} onChange={(e) => set("currency", e.target.value)}>{[["INR","Indian Rupee (₹)"],["USD","US Dollar ($)"],["EUR","Euro (€)"],["GBP","British Pound (£)"],["AED","UAE Dirham"],["AUD","Australian Dollar"],["CAD","Canadian Dollar"],["SGD","Singapore Dollar"],["JPY","Japanese Yen"]].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</Select></Field>
                <Field label="Timezone"><Select value={form.timezone || "Asia/Kolkata"} onChange={(e) => set("timezone", e.target.value)}>{["Asia/Kolkata","Asia/Dubai","Asia/Singapore","Europe/London","Europe/Paris","America/New_York","America/Los_Angeles","Australia/Sydney","UTC"].map((value) => <option value={value} key={value}>{value.replace("_", " ")}</option>)}</Select></Field>
                <Field label="Date format"><Select value={form.date_format || "DD-MM-YYYY"} onChange={(e) => set("date_format", e.target.value)}><option value="DD-MM-YYYY">DD-MM-YYYY</option><option value="MM-DD-YYYY">MM-DD-YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></Select></Field>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-display font-semibold text-ink mb-4">Categories</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <ListEditor label="Income Categories" value={form.income_categories} onChange={(v) => set("income_categories", v)} />
                <ListEditor label="Expense Categories" value={form.expense_categories} onChange={(v) => set("expense_categories", v)} />
                <ListEditor label="Project Cost Categories" value={form.project_categories} onChange={(v) => set("project_categories", v)} />
                <ListEditor label="Payment Methods" value={form.payment_methods} onChange={(v) => set("payment_methods", v)} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="font-display font-semibold text-ink">Data export & cleanup</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedExport(EXPORT_OPTIONS.map((o) => o.value))}>Select all export</Button>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedFlush(FLUSH_OPTIONS.map((o) => o.value))}>Select all flush</Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-ink mb-3">Export selected data</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {EXPORT_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 rounded-lg border border-line bg-muted/40 px-3 py-2 text-sm text-subink">
                        <input type="checkbox" checked={selectedExport.includes(option.value)} onChange={() => toggleValue(selectedExport, setSelectedExport, option.value)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="secondary" onClick={handleExportSelected}><Download size={15} /> Export selected</Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-ink mb-3">Flush selected data</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {FLUSH_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 rounded-lg border border-line bg-muted/40 px-3 py-2 text-sm text-subink">
                        <input type="checkbox" checked={selectedFlush.includes(option.value)} onChange={() => toggleValue(selectedFlush, setSelectedFlush, option.value)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="danger" onClick={handleFlushSelected}><Trash2 size={15} /> Flush selected</Button>
                  </div>
                </div>
              </div>
            </Card>

            {msg && <div className="text-sm text-income bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</div>}
            {err && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          </div>
        )}
      </StateBlock>
    </>
  );
}
