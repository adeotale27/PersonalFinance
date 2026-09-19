import React, { useRef, useState } from "react";
import { Upload, FileText, Download, Trash2, File } from "lucide-react";
import { Card, Button, StateBlock, Select, Field, Input, Modal, Badge } from "./ui";
import { useFetch } from "../lib/useFetch";
import api, { apiError, API, authToken } from "../lib/api";
import { fmtDate } from "../lib/format";

const CATS = ["Project", "Bank", "Payment", "Contract", "Invoice", "Receipt", "Drawing", "Certificate", "Other"];

export default function DocumentsPanel({ projectId, title = "Documents", compact = false }) {
  const url = projectId ? `/documents?related_entity_id=${projectId}` : "/documents";
  const { data, loading, error, refetch } = useFetch(url, [projectId]);
  const fileRef = useRef();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Other");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const docs = data || [];

  const upload = async () => {
    if (!file) { setErr("Choose a file first"); return; }
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("notes", notes);
      if (projectId) { fd.append("related_entity_id", projectId); fd.append("related_entity_type", "project"); fd.append("project_id", projectId); }
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setOpen(false); setFile(null); setNotes(""); refetch();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  const download = (d) => {
    const link = `${API}/documents/${d.id}/download?auth=${encodeURIComponent(authToken())}`;
    window.open(link, "_blank");
  };
  const del = async (d) => { if (window.confirm(`Delete ${d.filename}?`)) { await api.delete(`/documents/${d.id}`); refetch(); } };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        <Button size="sm" onClick={() => { setErr(""); setFile(null); setOpen(true); }} data-testid="upload-doc"><Upload size={15} /> Upload</Button>
      </div>
      <StateBlock loading={loading} error={error} empty={docs.length === 0} emptyText="No documents uploaded yet." onRetry={refetch}>
        <div className="divide-y divide-line">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
              <span className="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0"><FileText size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink truncate">{d.filename}</div>
                <div className="text-xs text-faint">{fmtDate(d.created_at)} · {(d.size / 1024).toFixed(0)} KB</div>
              </div>
              <Badge tone="gray">{d.category}</Badge>
              <button onClick={() => download(d)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-brand" data-testid={`download-${d.id}`}><Download size={16} /></button>
              <button onClick={() => del(d)} className="p-1.5 rounded-lg text-subink hover:bg-white hover:text-expense"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </StateBlock>

      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <div className="space-y-3">
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-line rounded-xl p-6 text-center cursor-pointer hover:border-brand/50 hover:bg-muted/40 transition-colors">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} data-testid="file-input" />
            <File className="w-8 h-8 text-faint mx-auto mb-2" />
            <div className="text-sm text-ink font-medium">{file ? file.name : "Click to choose a file"}</div>
            <div className="text-xs text-faint mt-1">PDF, images, spreadsheets · max 25MB</div>
          </div>
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          {err && <div className="text-sm text-expense bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="flex gap-2 pt-1"><Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button className="flex-1" onClick={upload} disabled={busy} data-testid="upload-submit">{busy ? "Uploading…" : "Upload"}</Button></div>
        </div>
      </Modal>
    </Card>
  );
}
