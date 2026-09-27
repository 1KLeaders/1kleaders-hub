'use client';
// Admin: migrate KYC submissions (answers + uploaded files) from TypeForm into Documents → KYC.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, X, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { KYC_DOC_TYPE_OPTIONS } from '@/lib/kyc';

type Preview = {
  title: string; total: number; email_ref: string;
  email_fields: { ref: string; title: string }[];
  file_fields: { ref: string; title: string; suggested: string }[];
  other_fields: number; matched: string[]; unmatched: string[];
};

export default function TypeformImport({ onImported }: { onImported?: () => void }) {
  const [open,     setOpen]     = useState(false);
  const [forms,    setForms]    = useState<{ id: string; title: string }[] | null>(null);
  const [formId,   setFormId]   = useState('');
  const [preview,  setPreview]  = useState<Preview | null>(null);
  const [emailRef, setEmailRef] = useState('');
  const [mapping,  setMapping]  = useState<Record<string, string>>({});
  const [busy,     setBusy]     = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; files: number; skipped: number; unmatched: string[]; errors: string[] } | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  async function get(url: string) {
    const res = await apiFetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
  }

  async function start() {
    setOpen(true); setError(null);
    if (forms) return;
    setBusy('forms');
    try { setForms((await get('/api/admin/typeform-import?action=forms')).forms); }
    catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  async function loadPreview(id: string, ref?: string) {
    setFormId(id); setPreview(null); setProgress(null); setError(null);
    if (!id) return;
    setBusy('preview');
    try {
      const p: Preview = await get(`/api/admin/typeform-import?action=preview&form_id=${encodeURIComponent(id)}${ref ? `&email_ref=${encodeURIComponent(ref)}` : ''}`);
      setPreview(p);
      setEmailRef(p.email_ref);
      setMapping(Object.fromEntries(p.file_fields.map(f => [f.ref, f.suggested])));
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  async function runImport() {
    if (!preview) return;
    if (!window.confirm(`Import ${preview.matched.length} member${preview.matched.length === 1 ? '' : 's'}' KYC submissions from “${preview.title}”?\n\nResponses already imported are skipped.`)) return;
    setBusy('import'); setError(null);
    const acc = { done: 0, total: preview.total, files: 0, skipped: 0, unmatched: [] as string[], errors: [] as string[] };
    setProgress({ ...acc });
    let offset: number | null = 0;
    try {
      while (offset !== null) {
        const res = await apiFetch('/api/admin/typeform-import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_id: formId, email_ref: emailRef, mapping, offset }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? `Import failed (${res.status})`);
        acc.done += d.processed; acc.files += d.files; acc.skipped += d.skipped;
        acc.unmatched.push(...d.unmatched); acc.errors.push(...d.errors);
        setProgress({ ...acc });
        offset = d.next_offset;
      }
      onImported?.();
    } catch (e: any) { setError(e.message); }
    setBusy(null);
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={start}><Download className="w-4 h-4 mr-2" />Import from TypeForm</Button>
    );
  }

  return (
    <div className="w-full border border-[#e33b5f]/20 bg-[#e33b5f]/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#222] flex items-center gap-2"><Download className="w-4 h-4 text-[#e33b5f]" />Import KYC from TypeForm</p>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
      </div>

      {error && <p className="text-sm text-red-600 flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

      {busy === 'forms' ? <p className="text-sm text-[#9e9e9e] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading TypeForm forms…</p> : forms && (
        <select className="w-full border border-[#f0f0f0] rounded-lg px-3 py-2 text-sm bg-white" value={formId}
          onChange={e => loadPreview(e.target.value)} disabled={!!busy}>
          <option value="">Choose the TypeForm with the KYC submissions…</option>
          {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
      )}

      {busy === 'preview' && <p className="text-sm text-[#9e9e9e] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reading responses…</p>}

      {preview && (
        <div className="space-y-3 bg-white rounded-lg p-3 border border-[#f0f0f0]">
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge className="bg-[#f0f0f0] text-[#555353]">{preview.total} responses</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">{preview.matched.length} matched to Hub members</Badge>
            {preview.unmatched.length > 0 && (
              <button onClick={() => setShowUnmatched(v => !v)}>
                <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">{preview.unmatched.length} not matched {showUnmatched ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</Badge>
              </button>
            )}
          </div>
          {showUnmatched && (
            <p className="text-[11px] text-[#7e7e7e] break-words">
              No Hub account with these emails (invite them first, then re-run the import): {preview.unmatched.join(', ')}
            </p>
          )}

          <label className="block text-xs text-[#555353] space-y-1">
            <span className="font-semibold">Which question holds the member&apos;s email?</span>
            <select className="w-full border border-[#f0f0f0] rounded-lg px-2 py-1.5 text-sm" value={emailRef}
              onChange={e => loadPreview(formId, e.target.value)} disabled={!!busy}>
              {preview.email_fields.length === 0 && <option value="">No email question found</option>}
              {preview.email_fields.map(f => <option key={f.ref} value={f.ref}>{f.title}</option>)}
            </select>
          </label>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#555353]">File uploads → KYC document type</p>
            {preview.file_fields.length === 0 && <p className="text-xs text-[#9e9e9e]">This form has no file-upload questions; only answers will be imported.</p>}
            {preview.file_fields.map(f => (
              <div key={f.ref} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-[#444]" title={f.title}>{f.title}</span>
                <select className="border border-[#f0f0f0] rounded px-1.5 py-1" value={mapping[f.ref] ?? 'other'}
                  onChange={e => setMapping(m => ({ ...m, [f.ref]: e.target.value }))}>
                  {[...KYC_DOC_TYPE_OPTIONS, { value: 'payment-receipt', label: 'Payment receipt' }, { value: 'skip', label: "Don't import" }]
                    .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <p className="text-[11px] text-[#9e9e9e]">The other {preview.other_fields} answers are saved with each member as “TypeForm KYC answers”.</p>
          </div>

          <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={runImport}
            disabled={!!busy || !emailRef || preview.matched.length === 0}>
            {busy === 'import' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Import {preview.matched.length} member{preview.matched.length === 1 ? '' : 's'}
          </Button>
        </div>
      )}

      {progress && (
        <div className="text-sm space-y-1">
          <div className="h-1.5 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-[#e33b5f] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-[#555353] flex items-center gap-1.5">
            {busy === 'import' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            {progress.done}/{progress.total} responses · {progress.files} files imported · {progress.skipped} already imported
            {progress.unmatched.length > 0 && ` · ${progress.unmatched.length} unmatched`}
          </p>
          {progress.errors.length > 0 && (
            <details className="text-xs text-red-600"><summary>{progress.errors.length} error(s)</summary>
              <ul className="mt-1 space-y-0.5">{progress.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
