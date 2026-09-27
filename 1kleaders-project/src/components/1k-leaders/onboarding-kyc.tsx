'use client';
// KYC & Onboarding — the member's path to becoming a shareholder:
//   1. KYC      → complete the KYC form built in the Form Builder (or upload documents if no form is published)
//   2. Payment  → pay the partner fee and upload the receipt
//   3. Review   → an admin approves (Onboarding Tracker) and the member becomes a Shareholder
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Upload, Check, FileText, AlertCircle, Clock, CheckCircle2, CreditCard, Loader2, Download,
  RefreshCw, Shield, ClipboardList, Lock, PartyPopper,
} from 'lucide-react';
import type { Page } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { navigate?: (page: Page) => void; }

// Used only when no KYC form has been published in the Form Builder
const FALLBACK_DOC_TYPES = [
  { id: 'passport',         label: 'Passport Copy',    hint: 'Clear scan of valid passport — PDF or image' },
  { id: 'national-id',      label: 'National ID Copy', hint: 'Front and back — PDF or image' },
  { id: 'proof-of-address', label: 'Proof of Address', hint: 'Utility bill or bank statement (last 3 months)' },
  { id: 'cv',               label: 'CV / Résumé',      hint: 'Most recent CV — PDF' },
];

const POST_APPROVAL = ['Payment Confirmed', 'Awaiting ADGM Registration', 'Officially Registered Partner'];

type KycDoc = {
  id: string; doc_type: string; status: string; file_name: string | null;
  storage_path: string | null; uploaded_at: string | null; rejection_reason: string | null;
};

const docBadge = (status: string) =>
  status === 'approved' ? 'bg-emerald-100 text-emerald-700'
  : status === 'rejected' ? 'bg-red-100 text-red-700'
  : 'bg-amber-100 text-amber-700';

