'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, Users, FileText, CreditCard, Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';

const ONBOARDING_STEPS = [
  'Meeting Completed',
  'Agreement Signed',
  'Platform Access Issued',
  'KYC Submitted',
  'KYC Approved',
  'Payment Receipt Submitted',
  'Payment Confirmed',
  'Awaiting ADGM Registration',
  'Officially Registered Partner',
];

// Group steps into phases for the UI
const PHASES = [
  { label: 'Agreement',    steps: ['Meeting Completed', 'Agreement Signed', 'Platform Access Issued'], color: 'bg-blue-100 text-blue-700',     icon: FileText },
  { label: 'KYC',         steps: ['KYC Submitted', 'KYC Approved'],                                   color: 'bg-purple-100 text-purple-700', icon: Shield },
  { label: 'Payment',     steps: ['Payment Receipt Submitted', 'Payment Confirmed'],                    color: 'bg-emerald-100 text-emerald-700', icon: CreditCard },
  { label: 'Registration',steps: ['Awaiting ADGM Registration', 'Officially Registered Partner'],      color: 'bg-[#e33b5f]/10 text-[#c02d4f]', icon: CheckCircle2 },
];

type Partner = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  onboarding_status: string;
  created_at: string;
};

type KycDoc = {
  doc_type: string;
  status: string;
  storage_path: string | null;
  file_name: string | null;
  source: string | null;
  answers: Record<string, any> | null;
};

const docStatusColor = (s: string) =>
  s === 'approved' ? 'bg-emerald-100 text-emerald-700' :
  s === 'submitted' || s === 'under-review' ? 'bg-amber-100 text-amber-700' :
  s === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500';

