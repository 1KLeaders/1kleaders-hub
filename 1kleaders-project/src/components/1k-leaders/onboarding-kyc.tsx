'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Upload, Check, ArrowLeft, FileText, AlertCircle, Clock, CheckCircle2, ChevronRight, CreditCard, Package } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

type OnboardingStatus =
  | 'platform-access'
  | 'kyc-pending'
  | 'kyc-submitted'
  | 'kyc-under-review'
  | 'kyc-approved'
  | 'payment-pending'
  | 'payment-submitted'
  | 'payment-confirmed'
  | 'welcome-pack'
  | 'ops-review'
  | 'awaiting-round'
  | 'registered';

const statusConfig: Record<OnboardingStatus, { label: string; color: string; icon: any }> = {
  'platform-access':   { label: 'Platform Access Issued',        color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20',   icon: CheckCircle2 },
  'kyc-pending':       { label: 'KYC Pending',                   color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]',         icon: Clock },
  'kyc-submitted':     { label: 'KYC Submitted',                 color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',   icon: Upload },
  'kyc-under-review':  { label: 'KYC Under Review',              color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20',   icon: Clock },
  'kyc-approved':      { label: 'KYC Approved',                  color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',   icon: CheckCircle2 },
  'payment-pending':   { label: 'Payment Pending',               color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]',         icon: Clock },
  'payment-submitted': { label: 'Payment Receipt Submitted',     color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',   icon: Upload },
  'payment-confirmed': { label: 'Payment Confirmed',             color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',   icon: CheckCircle2 },
  'welcome-pack':      { label: 'Welcome Pack Shared',           color: 'bg-[#E65F5C]/10 text-[#E65F5C] border-[#E65F5C]/20',   icon: Package },
  'ops-review':        { label: 'Pending Operations Review',     color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20',   icon: Clock },
  'awaiting-round':    { label: 'Awaiting Round Completion',     color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',   icon: Clock },
  'registered':        { label: 'Officially Registered Shareholder', color: 'bg-[#e33b5f] text-white border-[#e33b5f]',              icon: CheckCircle2 },
};

// Simulate current user being in KYC pending state
const DEMO_STATUS: OnboardingStatus = 'kyc-pending';

type UploadState = 'idle' | 'uploaded';
interface DocUpload { state: UploadState; filename?: string; }

function UploadBox({ label, required, doc, onChange }: {
  label: string; required?: boolean; doc: DocUpload; onChange: (d: DocUpload) => void;
}) {
  const handleClick = () => {
    // Simulate file pick
    onChange({ state: 'uploaded', filename: `${label.replace(/\s+/g, '_')}_document.pdf` });
  };
  return (
    <div>
      <Label className="text-[#222] font-medium text-sm">{label}{required && <span className="text-[#e33b5f] ml-1">*</span>}</Label>
      {doc.state === 'uploaded' ? (
        <div className="mt-2 flex items-center gap-3 p-3 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-[#e33b5f] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#222] truncate">{doc.filename}</p>
            <p className="text-xs text-[#7e7e7e]">Uploaded successfully</p>
          </div>
          <button onClick={() => onChange({ state: 'idle' })} className="text-xs text-[#9e9e9e] hover:text-[#e33b5f] transition">Remove</button>
        </div>
      ) : (
        <button onClick={handleClick}
          className="mt-2 w-full border-2 border-dashed border-[#e8e8e8] rounded-lg p-5 text-center hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-7 h-7 text-[#9e9e9e]" />
          <p className="text-sm text-[#555353]">Click to upload <span className="text-[#e33b5f] font-medium">{label}</span></p>
          <p className="text-xs text-[#9e9e9e]">PDF, JPG, or PNG — max 10MB</p>
        </button>
      )}
    </div>
  );
}

export default function OnboardingKYC({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState<'status' | 'kyc' | 'payment'>('status');
  const [status] = useState<OnboardingStatus>(DEMO_STATUS);
  const [kycStep, setKycStep] = useState(1);

  // KYC document upload states — 5 required docs per spec
  const [docs, setDocs] = useState<Record<string, DocUpload>>({
    claraKyc:     { state: 'idle' },
    passport:     { state: 'idle' },
    nationalId:   { state: 'idle' },
    cv:           { state: 'idle' },
    proofAddress: { state: 'idle' },
  });
  const [paymentDoc, setPaymentDoc] = useState<DocUpload>({ state: 'idle' });
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const updateDoc = (key: string) => (d: DocUpload) => setDocs(prev => ({ ...prev, [key]: d }));
  const allDocsUploaded = Object.values(docs).every(d => d.state === 'uploaded');

  const kycSteps = ['Personal Details', 'KYC Documents', 'Review & Submit'];

  // Onboarding journey steps for the status tracker
  const journeySteps: { key: OnboardingStatus; label: string; desc: string }[] = [
    { key: 'platform-access',   label: 'Platform Access',      desc: 'Temporary login credentials issued' },
    { key: 'kyc-pending',       label: 'KYC Upload',           desc: 'Upload required identity documents' },
    { key: 'kyc-submitted',     label: 'KYC Under Review',     desc: 'Admin reviewing your documents' },
    { key: 'kyc-approved',      label: 'KYC Approved',         desc: 'Identity verified successfully' },
    { key: 'payment-pending',   label: 'Payment',              desc: 'Upload investment payment receipt' },
    { key: 'payment-confirmed', label: 'Payment Confirmed',    desc: 'Funds received by company' },
    { key: 'welcome-pack',      label: 'Welcome Pack',         desc: 'Onboarding documents shared' },
    { key: 'awaiting-round',    label: 'Awaiting Round',       desc: 'Pending 50-shareholder round completion' },
    { key: 'registered',        label: 'ADGM Registered',      desc: 'Officially registered shareholder' },
  ];

  const statusOrder = journeySteps.map(s => s.key);
  const currentIndex = statusOrder.indexOf(status);

  const sc = statusConfig[status];
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div>
        <h1 className="text-2xl font-bold text-[#222]">KYC & Onboarding</h1>
        <p className="text-[#7e7e7e]">Complete your onboarding to activate your shareholder account</p>
      </div>

      {/* Current Status Banner */}
      <Card className="border-[#f0f0f0]">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.color.split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
            <StatusIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#7e7e7e] uppercase tracking-wider mb-1">Current Onboarding Status</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`text-xs font-semibold border ${sc.color}`}>{sc.label}</Badge>
            </div>
            {status === 'kyc-pending' && (
              <p className="text-sm text-[#555353] mt-1.5">Please upload all required KYC documents to proceed with your onboarding.</p>
            )}
            {status === 'awaiting-round' && (
              <p className="text-sm text-[#555353] mt-1.5">Your onboarding file is complete. You are currently in the approved shareholder pipeline awaiting completion of the current shareholder round before official ADGM registration.</p>
            )}
          </div>
          {(status === 'kyc-pending') && (
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white flex-shrink-0" onClick={() => setActiveTab('kyc')}>
              Upload KYC <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {(status === 'payment-pending') && (
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white flex-shrink-0" onClick={() => setActiveTab('payment')}>
              Upload Receipt <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#f6f6f6] p-1 rounded-lg w-fit">
        {([
          { key: 'status',  label: 'Onboarding Journey' },
          { key: 'kyc',     label: 'KYC Documents' },
          { key: 'payment', label: 'Payment' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === t.key ? 'bg-white text-[#222] shadow-sm' : 'text-[#7e7e7e] hover:text-[#222]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Onboarding Journey Tab */}
      {activeTab === 'status' && (
        <Card className="border-[#f0f0f0]">
          <CardHeader>
            <CardTitle className="text-base text-[#222]">Shareholder Onboarding Journey</CardTitle>
            <p className="text-sm text-[#7e7e7e]">Track your progress through the onboarding process</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {journeySteps.map((step, i) => {
                const isDone = i < currentIndex;
                const isCurrent = i === currentIndex;
                const isLocked = i > currentIndex;
                return (
                  <div key={step.key} className="flex gap-4 pb-6 last:pb-0 relative">
                    {i < journeySteps.length - 1 && (
                      <div className={`absolute left-[19px] top-10 w-0.5 h-full ${isDone ? 'bg-[#e33b5f]' : 'bg-[#f0f0f0]'}`} />
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                      isDone    ? 'bg-[#e33b5f] border-[#e33b5f]' :
                      isCurrent ? 'bg-white border-[#e33b5f]' :
                                  'bg-white border-[#e8e8e8]'
                    }`}>
                      {isDone ? <Check className="w-5 h-5 text-white" /> :
                       isCurrent ? <div className="w-3 h-3 bg-[#e33b5f] rounded-full animate-pulse" /> :
                                   <div className="w-3 h-3 bg-[#d0d0d0] rounded-full" />}
                    </div>
                    <div className={`pt-1.5 ${isLocked ? 'opacity-40' : ''}`}>
                      <p className={`text-sm font-semibold ${isCurrent ? 'text-[#e33b5f]' : isDone ? 'text-[#222]' : 'text-[#555353]'}`}>{step.label}</p>
                      <p className="text-xs text-[#7e7e7e] mt-0.5">{step.desc}</p>
                      {isCurrent && status === 'kyc-pending' && (
                        <button onClick={() => setActiveTab('kyc')}
                          className="mt-2 text-xs font-medium text-[#e33b5f] hover:text-[#c02d4f] flex items-center gap-1">
                          Upload documents now <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC Documents Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            {kycSteps.map((s, i) => (
              <div key={s} className="flex items-center">
                <button onClick={() => setKycStep(i + 1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${kycStep === i + 1 ? 'bg-[#e33b5f] text-white' : kycStep > i + 1 ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                  {kycStep > i + 1 && <Check className="w-3 h-3" />}{s}
                </button>
                {i < kycSteps.length - 1 && <ChevronRight className="w-4 h-4 text-[#d0d0d0] mx-1" />}
              </div>
            ))}
          </div>

          <Card className="border-[#f0f0f0]">
            <CardContent className="p-6 space-y-5">
              {kycStep === 1 && (
                <>
                  <p className="text-sm text-[#7e7e7e] bg-[#f6f6f6] rounded-lg p-3">
                    Please ensure all details match your official identity documents.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label className="text-[#222]">Full Legal Name <span className="text-[#e33b5f]">*</span></Label><Input placeholder="As shown on passport" className="border-[#f0f0f0]" /></div>
                    <div><Label className="text-[#222]">Date of Birth <span className="text-[#e33b5f]">*</span></Label><Input type="date" className="border-[#f0f0f0]" /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label className="text-[#222]">Nationality <span className="text-[#e33b5f]">*</span></Label><Input placeholder="e.g. Saudi Arabian" className="border-[#f0f0f0]" /></div>
                    <div><Label className="text-[#222]">Phone Number <span className="text-[#e33b5f]">*</span></Label><Input placeholder="+966 5x xxx xxxx" className="border-[#f0f0f0]" /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label className="text-[#222]">Passport Number</Label><Input placeholder="Enter passport number" className="border-[#f0f0f0]" /></div>
                    <div><Label className="text-[#222]">National ID Number</Label><Input placeholder="Enter national ID number" className="border-[#f0f0f0]" /></div>
                  </div>
                  <Separator className="bg-[#f0f0f0]" />
                  <div><Label className="text-[#222]">Residential Address <span className="text-[#e33b5f]">*</span></Label><Input placeholder="Full street address" className="border-[#f0f0f0] mt-1" /></div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><Label className="text-[#222]">City</Label><Input placeholder="City" className="border-[#f0f0f0]" /></div>
                    <div><Label className="text-[#222]">Country</Label><Input placeholder="Country" className="border-[#f0f0f0]" /></div>
                    <div><Label className="text-[#222]">Postal Code</Label><Input placeholder="Postal code" className="border-[#f0f0f0]" /></div>
                  </div>
                </>
              )}

              {kycStep === 2 && (
                <>
                  <div className="flex items-start gap-3 p-3 bg-[#f07969]/5 border border-[#f07969]/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-[#f07969] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#444]">All 5 documents are required</p>
                      <p className="text-xs text-[#7e7e7e] mt-0.5">Documents must be clear, valid, and not expired. Accepted formats: PDF, JPG, PNG (max 10MB each).</p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <UploadBox required label="Clara KYC Form"    doc={docs.claraKyc}     onChange={updateDoc('claraKyc')} />
                    <UploadBox required label="Passport Copy"     doc={docs.passport}     onChange={updateDoc('passport')} />
                    <UploadBox required label="National ID Copy"  doc={docs.nationalId}   onChange={updateDoc('nationalId')} />
                    <UploadBox required label="CV / Resume"       doc={docs.cv}           onChange={updateDoc('cv')} />
                    <UploadBox required label="Proof of Address"  doc={docs.proofAddress} onChange={updateDoc('proofAddress')} />
                  </div>
                  {!allDocsUploaded && (
                    <p className="text-xs text-[#f07969] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Please upload all required documents before proceeding.
                    </p>
                  )}
                </>
              )}

              {kycStep === 3 && (
                <>
                  <p className="text-sm font-medium text-[#222]">Please review your submission before sending to the admin for review.</p>
                  <div className="rounded-lg border border-[#f0f0f0] overflow-hidden">
                    <div className="bg-[#f6f6f6] px-4 py-2 border-b border-[#f0f0f0]">
                      <p className="text-xs font-semibold text-[#555353] uppercase tracking-wider">Required Documents</p>
                    </div>
                    {[
                      { key: 'claraKyc',     label: 'Clara KYC Form' },
                      { key: 'passport',     label: 'Passport Copy' },
                      { key: 'nationalId',   label: 'National ID Copy' },
                      { key: 'cv',           label: 'CV / Resume' },
                      { key: 'proofAddress', label: 'Proof of Address' },
                    ].map(d => (
                      <div key={d.key} className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0] last:border-0">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[#9e9e9e]" />
                          <span className="text-sm text-[#333]">{d.label}</span>
                        </div>
                        {docs[d.key].state === 'uploaded' ? (
                          <span className="flex items-center gap-1 text-xs text-[#e33b5f] font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Uploaded</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[#f07969]"><AlertCircle className="w-3.5 h-3.5" /> Missing</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!allDocsUploaded && (
                    <div className="p-3 bg-[#f07969]/5 border border-[#f07969]/20 rounded-lg text-sm text-[#f07969]">
                      Some required documents are still missing. Please go back and upload all documents.
                    </div>
                  )}
                  {allDocsUploaded && !kycSubmitted && (
                    <div className="p-3 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg text-sm text-[#444]">
                      All documents are ready. Click Submit to send your KYC to the admin for review. You will be notified once it has been reviewed.
                    </div>
                  )}
                  {kycSubmitted && (
                    <div className="p-4 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#e33b5f] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#222]">KYC Submitted Successfully</p>
                        <p className="text-xs text-[#7e7e7e] mt-0.5">Your documents are under admin review. You will receive a platform notification and email once reviewed.</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between pt-2">
                {kycStep > 1 ? (
                  <Button variant="outline" onClick={() => setKycStep(kycStep - 1)} className="border-[#f0f0f0]">Previous</Button>
                ) : <div />}
                {kycStep < 3 ? (
                  <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white"
                    disabled={kycStep === 2 && !allDocsUploaded}
                    onClick={() => setKycStep(kycStep + 1)}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  !kycSubmitted && (
                    <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white"
                      disabled={!allDocsUploaded}
                      onClick={() => setKycSubmitted(true)}>
                      Submit KYC Documents <Check className="w-4 h-4 ml-1" />
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <Card className="border-[#f0f0f0]">
          <CardHeader>
            <CardTitle className="text-base text-[#222] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#e33b5f]" /> Payment Receipt Upload
            </CardTitle>
            <p className="text-sm text-[#7e7e7e]">Upload proof of your investment payment after transferring funds to the company account.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 bg-[#f6f6f6] rounded-lg space-y-2">
              <p className="text-sm font-semibold text-[#222]">Bank Transfer Details</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-[#7e7e7e]">Beneficiary:</span> <span className="font-medium text-[#222]">1KL Holdings Limited</span></div>
                <div><span className="text-[#7e7e7e]">Bank:</span> <span className="font-medium text-[#222]">ADGM Banking Shareholder</span></div>
                <div><span className="text-[#7e7e7e]">Reference:</span> <span className="font-medium text-[#e33b5f]">Your Platform Username</span></div>
                <div><span className="text-[#7e7e7e]">Contact:</span> <span className="font-medium text-[#222]">info@1kleaders.com</span></div>
              </div>
            </div>
            <UploadBox label="Payment Receipt / Bank Transfer Confirmation" doc={paymentDoc} onChange={setPaymentDoc} required />
            {paymentDoc.state === 'uploaded' && !paymentSubmitted && (
              <Button className="w-full bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => setPaymentSubmitted(true)}>
                Submit Payment Receipt <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
            {paymentSubmitted && (
              <div className="p-4 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#e33b5f] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#222]">Receipt Submitted</p>
                  <p className="text-xs text-[#7e7e7e] mt-0.5">Admin will confirm once funds are received in the company bank account. You will receive a platform notification and email when payment is confirmed.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
