'use client';
// Admin-started onboarding: type the prospect's name/email/phone → DocuSign shareholder agreement is sent →
// once signed, their account is created automatically and they get a welcome email. After first login they
// fill in the full registration details, then KYC → payment → approval like everyone else.
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, RefreshCw, Send, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';

type Prospect = {
  id: string; created_at: string; first_name: string; last_name: string; email: string; phone: string | null;
  status: string; envelope_id: string | null; user_id: string | null; signed_at: string | null; last_error: string | null;
};

const STATUS: Record<string, { label: string; color: string }> = {
  agreement_sent:  { label: 'Agreement sent',    color: 'bg-amber-100 text-amber-700' },
  signed:          { label: 'Signed',            color: 'bg-blue-100 text-blue-700' },
  account_created: { label: 'Account created',   color: 'bg-emerald-100 text-emerald-700' },
  registered:      { label: 'Registered',        color: 'bg-emerald-100 text-emerald-700' },
  declined:        { label: 'Declined',          color: 'bg-red-100 text-red-700' },
  voided:          { label: 'Voided',            color: 'bg-stone-100 text-stone-500' },
  cancelled:       { label: 'Cancelled',         color: 'bg-stone-100 text-stone-500' },
  error:           { label: 'Error',             color: 'bg-red-100 text-red-700' },
};

export default function ProspectOnboarding({ onAccountCreated }: { onAccountCreated?: () => void }) {
  const [open,      setOpen]      = useState(true);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [checking,  setChecking]  = useState(false);
  const [busy,      setBusy]      = useState<string | null>(null);
  const [form,      setForm]      = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
  const [sending,   setSending]   = useState(false);
  const [msg,       setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const { data } = await supabase.from('shareholder_prospects').select('*').order('created_at', { ascending: false }).limit(50);
    setProspects((data ?? []) as Prospect[]);
    setLoading(false);
  }

  // Ask DocuSign about pending agreements, then reload
  async function check() {
    setChecking(true);
    const res = await apiFetch('/api/onboarding/prospects/check', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setChecking(false);
    if (data.created) { setMsg({ ok: true, text: `${data.created} signed agreement${data.created === 1 ? '' : 's'} — account${data.created === 1 ? '' : 's'} created and welcome email sent.` }); onAccountCreated?.(); }
    load();
  }

  useEffect(() => { load().then(check); }, []);

  async function invite() {
    setSending(true); setMsg(null);
    const res = await apiFetch('/api/onboarding/prospects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? `Failed (${res.status})` }); load(); return; }
    setMsg({ ok: true, text: `Shareholder agreement sent to ${form.email} via DocuSign. Their account is created automatically once they sign.` });
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '' });
    load();
  }

  async function act(p: Prospect, action: 'resend' | 'cancel' | 'create_account') {
    const confirmText = {
      resend: `Send a new agreement to ${p.email}? Any unsigned one will be voided.`,
      cancel: `Cancel onboarding for ${p.first_name} ${p.last_name}? Their unsigned agreement will be voided in DocuSign.`,
      create_account: `Create the Hub account for ${p.email} now and send the welcome email?\n\nOnly do this if they have signed the agreement.`,
    }[action];
    if (!window.confirm(confirmText)) return;
    setBusy(p.id);
    const res = await apiFetch('/api/onboarding/prospects', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setMsg({ ok: false, text: data.error ?? `Failed (${res.status})` });
    else if (action === 'create_account') onAccountCreated?.();
    load();
  }

  const valid = form.first_name.trim() && form.last_name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const pendingCount = prospects.filter(p => ['agreement_sent', 'signed'].includes(p.status)).length;

  return (
    <Card className="border-[#f0f0f0]">
      <CardContent className="p-4 space-y-4">
        <button className="w-full flex items-center justify-between gap-2" onClick={() => setOpen(v => !v)}>
          <span className="text-sm font-semibold text-[#222] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#e33b5f]" />Invite a prospect shareholder
            {pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{pendingCount} awaiting signature</Badge>}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-[#9e9e9e]" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e]" />}
        </button>

        {open && (
          <>
            <p className="text-xs text-[#7e7e7e]">
              Sends the shareholder agreement through DocuSign. When it&apos;s signed, their Hub account is created automatically and they receive a welcome email.
              On first login they complete their full profile, then KYC → payment → your approval.
            </p>

            <div className="grid sm:grid-cols-2 gap-2">
              <Input placeholder="First name *" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              <Input placeholder="Last name *" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              <Input type="email" placeholder="Email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value.replace(/\s/g, '') }))} />
              <Input type="tel" placeholder="Phone (with country code)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <Input className="sm:col-span-2" placeholder="Internal notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={invite} disabled={!valid || sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}Send shareholder agreement
              </Button>
              <Button variant="outline" size="sm" onClick={check} disabled={checking}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />Check signatures
              </Button>
            </div>
            {msg && (
              <div className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span className="flex-1">{msg.text}</span><button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#9e9e9e]"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
            ) : prospects.length > 0 && (
              <div className="border border-[#f0f0f0] rounded-xl divide-y divide-[#f0f0f0]">
                {prospects.map(p => {
                  const s = STATUS[p.status] ?? { label: p.status, color: 'bg-stone-100 text-stone-500' };
                  const openStatus = ['agreement_sent', 'signed', 'error'].includes(p.status);
                  return (
                    <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-48">
                        <p className="text-sm font-medium text-[#222]">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-[#9e9e9e] truncate">{p.email}{p.phone ? ` · ${p.phone}` : ''} · {new Date(p.created_at).toLocaleDateString()}</p>
                        {p.last_error && <p className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" />{p.last_error}</p>}
                      </div>
                      <Badge className={`text-[10px] ${s.color}`}>{s.label}</Badge>
                      {openStatus && (
                        <div className="flex gap-1">
                          {p.status === 'signed' || p.status === 'error'
                            ? <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy === p.id} onClick={() => act(p, 'create_account')}>Create account</Button>
                            : null}
                          {p.status !== 'signed' && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy === p.id} onClick={() => act(p, 'resend')}>Resend</Button>}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" disabled={busy === p.id} onClick={() => act(p, 'cancel')}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
