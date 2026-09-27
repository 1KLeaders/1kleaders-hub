'use client';
// KYC tab — lives inside the Documents page. Shows kyc_documents (uploaded on the platform or imported from TypeForm).
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, RefreshCw, Search, CheckCircle, XCircle, Download, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole, Page } from './types';
import TypeformImport from './typeform-import';

interface Props { role?: DashboardRole; navigate?: (page: Page) => void; }

type KycDoc = {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  file_name: string | null;
  storage_path: string | null;
  uploaded_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  source?: string | null;
  answers?: Record<string, any> | null;
};

type Owner = { id: string; first_name: string | null; last_name: string | null; email: string };

const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
};

const STATUS_FILTERS = ['all', 'submitted', 'approved', 'rejected'];

const prettyType = (t: string) => t.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function KycDocumentsTab({ role, navigate }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [docs,    setDocs]    = useState<KycDoc[]>([]);
  const [owners,  setOwners]  = useState<Record<string, Owner>>({});
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');
  const [busyId,  setBusyId]  = useState<string | null>(null);

  async function fetchDocs() {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from('kyc_documents').select('*').order('created_at', { ascending: false });
    if (!isAdmin) query = query.eq('user_id', profile.id);
    const { data } = await query;
    const rows = (data ?? []) as KycDoc[];
    setDocs(rows);

    if (isAdmin) {
      const ids = [...new Set(rows.map(r => r.user_id))];
      if (ids.length) {
        const { data: people } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', ids);
        setOwners(Object.fromEntries((people ?? []).map(p => [p.id, p as Owner])));
      }
    }
    setLoading(false);
  }

  useEffect(() => { fetchDocs(); }, [profile?.id, isAdmin]);

  async function openDoc(doc: KycDoc) {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert(`Could not open file: ${error?.message ?? 'unknown error'}`);
  }

  async function review(doc: KycDoc, newStatus: 'approved' | 'rejected') {
    let reason: string | null = null;
    if (newStatus === 'rejected') {
      reason = window.prompt('Reason for rejection (shown to the user):') ?? null;
      if (reason === null) return;
    }
    setBusyId(doc.id);
    const { error } = await supabase.from('kyc_documents')
      .update({ status: newStatus, rejection_reason: reason })
      .eq('id', doc.id);
    setBusyId(null);
    if (error) return alert(`Update failed: ${error.message}`);
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus, rejection_reason: reason } : d));
  }

  const ownerName = (id: string) => {
    const o = owners[id];
    return o ? (`${o.first_name ?? ''} ${o.last_name ?? ''}`.trim() || o.email) : 'Unknown user';
  };

  const filtered = docs.filter(d => {
    if (status !== 'all' && (status === 'submitted' ? !['submitted', 'pending'].includes(d.status) : d.status !== status)) return false;
    if (!search) return true;
    const hay = `${prettyType(d.doc_type)} ${d.file_name ?? ''} ${isAdmin ? `${ownerName(d.user_id)} ${owners[d.user_id]?.email ?? ''}` : ''}`;
    return hay.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[#7e7e7e]">
          {isAdmin ? 'KYC documents from all members, including those imported from TypeForm' : 'Your submitted KYC documents'}
        </p>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && <TypeformImport onImported={fetchDocs} />}
          {!isAdmin && navigate && (
            <Button size="sm" className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => navigate('onboarding')}>
              <ShieldCheck className="w-4 h-4 mr-2" />Upload KYC
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={fetchDocs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
          <Input className="pl-9" placeholder={isAdmin ? 'Search by member or document...' : 'Search documents...'}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition ${status === s ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
              {s === 'submitted' ? 'Awaiting review' : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading KYC documents...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-8 text-center">
            <FileText className="w-10 h-10 text-[#9e9e9e] mx-auto mb-2" />
            <p className="text-sm text-[#7e7e7e]">No KYC documents found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 border border-[#f0f0f0] rounded-xl bg-white flex-wrap sm:flex-nowrap">
              <div className="w-10 h-10 rounded-xl bg-[#f6f6f6] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#e33b5f]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[#222]">{prettyType(doc.doc_type)}</p>
                  <Badge className={`text-[10px] capitalize ${STATUS_STYLE[doc.status] ?? 'bg-stone-100 text-stone-500'}`}>
                    {doc.status === 'submitted' ? 'awaiting review' : doc.status}
                  </Badge>
                  {doc.source === 'typeform' && <Badge variant="outline" className="text-[10px]">TypeForm import</Badge>}
                </div>
                <p className="text-xs text-[#9e9e9e] truncate">
                  {isAdmin && <span className="text-[#555353] font-medium">{ownerName(doc.user_id)} · </span>}
                  {doc.file_name ?? 'No file'} · {new Date(doc.uploaded_at ?? doc.created_at).toLocaleDateString()}
                </p>
                {doc.status === 'rejected' && doc.rejection_reason && (
                  <p className="text-xs text-red-600 mt-0.5">Reason: {doc.rejection_reason}</p>
                )}
                {doc.answers && Object.keys(doc.answers).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-[#e33b5f] cursor-pointer">View answers ({Object.keys(doc.answers).length})</summary>
                    <dl className="mt-1.5 space-y-1">
                      {Object.entries(doc.answers).map(([q, a]) => (
                        <div key={q} className="text-xs grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3">
                          <dt className="text-[#9e9e9e] break-words">{q}</dt>
                          <dd className="text-[#222] break-words">{Array.isArray(a) ? a.join(', ') : String(a ?? '—')}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {doc.storage_path && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDoc(doc)}>
                    <Download className="w-3.5 h-3.5 mr-1" />View
                  </Button>
                )}
                {isAdmin && doc.status !== 'approved' && (
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={busyId === doc.id} onClick={() => review(doc, 'approved')}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                  </Button>
                )}
                {isAdmin && doc.status !== 'rejected' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 hover:bg-red-50"
                    disabled={busyId === doc.id} onClick={() => review(doc, 'rejected')}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
