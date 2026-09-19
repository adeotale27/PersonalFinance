import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { PageHeader, StateBlock, Card, Button, Field, Input } from "../components/ui";
import api, { apiError } from "../lib/api";

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

  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    try { await api.put("/settings", form); setMsg("Settings saved."); refetch(); setTimeout(() => setMsg(""), 2500); }
    catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
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
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Currency"><Input value={form.currency || ""} onChange={(e) => set("currency", e.target.value)} /></Field>
                <Field label="Timezone"><Input value={form.timezone || ""} onChange={(e) => set("timezone", e.target.value)} /></Field>
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
            {msg && <div className="text-sm text-income bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{msg}</div>}
            {err && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          </div>
        )}
      </StateBlock>
    </>
  );
}