const pretty = (t: string) => t.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function OnboardingKYC({ navigate }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [docs,        setDocs]        = useState<KycDoc[]>([]);
  const [kycForm,     setKycForm]     = useState<{ id: string; title: string } | null>(null);
  const [instructions, setInstructions] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [payFile,     setPayFile]     = useState<File | null>(null);
  const [payRef,      setPayRef]      = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const payInput = useRef<HTMLInputElement | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const [{ data: d }, { data: forms }, { data: setting }] = await Promise.all([
      supabase.from('kyc_documents').select('id, doc_type, status, file_name, storage_path, uploaded_at, rejection_reason').eq('user_id', profile.id),
      supabase.from('forms').select('id, title').eq('purpose', 'kyc').eq('is_published', true).order('created_at', { ascending: false }).limit(1),
      supabase.from('platform_settings').select('value').eq('key', 'payment_instructions').maybeSingle(),
    ]);
    setDocs((d ?? []) as KycDoc[]);
    setKycForm(forms?.[0] ?? null);
    setInstructions(setting?.value ?? '');
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.id]);

  const status   = profile?.onboarding_status ?? '';
  const isShareholder = ['shareholder', 'admin', 'super-admin', 'developer'].includes(profile?.role ?? '');
  const kycDocs  = docs.filter(d => d.doc_type !== 'payment-receipt');
  const receipt  = docs.find(d => d.doc_type === 'payment-receipt');
  const rejected = kycDocs.filter(d => d.status === 'rejected');

  const kycDone = kycForm
    ? kycDocs.some(d => d.doc_type === 'kyc-form') && rejected.length === 0
    : FALLBACK_DOC_TYPES.every(t => kycDocs.some(d => d.doc_type === t.id && d.status !== 'rejected'));
  const paymentDone = !!receipt && receipt.status !== 'rejected';
  const approved    = isShareholder || POST_APPROVAL.includes(status);

  const step = approved ? 4 : !kycDone ? 1 : !paymentDone ? 2 : 3;

  async function markStatus(next: string, onlyIfBefore: string[]) {
    if (!profile || !onlyIfBefore.includes(status)) return;
    await supabase.from('profiles').update({ onboarding_status: next, updated_at: new Date().toISOString() }).eq('id', profile.id);
    await refreshProfile();
  }

  async function upload(docType: string, file: File, extra: Record<string, any> = {}) {
    if (!profile) return false;
    if (file.size > 25 * 1024 * 1024) { setError('File is too large (max 25 MB).'); return false; }
    setUploading(docType); setError(null);
    const path = `${profile.id}/${docType}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error: sErr } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
    if (sErr) { setError(sErr.message); setUploading(null); return false; }
    const { error: dErr } = await supabase.from('kyc_documents').upsert({
      user_id: profile.id, doc_type: docType, storage_path: path, file_name: file.name,
      file_size_bytes: file.size, status: 'submitted', uploaded_at: new Date().toISOString(), source: 'platform', ...extra,
    }, { onConflict: 'user_id,doc_type' });
    setUploading(null);
    if (dErr) { setError(dErr.message); return false; }
    return true;
  }

  async function uploadKycDoc(docType: string, file: File) {
    if (await upload(docType, file)) {
      await markStatus('KYC Submitted', ['', 'Meeting Completed', 'Agreement Signed', 'Platform Access Issued', 'KYC Pending']);
      load();
    }
  }

  async function submitReceipt() {
    if (!payFile) return;
    if (await upload('payment-receipt', payFile, { answers: payRef.trim() ? { reference: payRef.trim() } : null })) {
      await markStatus('Payment Receipt Submitted', ['', 'Meeting Completed', 'Agreement Signed', 'Platform Access Issued', 'KYC Pending', 'KYC Submitted', 'KYC Approved']);
      setPayFile(null); setPayRef('');
      load();
    }
  }

  async function openDoc(doc: KycDoc) {
    if (!doc.storage_path) return;
    const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const STEPS = [
    { n: 1, label: 'KYC',      icon: Shield },
    { n: 2, label: 'Payment',  icon: CreditCard },
    { n: 3, label: 'Approval', icon: ClipboardList },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-[#9e9e9e]"><Loader2 className="w-5 h-5 animate-spin" />Loading...</div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">KYC & Onboarding</h1>
          <p className="text-[#7e7e7e]">Complete these steps to become a 1K Leaders shareholder</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = step > s.n, current = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${done ? 'bg-[#e33b5f] text-white' : current ? 'bg-[#e33b5f] text-white ring-4 ring-[#e33b5f]/20' : 'bg-[#f0f0f0] text-[#9e9e9e]'}`}>
                {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={`text-sm font-medium truncate ${current ? 'text-[#e33b5f]' : done ? 'text-[#222]' : 'text-[#9e9e9e]'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 min-w-4 ${done ? 'bg-[#e33b5f]' : 'bg-[#f0f0f0]'}`} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Done */}
      {step === 4 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><PartyPopper className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-bold text-emerald-800">You&apos;re a 1K Leaders Shareholder</h3>
              <p className="text-sm text-emerald-700 mt-0.5">
                {status === 'Officially Registered Partner' ? 'Your ADGM registration is complete.'
                  : status === 'Awaiting ADGM Registration' ? 'Your file has been submitted to ADGM — this typically takes 2–4 weeks.'
                  : 'Your onboarding is complete. The team will handle your ADGM registration next.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 — KYC */}
      <Card className={`border-[#f0f0f0] ${step === 1 ? 'ring-1 ring-[#e33b5f]/30' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#e33b5f]" /> Step 1 — KYC
            {kycDone && <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-auto">Submitted</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rejected.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 space-y-1">
              <p className="font-medium">Some documents need to be re-submitted:</p>
              {rejected.map(d => <p key={d.id} className="text-xs">• {pretty(d.doc_type)}{d.rejection_reason ? ` — ${d.rejection_reason}` : ''}</p>)}
            </div>
          )}

          {kycForm ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-[#f0f0f0] bg-[#fafafa] flex-wrap">
              <ClipboardList className="w-8 h-8 text-[#e33b5f] shrink-0" />
              <div className="flex-1 min-w-48">
                <p className="text-sm font-semibold text-[#222]">{kycForm.title}</p>
                <p className="text-xs text-[#7e7e7e]">Your details and ID documents in one form. Takes about 5 minutes.</p>
              </div>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => navigate?.(`form-${kycForm.id}` as Page)}>
                {kycDocs.some(d => d.doc_type === 'kyc-form') ? 'Update KYC form' : 'Start KYC form'}
              </Button>
            </div>
          ) : (
            FALLBACK_DOC_TYPES.map(t => {
              const doc = kycDocs.find(d => d.doc_type === t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <p className="text-sm font-medium text-[#222]">{t.label} <span className="text-[#e33b5f]">*</span></p>
                    <p className="text-xs text-[#7e7e7e]">{t.hint}</p>
                  </div>
                  {doc && <Badge className={`text-xs capitalize ${docBadge(doc.status)}`}>{doc.status === 'submitted' ? 'awaiting review' : doc.status}</Badge>}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" ref={el => { fileRefs.current[t.id] = el; }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadKycDoc(t.id, f); e.target.value = ''; }} />
                  <Button size="sm" variant="outline" disabled={uploading === t.id || doc?.status === 'approved'} onClick={() => fileRefs.current[t.id]?.click()}>
                    {uploading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Upload className="w-3.5 h-3.5 mr-1" />{doc ? 'Replace' : 'Upload'}</>}
                  </Button>
                </div>
              );
            })
          )}

          {kycDocs.filter(d => d.storage_path).length > 0 && (
            <div className="border-t border-[#f0f0f0] pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Your documents</p>
              {kycDocs.filter(d => d.storage_path).map(d => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#9e9e9e] shrink-0" />
                  <span className="flex-1 truncate text-[#444]">{pretty(d.doc_type)} <span className="text-[#9e9e9e]">· {d.file_name}</span></span>
                  <Badge className={`text-[10px] capitalize ${docBadge(d.status)}`}>{d.status === 'submitted' ? 'in review' : d.status}</Badge>
                  <button onClick={() => openDoc(d)} className="text-[#9e9e9e] hover:text-[#e33b5f]"><Download className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Payment */}
      <Card className={`border-[#f0f0f0] ${step === 2 ? 'ring-1 ring-[#e33b5f]/30' : ''} ${step < 2 ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#e33b5f]" /> Step 2 — Payment
            {step < 2 && <Lock className="w-3.5 h-3.5 text-[#9e9e9e] ml-auto" />}
            {paymentDone && <Badge className={`text-xs ml-auto ${docBadge(receipt!.status)}`}>{receipt!.status === 'approved' ? 'Confirmed' : 'Receipt submitted'}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step < 2 ? (
            <p className="text-sm text-[#9e9e9e]">Complete your KYC first to unlock payment.</p>
          ) : (
            <>
              {instructions && <div className="p-4 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg text-sm text-[#444] whitespace-pre-wrap">{instructions}</div>}
              {receipt?.status === 'rejected' && (
                <p className="text-sm text-red-600">Your receipt couldn&apos;t be verified{receipt.rejection_reason ? `: ${receipt.rejection_reason}` : ''}. Please upload it again.</p>
              )}
              {paymentDone ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <FileText className="w-5 h-5 text-[#e33b5f] shrink-0" />
                  <span className="flex-1 truncate text-sm text-[#222]">{receipt!.file_name}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDoc(receipt!)}><Download className="w-3 h-3 mr-1" />View</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#222]">Payment reference / transaction ID (optional)</label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. TXN-2026-00123" value={payRef} onChange={e => setPayRef(e.target.value)} />
                  </div>
                  <input type="file" className="hidden" ref={payInput} accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setPayFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => payInput.current?.click()}
                    className="w-full border-2 border-dashed border-[#e8e8e8] rounded-lg p-5 text-center hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition flex flex-col items-center gap-2">
                    {payFile
                      ? <><FileText className="w-7 h-7 text-[#e33b5f]" /><p className="text-sm text-[#e33b5f] font-medium">{payFile.name}</p></>
                      : <><Upload className="w-7 h-7 text-[#9e9e9e]" /><p className="text-sm text-[#555353]">Upload payment receipt</p><p className="text-xs text-[#9e9e9e]">PDF, JPG, or PNG — max 25 MB</p></>}
                  </button>
                  <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white w-full" onClick={submitReceipt} disabled={!payFile || uploading === 'payment-receipt'}>
                    {uploading === 'payment-receipt' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Submit Payment Receipt</>}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 3 — Approval */}
      <Card className={`border-[#f0f0f0] ${step === 3 ? 'ring-1 ring-[#e33b5f]/30' : ''} ${step < 3 ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#e33b5f]" /> Step 3 — Approval
            {step === 4 && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step < 3 ? (
            <p className="text-sm text-[#9e9e9e]">Once your KYC and payment receipt are in, the 1K Leaders team reviews them and activates your shareholding.</p>
          ) : step === 3 ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Under review</p>
                <p className="text-xs text-amber-700 mt-0.5">The team is verifying your KYC and payment (usually 1–3 business days). You&apos;ll get a notification and email when you&apos;re approved.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">Approved — welcome aboard!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
