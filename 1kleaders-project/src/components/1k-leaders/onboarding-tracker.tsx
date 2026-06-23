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
    if (kycDocs[userId]) return;
    const { data } = await supabase
      .from('kyc_documents')
      .select('doc_type, status')
      .eq('user_id', userId);
    setKycDocs(prev => ({ ...prev, [userId]: (data ?? []) as KycDoc[] }));
  }

  async function updateStatus(userId: string, status: string) {
    setUpdating(userId);
    await supabase.from('profiles').update({
      onboarding_status: status,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    setPartners(prev => prev.map(p => p.id === userId ? { ...p, onboarding_status: status } : p));
    setUpdating(null);
  }

  async function updateDocStatus(userId: string, docType: string, status: string) {
    await supabase.from('kyc_documents').update({ status }).match({ user_id: userId, doc_type: docType });
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

  const filtered = partners.filter(p => {
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
          <p className="text-[#7e7e7e]">Manage partner progress through all 22 onboarding steps</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchPartners} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

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
                    {needsKyc && (
                      <div>
                        <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">KYC Documents</p>
                        {docs.length === 0 ? (
                          <p className="text-xs text-[#9e9e9e]">No documents uploaded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {docs.map(doc => (
                              <div key={doc.doc_type} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-[#444] capitalize">{doc.doc_type.replace(/-/g, ' ')}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`text-[10px] ${docStatusColor(doc.status)}`}>{doc.status}</Badge>
                                  {doc.status === 'submitted' || doc.status === 'under-review' ? (
                                    <div className="flex gap-1">
                                      <button onClick={() => updateDocStatus(p.id, doc.doc_type, 'approved')}
                                        className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition">✓</button>
                                      <button onClick={() => updateDocStatus(p.id, doc.doc_type, 'rejected')}
                                        className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">✗</button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment review */}
                    {needsPayment && (
                      <div>
                        <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Payment</p>
                        {p.onboarding_status === 'Payment Receipt Submitted' ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[#555353]">Receipt submitted — awaiting confirmation</p>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => updateStatus(p.id, 'Payment Confirmed')}>
                              Confirm Payment
                            </Button>
                          </div>
                        ) : p.onboarding_status === 'Payment Confirmed' ? (
                          <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Payment confirmed</p>
                        ) : (
                          <p className="text-xs text-[#9e9e9e]">Awaiting receipt from partner.</p>
                        )}
                      </div>
                    )}

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