export default function OnboardingTracker() {
  const [partners,   setPartners]   = useState<Partner[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [phase,      setPhase]      = useState('All');
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [kycDocs,    setKycDocs]    = useState<Record<string, KycDoc[]>>({});
  const [updating,   setUpdating]   = useState<string | null>(null);

  async function fetchPartners() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, onboarding_status, created_at')
      .not('role', 'in', '("developer")')
      .order('created_at', { ascending: false });
    setPartners((data ?? []) as Partner[]);
    setLoading(false);
  }

  useEffect(() => { fetchPartners(); }, []);

  async function loadKycDocs(userId: string) {
    const { data } = await supabase
      .from('kyc_documents')
      .select('doc_type, status, storage_path, file_name, source, answers')
      .eq('user_id', userId);
    setKycDocs(prev => ({ ...prev, [userId]: (data ?? []) as KycDoc[] }));
  }

  async function openDoc(doc: KycDoc) {
    if (!doc.storage_path) return;
    const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  // Final approval: approves KYC + receipt and makes the member a Shareholder (server-side)
  async function approveShareholder(p: Partner) {
    if (!window.confirm(`Approve ${[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email} as a Shareholder?\n\nThis approves their submitted KYC documents and payment receipt, and changes their role to Shareholder.`)) return;
    setUpdating(p.id);
    const res = await apiFetch('/api/onboarding/approve-shareholder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: p.id, action: 'approve' }),
    });
    const data = await res.json().catch(() => ({}));
    setUpdating(null);
    if (!res.ok) { alert(`Approval failed: ${data.error ?? res.status}`); return; }
    setPartners(prev => prev.map(x => x.id === p.id ? { ...x, role: data.role, onboarding_status: 'Payment Confirmed' } : x));
    loadKycDocs(p.id);
  }

  async function rejectReceipt(p: Partner) {
    const reason = window.prompt('Why is the receipt being rejected? (shown to the member)');
    if (reason === null) return;
    setUpdating(p.id);
    const res = await apiFetch('/api/onboarding/approve-shareholder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: p.id, action: 'reject_receipt', reason }),
    });
    setUpdating(null);
    if (!res.ok) { alert('Could not reject receipt'); return; }
    setPartners(prev => prev.map(x => x.id === p.id ? { ...x, onboarding_status: 'KYC Submitted' } : x));
    loadKycDocs(p.id);
  }

  // Payment instructions + Clara KYC Form template shown to members on the KYC & Onboarding page
  const [payInstructions, setPayInstructions] = useState('');
  const [editingPay, setEditingPay] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [claraUrl, setClaraUrl] = useState('');
  const [claraName, setClaraName] = useState('');
  const [uploadingClara, setUploadingClara] = useState(false);
  const [claraMsg, setClaraMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadOnboardingSettings() {
    const res = await apiFetch('/api/onboarding/settings');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setClaraMsg({ ok: false, text: `Couldn't load settings: ${data.error ?? res.status}` }); return; }
    setPayInstructions(data.payment_instructions ?? '');
    setClaraUrl(data.clara_kyc_template_url ?? '');
    setClaraName(data.clara_kyc_template_name ?? '');
  }
  useEffect(() => { loadOnboardingSettings(); }, []);

  // Uploaded server-side (service role) — see /api/onboarding/settings
  async function uploadClaraTemplate(file: File) {
    setUploadingClara(true); setClaraMsg(null);
    const body = new FormData();
    body.append('file', file);
    const res = await apiFetch('/api/onboarding/settings', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    setUploadingClara(false);
    if (!res.ok) { setClaraMsg({ ok: false, text: data.error ?? `Upload failed (${res.status})` }); return; }
    setClaraUrl(data.url); setClaraName(data.name);
    setClaraMsg({ ok: true, text: `Saved “${data.name}”. Members can now download it on KYC & Onboarding.` });
  }
  async function savePayInstructions() {
    setSavingPay(true);
    const res = await apiFetch('/api/admin/platform-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'payment_instructions', value: payInstructions }),
    });
    setSavingPay(false);
    if (res.ok) setEditingPay(false); else alert('Could not save payment instructions');
  }

  async function updateStatus(userId: string, status: string, extra?: Record<string, any>) {
    setUpdating(userId);
    await supabase.from('profiles').update({
      onboarding_status: status,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    setPartners(prev => prev.map(p => p.id === userId ? { ...p, onboarding_status: status } : p));
    setUpdating(null);

    // In-platform notification
    const notifMessages: Record<string, { title: string; message: string; type: string }> = {
      'Agreement Signed':            { title: 'Agreement Signed ✓',             message: 'Your partnership agreement has been signed. Please complete your KYC documents next.',                     type: 'success' },
      'Platform Access Issued':      { title: 'Platform Access Issued',          message: 'You now have full access to the 1K Leaders Partner Hub.',                                                  type: 'success' },
      'KYC Submitted':               { title: 'KYC Documents Received',          message: 'Your KYC documents have been received and are under review.',                                              type: 'info'    },
      'KYC Approved':                { title: 'KYC Approved ✓',                  message: 'Your KYC has been approved. Please submit your payment receipt to continue.',                              type: 'success' },
      'Payment Receipt Submitted':   { title: 'Payment Receipt Received',        message: 'Your payment receipt has been received and is being verified.',                                            type: 'info'    },
      'Payment Confirmed':           { title: 'Payment Confirmed ✓',             message: 'Your payment has been confirmed. Your file is being prepared for ADGM registration.',                      type: 'success' },
      'Awaiting ADGM Registration':  { title: 'Submitted to ADGM',               message: 'Your file has been submitted to ADGM for registration. This typically takes 2–4 weeks.',                  type: 'info'    },
      'Officially Registered Partner': { title: '🎉 Officially Registered!',    message: 'Congratulations! You are now an officially registered 1K Leaders partner.',                                type: 'success' },
    };

    const notif = notifMessages[status];
    if (notif) {
      supabase.from('notifications').insert({
        user_id:           userId,
        title:             notif.title,
        message:           notif.message,
        notification_type: notif.type,
        is_read:           false,
      }).then(() => {});
    }

    // Fire-and-forget email notification
    apiFetch('/api/onboarding/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, new_status: status, ...extra }),
    }).catch(() => {});
  }

  async function updateDocStatus(userId: string, docType: string, status: string) {
    let rejection_reason: string | null = null;
    if (status === 'rejected') {
      rejection_reason = window.prompt('Reason for rejection (shown to the member):');
      if (rejection_reason === null) return;
    }
    await supabase.from('kyc_documents').update({ status, rejection_reason }).match({ user_id: userId, doc_type: docType });
    setKycDocs(prev => ({
      ...prev,
      [userId]: (prev[userId] ?? []).map(d => d.doc_type === docType ? { ...d, status } : d),
    }));
  }

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadKycDocs(id);
  };

  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = partners.filter(p => {
    if (statusFilter !== 'All' && p.onboarding_status !== statusFilter) return false;
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !p.email.includes(search.toLowerCase())) return false;
    if (phase !== 'All') {
      const phaseObj = PHASES.find(ph => ph.label === phase);
      if (phaseObj && !phaseObj.steps.includes(p.onboarding_status)) return false;
    }
    return true;
  });

  const stepIndex = (status: string) => ONBOARDING_STEPS.indexOf(status);

  // Counts by phase
  const phaseCounts = PHASES.map(ph => ({
    ...ph,
    count: partners.filter(p => ph.steps.includes(p.onboarding_status)).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Onboarding Tracker</h1>
          <p className="text-[#7e7e7e]">KYC → payment → approval. Approving a member makes them a Shareholder.</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchPartners} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Payment instructions (shown to members on KYC & Onboarding) */}
      <Card className="border-[#f0f0f0]">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#222] flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#e33b5f]" />Payment instructions <span className="font-normal text-xs text-[#9e9e9e]">(bank details are in the partnership agreement)</span></p>
            {!editingPay
              ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingPay(true)}>Edit</Button>
              : <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingPay(false)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs bg-[#e33b5f] text-white" onClick={savePayInstructions} disabled={savingPay}>
                    {savingPay ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                  </Button>
                </div>}
          </div>
          {editingPay
            ? <textarea rows={4} className="w-full border border-[#f0f0f0] rounded-lg px-3 py-2 text-sm resize-y" value={payInstructions}
                placeholder="Bank name, account name, IBAN, amount, reference to use…" onChange={e => setPayInstructions(e.target.value)} />
            : <p className="text-xs text-[#7e7e7e] whitespace-pre-wrap">{payInstructions || 'Not set — members will only see the upload box.'}</p>}

          <div className="border-t border-[#f0f0f0] pt-3 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#222] flex items-center gap-2 mr-auto"><FileText className="w-4 h-4 text-[#e33b5f]" />Clara KYC Form template</p>
            {claraUrl
              ? <a href={claraUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#e33b5f] hover:underline">{claraName || 'Current template'} ↓</a>
              : <span className="text-xs text-amber-600">Not uploaded — members can&apos;t download it yet</span>}
            <label className={uploadingClara ? 'pointer-events-none' : 'cursor-pointer'}>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadClaraTemplate(f); e.target.value = ''; }} />
              <span className="inline-flex items-center gap-1 h-7 px-3 rounded-md border border-[#e8e8e8] text-xs font-medium hover:bg-[#fafafa]">
                {uploadingClara ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading…</> : claraUrl ? 'Replace' : 'Upload (PDF / DOCX)'}
              </span>
            </label>
          </div>
          {claraMsg && (
            <p className={`text-xs ${claraMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{claraMsg.text}</p>
          )}
        </CardContent>
      </Card>

      {/* Phase summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {phaseCounts.map(ph => (
          <button key={ph.label} onClick={() => setPhase(phase === ph.label ? 'All' : ph.label)}
            className={`p-3 rounded-xl border text-left transition ${phase === ph.label ? 'border-[#e33b5f] bg-[#e33b5f]/5' : 'border-[#f0f0f0] bg-white hover:border-[#e33b5f]/30'}`}>
            <ph.icon className="w-4 h-4 text-[#e33b5f] mb-1" />
            <div className="text-xl font-bold text-[#222]">{loading ? '—' : ph.count}</div>
            <div className="text-xs text-[#7e7e7e]">{ph.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={phase} onValueChange={setPhase}>
          <SelectTrigger className="w-44 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All phases</SelectItem>
            {PHASES.map(ph => <SelectItem key={ph.label} value={ph.label}>{ph.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading partners...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9e9e9e] text-sm">No partners found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const si = stepIndex(p.onboarding_status);
            const pct = Math.max(0, (si / (ONBOARDING_STEPS.length - 1)) * 100);
            const isExpanded = expanded === p.id;
            const docs = kycDocs[p.id] ?? [];
            const needsKyc = si >= ONBOARDING_STEPS.indexOf("KYC Submitted") && si <= ONBOARDING_STEPS.indexOf("KYC Approved");
            const needsPayment = si >= ONBOARDING_STEPS.indexOf("Payment Receipt Submitted") && si <= ONBOARDING_STEPS.indexOf("Payment Confirmed");

            // Next available statuses (forward + one back)
            const nextStatuses = ONBOARDING_STEPS.filter((_, i) =>
              i === si - 1 || (i > si && i <= si + 3)
            );

            return (
              <Card key={p.id} className="border-[#f0f0f0] overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#fafafa] transition" onClick={() => toggleExpand(p.id)}>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-semibold">
                      {`${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-[#222]">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                      </p>
                      <Badge className="text-xs capitalize bg-[#f0f0f0] text-[#555353]">{p.role}</Badge>
                      {si === ONBOARDING_STEPS.length - 1 && <Badge className="text-xs bg-emerald-100 text-emerald-700">✓ Registered</Badge>}
                    </div>
                    <p className="text-xs text-[#7e7e7e] mt-0.5 truncate">{p.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#e33b5f] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#9e9e9e] whitespace-nowrap">{si + 1}/{ONBOARDING_STEPS.length}</span>
                    </div>
                    <p className="text-xs text-[#e33b5f] font-medium mt-0.5">{p.onboarding_status}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9e9e9e] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e] shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-[#f0f0f0] p-4 space-y-4 bg-[#fafafa]">
                    {/* Status update */}
                    <div>
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {nextStatuses.map(s => (
                          <button key={s} onClick={() => updateStatus(p.id, s)}
                            disabled={updating === p.id}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                              s === p.onboarding_status
                                ? 'bg-[#e33b5f] text-white border-[#e33b5f]'
                                : ONBOARDING_STEPS.indexOf(s) > si
                                  ? 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'
                                  : 'bg-white text-[#9e9e9e] border-[#f0f0f0] hover:border-stone-300'
                            }`}>
                            {updating === p.id ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                            {ONBOARDING_STEPS.indexOf(s) < si ? '↩ ' : ''}{s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full status picker */}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#7e7e7e] shrink-0">Jump to:</p>
                      <Select value={p.onboarding_status} onValueChange={s => updateStatus(p.id, s)}>
                        <SelectTrigger className="h-8 text-xs border-[#f0f0f0] flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {ONBOARDING_STEPS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* KYC document review */}
                    <div>
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">KYC Documents</p>
                      {docs.filter(d => d.doc_type !== 'payment-receipt').length === 0 ? (
                        <p className="text-xs text-[#9e9e9e]">No KYC submitted yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {docs.filter(d => d.doc_type !== 'payment-receipt').map(doc => (
                            <div key={doc.doc_type}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-[#444] capitalize flex items-center gap-1.5 min-w-0">
                                  <span className="truncate">{doc.doc_type.replace(/-/g, ' ')}</span>
                                  {doc.source === 'typeform' && <span className="text-[9px] px-1 rounded bg-[#f0f0f0] text-[#7e7e7e] normal-case">TypeForm</span>}
                                  {doc.storage_path && (
                                    <button onClick={() => openDoc(doc)} className="text-[#e33b5f] hover:underline normal-case shrink-0">view</button>
                                  )}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className={`text-[10px] ${docStatusColor(doc.status)}`}>{doc.status}</Badge>
                                  {doc.status !== 'approved' && (
                                    <button onClick={() => updateDocStatus(p.id, doc.doc_type, 'approved')} title="Approve"
                                      className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition">✓</button>
                                  )}
                                  {doc.status !== 'rejected' && (
                                    <button onClick={() => updateDocStatus(p.id, doc.doc_type, 'rejected')} title="Reject"
                                      className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">✗</button>
                                  )}
                                </div>
                              </div>
                              {doc.answers && Object.keys(doc.answers).length > 0 && (
                                <dl className="mt-1.5 ml-2 pl-2 border-l-2 border-[#f0f0f0] space-y-0.5">
                                  {Object.entries(doc.answers).map(([q, a]) => (
                                    <div key={q} className="text-[11px] flex gap-2">
                                      <dt className="text-[#9e9e9e] shrink-0 max-w-[45%] truncate" title={q}>{q}</dt>
                                      <dd className="text-[#444] break-words min-w-0">{Array.isArray(a) ? a.join(', ') : String(a)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment review + final approval */}
                    {(() => {
                      const receipt = docs.find(d => d.doc_type === 'payment-receipt');
                      const isShareholder = ['shareholder', 'admin', 'super-admin', 'developer'].includes(p.role);
                      return (
                        <div>
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Payment & Approval</p>
                          {!receipt ? (
                            <p className="text-xs text-[#9e9e9e]">{isShareholder ? 'Already a shareholder.' : 'Awaiting payment receipt from member.'}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-[#444]">Receipt: {receipt.file_name}</span>
                                {receipt.answers?.reference && <span className="text-[11px] text-[#7e7e7e]">Ref: {receipt.answers.reference}</span>}
                                <button onClick={() => openDoc(receipt)} className="text-xs text-[#e33b5f] hover:underline">view</button>
                                <Badge className={`text-[10px] ${docStatusColor(receipt.status)}`}>{receipt.status}</Badge>
                              </div>
                              {!isShareholder && receipt.status !== 'rejected' && (
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={updating === p.id} onClick={() => approveShareholder(p)}>
                                    {updating === p.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                    Approve & make Shareholder
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 text-xs text-red-600" disabled={updating === p.id} onClick={() => rejectReceipt(p)}>
                                    Reject receipt
                                  </Button>
                                </div>
                              )}
                              {isShareholder && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Shareholder</p>}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <p className="text-[10px] text-[#9e9e9e]">
                      Joined {new Date(p.created_at).toLocaleDateString()} · ID: {p.id.slice(0, 8)}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
