'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Upload, Check, FileText, AlertCircle, Clock, CheckCircle2,
  Package, CreditCard, Loader2, Download, RefreshCw, X, Shield
} from 'lucide-react';
import type { Page } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { navigate?: (page: Page) => void; }

// The 22 onboarding statuses in order
const ONBOARDING_STEPS = [
  'Waitlist Submitted',
  'Under Admin Review',
  'Meeting to be Scheduled',
  'Meeting Scheduled',
  'Meeting Completed',
  'Not Proceeding',
  'Agreement Sent',
  'Agreement Signed',
  'Platform Access Issued',
  'KYC Pending',
  'KYC Submitted',
  'KYC Under Review',
  'KYC Approved',
  'Payment Pending',
  'Payment Receipt Submitted',
  'Payment Confirmed',
  'Welcome Pack Shared',
  'Pending Operations Review',
  'File Completed',
  'Awaiting 50-Person Round',
  'Awaiting ADGM Registration',
  'Officially Registered Partner',
];

const KYC_DOC_TYPES = [
  { id: 'clara-kyc-form',    label: 'Clara KYC Form',       hint: 'Completed Clara KYC form — PDF',              required: true },
  { id: 'passport',          label: 'Passport Copy',         hint: 'Clear scan of valid passport — PDF or image', required: true },
  { id: 'national-id',       label: 'National ID Copy',      hint: 'Front and back — PDF or image',               required: true },
  { id: 'cv',                label: 'CV / Résumé',           hint: 'Most recent CV — PDF',                        required: true },
  { id: 'proof-of-address',  label: 'Proof of Address',      hint: 'Utility bill or bank statement (last 3 months)', required: true },
];

type KycDoc = {
  id: string;
  doc_type: string;
  status: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string | null;
  rejection_reason: string | null;
};

const stepStatusStyle = (current: string, step: string) => {
  const ci = ONBOARDING_STEPS.indexOf(current);
  const si = ONBOARDING_STEPS.indexOf(step);
  if (si < ci)  return { dot: 'bg-[#e33b5f]', text: 'text-[#222]', line: 'bg-[#e33b5f]' };
  if (si === ci) return { dot: 'bg-[#e33b5f] ring-4 ring-[#e33b5f]/20', text: 'text-[#e33b5f] font-semibold', line: 'bg-[#f0f0f0]' };
  return { dot: 'bg-[#f0f0f0]', text: 'text-[#9e9e9e]', line: 'bg-[#f0f0f0]' };
};

const docStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':     return 'bg-emerald-100 text-emerald-700';
    case 'submitted':
    case 'under-review': return 'bg-amber-100 text-amber-700';
    case 'rejected':     return 'bg-red-100 text-red-700';
    default:             return 'bg-[#f0f0f0] text-[#7e7e7e]';
  }
};

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OnboardingKYC({ navigate }: Props) {
  const { profile, refreshProfile } = useAuth();
  const currentStatus = profile?.onboarding_status ?? 'Platform Access Issued';
  const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStatus);
  const progress = Math.max(0, (currentStepIndex / (ONBOARDING_STEPS.length - 1)) * 100);

  // KYC documents
  const [kycDocs,      setKycDocs]      = useState<KycDoc[]>([]);
  const [loadingDocs,  setLoadingDocs]  = useState(true);
  const [uploading,    setUploading]    = useState<string | null>(null);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Payment
  const [paymentFile,    setPaymentFile]    = useState<File | null>(null);
  const [paymentRef,     setPaymentRef]     = useState('');
  const [uploadingPay,   setUploadingPay]   = useState(false);
  const [paymentUploaded, setPaymentUploaded] = useState(false);
  const paymentRef2 = useRef<HTMLInputElement | null>(null);

  // Welcome pack
  const [welcomePackUrl, setWelcomePackUrl] = useState<string | null>(null);

  async function fetchKycDocs() {
    if (!profile) return;
    setLoadingDocs(true);
    const { data } = await supabase
      .from('kyc_documents')
      .select('id, doc_type, status, file_name, storage_path, uploaded_at, rejection_reason')
      .eq('user_id', profile.id);
    setKycDocs((data ?? []) as KycDoc[]);
    setLoadingDocs(false);
  }

  useEffect(() => { fetchKycDocs(); }, [profile]);

  async function handleDocUpload(docType: string, file: File) {
    if (!profile) return;
    setUploading(docType);
    setUploadError(null);
    const path = `${profile.id}/${docType}/${Date.now()}_${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from('kyc-documents')
      .upload(path, file, { upsert: true });

    if (storageErr) { setUploadError(storageErr.message); setUploading(null); return; }

    const { error: dbErr } = await supabase
      .from('kyc_documents')
      .upsert({
        user_id:         profile.id,
        doc_type:        docType,
        storage_path:    path,
        file_name:       file.name,
        file_size_bytes: file.size,
        status:          'submitted',
        uploaded_at:     new Date().toISOString(),
      }, { onConflict: 'user_id,doc_type' });

    if (dbErr) { setUploadError(dbErr.message); setUploading(null); return; }

    // If all docs submitted and status is still KYC Pending, advance to KYC Submitted
    if (currentStatus === 'KYC Pending' || currentStatus === 'Platform Access Issued') {
      await supabase.from('profiles').update({
        onboarding_status: 'KYC Submitted',
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      await refreshProfile();
    }

    setUploading(null);
    fetchKycDocs();
  }

  async function handlePaymentUpload() {
    if (!profile || !paymentFile) return;
    setUploadingPay(true);
    const path = `${profile.id}/payment-receipt/${Date.now()}_${paymentFile.name}`;

    const { error: storageErr } = await supabase.storage
      .from('kyc-documents')
      .upload(path, paymentFile, { upsert: true });

    if (!storageErr) {
      await supabase.from('kyc_documents').upsert({
        user_id:         profile.id,
        doc_type:        'payment-receipt',
        storage_path:    path,
        file_name:       paymentFile.name,
        file_size_bytes: paymentFile.size,
        status:          'submitted',
        uploaded_at:     new Date().toISOString(),
      }, { onConflict: 'user_id,doc_type' });

      await supabase.from('profiles').update({
        onboarding_status: 'Payment Receipt Submitted',
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);

      await refreshProfile();
      setPaymentUploaded(true);
    }
    setUploadingPay(false);
  }

  async function downloadDoc(doc: KycDoc) {
    const { data } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const getDocForType = (type: string) => kycDocs.find(d => d.doc_type === type);
  const kycComplete = KYC_DOC_TYPES.every(t => {
    const doc = getDocForType(t.id);
    return doc && ['submitted','under-review','approved'].includes(doc.status);
  });

  // Determine which sections are visible based on current status
  const showKYC = currentStepIndex >= ONBOARDING_STEPS.indexOf('KYC Pending') && currentStepIndex < ONBOARDING_STEPS.indexOf('Payment Pending');
  const showKYCReview = currentStatus === 'KYC Under Review' || currentStatus === 'KYC Approved';
  const showPayment = currentStepIndex >= ONBOARDING_STEPS.indexOf('Payment Pending') && currentStepIndex < ONBOARDING_STEPS.indexOf('Welcome Pack Shared');
  const showWelcomePack = currentStepIndex >= ONBOARDING_STEPS.indexOf('Welcome Pack Shared');
  const showAwaiting = currentStatus === 'Awaiting 50-Person Round' || currentStatus === 'Awaiting ADGM Registration';
  const isRegistered = currentStatus === 'Officially Registered Partner';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Onboarding & KYC</h1>
        <p className="text-[#7e7e7e]">Complete your partner onboarding journey</p>
      </div>

      {/* Overall progress */}
      <Card className="border-[#f0f0f0]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-sm font-medium text-[#222]">Current Status</p>
              <p className="text-lg font-bold text-[#e33b5f] mt-0.5">{currentStatus}</p>
            </div>
            <Badge className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm">
              Step {Math.max(1, currentStepIndex + 1)} of {ONBOARDING_STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mb-4" />

          {/* Step pills — show a window of steps around current */}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {ONBOARDING_STEPS.map((step, i) => {
              const style = stepStatusStyle(currentStatus, step);
              const isDone = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${style.dot}`}>
                    {isDone && <Check className="w-2.5 h-2.5 text-white m-auto" style={{ display: 'flex' }} />}
                  </div>
                  <span className={`text-xs ${style.text}`}>{step}</span>
                  {isCurrent && <span className="text-[10px] bg-[#e33b5f] text-white px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">Current</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registered banner */}
      {isRegistered && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-800">Officially Registered Partner</h3>
              <p className="text-sm text-emerald-700 mt-0.5">Your ADGM registration is complete. Welcome to 1K Leaders.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Early stage — not yet at KYC */}
      {currentStepIndex < ONBOARDING_STEPS.indexOf('KYC Pending') && !isRegistered && (
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-6 text-center space-y-3">
            <Clock className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">Onboarding in Progress</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              The 1K Leaders team is reviewing your application. You will be notified when KYC documents are required.
            </p>
            <p className="text-xs text-[#9e9e9e]">Current: <span className="font-medium text-[#555353]">{currentStatus}</span></p>
          </CardContent>
        </Card>
      )}

      {/* KYC Document Upload */}
      {(showKYC || showKYCReview) && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#e33b5f]" /> KYC Documents
              </CardTitle>
              <div className="flex items-center gap-2">
                {kycComplete && <Badge className="bg-emerald-100 text-emerald-700 text-xs">All Submitted</Badge>}
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={fetchKycDocs} disabled={loadingDocs}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <p className="text-xs text-[#7e7e7e] mt-1">
              Upload all 5 required documents. Files are stored securely and only accessible to the KYC review team.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}
              </div>
            )}
            {KYC_DOC_TYPES.map(docType => {
              const existing = getDocForType(docType.id);
              const isUploading = uploading === docType.id;
              return (
                <div key={docType.id}>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <label className="text-sm font-medium text-[#222]">
                        {docType.label} <span className="text-[#e33b5f]">*</span>
                      </label>
                      <p className="text-xs text-[#7e7e7e]">{docType.hint}</p>
                    </div>
                    {existing && (
                      <Badge className={`text-xs capitalize ${docStatusBadge(existing.status)}`}>
                        {existing.status.replace(/-/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  {existing ? (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                      existing.status === 'approved'  ? 'bg-emerald-50 border-emerald-200' :
                      existing.status === 'rejected'  ? 'bg-red-50 border-red-200' :
                      'bg-[#f6f6f6] border-[#f0f0f0]'
                    }`}>
                      <FileText className={`w-5 h-5 flex-shrink-0 ${existing.status === 'approved' ? 'text-emerald-600' : existing.status === 'rejected' ? 'text-red-500' : 'text-[#e33b5f]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#222] truncate">{existing.file_name}</p>
                        {existing.uploaded_at && <p className="text-xs text-[#7e7e7e]">Uploaded {new Date(existing.uploaded_at).toLocaleDateString()}</p>}
                        {existing.rejection_reason && <p className="text-xs text-red-600 mt-0.5">Reason: {existing.rejection_reason}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadDoc(existing)}>
                          <Download className="w-3 h-3 mr-1" />View
                        </Button>
                        {existing.status === 'rejected' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-[#e33b5f] border-[#e33b5f]/30"
                            onClick={() => fileRefs.current[docType.id]?.click()}>
                            Re-upload
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[docType.id]?.click()}
                      disabled={isUploading}
                      className="w-full border-2 border-dashed border-[#e8e8e8] rounded-lg p-5 text-center hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition cursor-pointer flex flex-col items-center gap-2 disabled:opacity-50"
                    >
                      {isUploading
                        ? <><Loader2 className="w-7 h-7 text-[#e33b5f] animate-spin" /><p className="text-sm text-[#e33b5f]">Uploading...</p></>
                        : <><Upload className="w-7 h-7 text-[#9e9e9e]" /><p className="text-sm text-[#555353]">Click to upload <span className="text-[#e33b5f] font-medium">{docType.label}</span></p><p className="text-xs text-[#9e9e9e]">PDF, JPG, or PNG — max 10MB</p></>
                      }
                    </button>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={el => { fileRefs.current[docType.id] = el; }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleDocUpload(docType.id, f);
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })}

            {showKYCReview && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">KYC Under Review</p>
                  <p className="text-xs text-amber-700 mt-0.5">The compliance team is reviewing your documents. This typically takes 2–5 business days.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Section */}
      {showPayment && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#e33b5f]" /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStatus === 'Payment Pending' && (
              <div className="p-4 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg">
                <p className="text-sm font-semibold text-[#222] mb-1">Payment Required</p>
                <p className="text-sm text-[#555353]">
                  Please complete your partner fee payment via bank transfer and upload your receipt below.
                  You will receive the bank details via email.
                </p>
              </div>
            )}

            {currentStatus === 'Payment Pending' && !paymentUploaded && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#222]">Payment Reference / Transaction ID</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30"
                    placeholder="e.g. TXN-2024-00123"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#222]">Payment Receipt <span className="text-[#e33b5f]">*</span></label>
                  <button
                    onClick={() => paymentRef2.current?.click()}
                    className="mt-2 w-full border-2 border-dashed border-[#e8e8e8] rounded-lg p-5 text-center hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition cursor-pointer flex flex-col items-center gap-2"
                  >
                    {paymentFile
                      ? <><FileText className="w-7 h-7 text-[#e33b5f]" /><p className="text-sm text-[#e33b5f] font-medium">{paymentFile.name}</p><p className="text-xs text-[#9e9e9e]">{formatSize(paymentFile.size)}</p></>
                      : <><Upload className="w-7 h-7 text-[#9e9e9e]" /><p className="text-sm text-[#555353]">Upload payment receipt</p><p className="text-xs text-[#9e9e9e]">PDF, JPG, or PNG — max 10MB</p></>
                    }
                  </button>
                  <input type="file" className="hidden" ref={paymentRef2} accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setPaymentFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button
                  className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white w-full"
                  onClick={handlePaymentUpload}
                  disabled={!paymentFile || uploadingPay}
                >
                  {uploadingPay
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                    : <><Upload className="w-4 h-4 mr-2" />Submit Payment Receipt</>
                  }
                </Button>
              </div>
            )}

            {(paymentUploaded || currentStatus === 'Payment Receipt Submitted') && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Receipt Submitted — Awaiting Confirmation</p>
                  <p className="text-xs text-amber-700 mt-0.5">The team will confirm your payment within 1–3 business days.</p>
                </div>
              </div>
            )}

            {currentStatus === 'Payment Confirmed' && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Payment Confirmed</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your payment has been received and confirmed.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Welcome Pack */}
      {showWelcomePack && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-[#e33b5f]" /> Welcome Pack
            </CardTitle>
          </CardHeader>
          <CardContent>
            {welcomePackUrl ? (
              <div className="flex items-center justify-between p-4 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#e33b5f]" />
                  <div>
                    <p className="text-sm font-medium text-[#222]">1K Leaders Welcome Pack</p>
                    <p className="text-xs text-[#7e7e7e]">View-only — contains your partner agreement and platform guide</p>
                  </div>
                </div>
                <Button size="sm" className="bg-[#e33b5f] text-white" onClick={() => window.open(welcomePackUrl, '_blank')}>
                  <Download className="w-4 h-4 mr-1" /> Open
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">Your welcome pack will appear here once it has been shared by the team.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Awaiting round / ADGM */}
      {showAwaiting && (
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-6 text-center space-y-3">
            <Clock className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">{currentStatus}</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              {currentStatus === 'Awaiting 50-Person Round'
                ? 'Your file is complete and you will be officially registered once the current 50-person round is full.'
                : 'Your file has been submitted to ADGM for registration. This typically takes 2–4 weeks.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
