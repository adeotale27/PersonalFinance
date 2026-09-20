import React, { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, Button, Modal, Field, Input, Select, Textarea, StateBlock, cx } from "./ui";
import api, { apiError } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { inr } from "../lib/format";

function FieldInput({ f, value, onChange }) {
  const common = { value: value ?? "", onChange: (e) => onChange(f.key, e.target.value), "data-testid": `field-${f.key}` };
  if (f.type === "select")
    return <Select {...common}><option value="">Select…</option>{(f.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</Select>;
  if (f.type === "textarea") return <Textarea {...common} placeholder={f.placeholder} />;
  if (f.type === "number" || f.type === "money") return <Input type="number" step="any" {...common} placeholder={f.placeholder || "0"} />;
  if (f.type === "date") return <Input type="date" {...common} />;
  return <Input {...common} placeholder={f.placeholder} />;
}

export default function CrudManager({
  title, endpoint, listEndpoint, fields, columns, onChanged, addLabel = "Add", emptyText,
  canEdit = true, canDelete = true, deps = [], transform, rowClassName,
}) {
  const { data, loading, error, refetch } = useFetch(listEndpoint || endpoint, deps);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const rows = (data || []);
  const cols = columns || fields.filter((f) => !f.hideInTable).map((f) => ({ key: f.key, label: f.label, type: f.type }));

  const openAdd = () => { setEditing(null); setForm(fields.reduce((a, f) => (f.default != null ? { ...a, [f.key]: f.default } : a), {})); setFormErr(""); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row }); setFormErr(""); setOpen(true); };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setFormErr(""); setSaving(true);
    try {
      const payload = { ...form };
      fields.forEach((f) => { if ((f.type === "number" || f.type === "money") && payload[f.key] != null && payload[f.key] !== "") payload[f.key] = parseFloat(payload[f.key]); });
      for (const f of fields) if (f.required && (payload[f.key] == null || payload[f.key] === "")) throw new Error(`${f.label} is required`);
      const body = transform ? transform(payload) : payload;
      if (editing) await api.put(`${endpoint}/${editing.id}`, body);
      else await api.post(endpoint, body);
      setOpen(false); await refetch(); onChanged && onChanged();
    } catch (e) { setFormErr(e.response ? apiError(e) : e.message); } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row[cols[0].key] || "this record"}"? This cannot be undone.`)) return;
    await api.delete(`${endpoint}/${row.id}`); await refetch(); onChanged && onChanged();
  };

  const renderCell = (row, c) => {
    if (c.render) return c.render(row);
    const v = row[c.key];
    if (c.type === "money") return <span className="num font-semibold">{inr(v)}</span>;
    if (c.type === "date") return v ? new Date(v.length <= 10 ? v + "T00:00:00" : v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    return v ?? "—";
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        <Button size="sm" onClick={openAdd} data-testid={`add-${title.replace(/\s+/g, "-").toLowerCase()}`}><Plus size={15} /> {addLabel}</Button>
      </div>
      <StateBlock loading={loading} error={error} empty={rows.length === 0} emptyText={emptyText || "No records yet — add your first one."} onRetry={refetch}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-faint overline border-b border-line">
              <tr>{cols.map((c) => <th key={c.key} className={cx("px-4 py-2.5 whitespace-nowrap", c.align === "right" && "text-right")}>{c.label}</th>)}
                {(canEdit || canDelete) && <th className="px-4 py-2.5 text-right">Actions</th>}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={cx("border-b border-line/70 hover:bg-muted/40 transition-colors", rowClassName && rowClassName(row))}>
                  {cols.map((c) => <td key={c.key} className={cx("px-4 py-3 text-ink/90", c.align === "right" && "text-right num")}>{renderCell(row, c)}</td>)}
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canEdit && <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-brand" data-testid={`edit-${row.id}`}><Pencil size={15} /></button>}
                      {canDelete && <button onClick={() => remove(row)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-expense" data-testid={`delete-${row.id}`}><Trash2 size={15} /></button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title}` : `Add ${title}`} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <Field key={f.key} label={f.label + (f.type === "date" ? " (YYYY-MM-DD)" : "") + (f.required ? " *" : "")} className={f.full ? "sm:col-span-2" : ""}>
              <FieldInput f={f} value={form[f.key]} onChange={set} />
            </Field>
          ))}
        </div>
        {formErr && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">{formErr}</div>}
        <div className="flex gap-2 pt-4">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving} data-testid="crud-save">{saving ? "Saving…" : "Save"}</Button>
        </div>
      </Modal>
    </Card>
  );
}
