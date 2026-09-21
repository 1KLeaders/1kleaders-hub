'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, XCircle, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; }

type Envelope = {
  id: string;
  created_at: string;
  updated_at: string;
  envelope_id: string;
  user_id: string | null;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  sent:       { label: 'Sent — Awaiting Signature', color: 'bg-amber-100 text-amber-700',   icon: Clock },
  delivered:  { label: 'Delivered',                 color: 'bg-blue-100 text-blue-700',     icon: Clock },
  completed:  { label: 'Signed',                    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  declined:   { label: 'Declined',                  color: 'bg-red-100 text-red-700',       icon: XCircle },
  voided:     { label: 'Voided',                    color: 'bg-stone-100 text-stone-500',   icon: XCircle },
};


function EnvelopeRow({ env, viewing, onView }: { 
  env: any; viewing: string | null; onView: (id: string, status: string) => void; 
}) {
  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    sent:      'bg-blue-100 text-blue-700',
    delivered: 'bg-blue-100 text-blue-700',
    declined:  'bg-red-100 text-red-600',
    voided:    'bg-stone-100 text-stone-500',
  };
  return (
    <div className="flex items-center gap-3 p-3 border border-[#f0f0f0] rounded-xl bg-white hover:border-[#e33b5f]/20 transition">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#222] truncate">Partnership Agreement</p>
        <p className="text-xs text-[#9e9e9e]">
          {env.sent_at ? new Date(env.sent_at).toLocaleDateString() : '—'}
          {env.signed_at ? ` · Signed ${new Date(env.signed_at).toLocaleDateString()}` : ''}
        </p>
      </div>
      <Badge className={`text-[10px] flex-shrink-0 ${statusColors[env.status] ?? 'bg-stone-100 text-stone-500'}`}>
        {env.status}
      </Badge>
      <button onClick={() => onView(env.envelope_id, env.status)} disabled={viewing === env.envelope_id}
        className="flex-shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={viewing === env.envelope_id}>
          {viewing === env.envelope_id ? <Loader2 className="w-3 h-3 animate-spin" /> : env.status === 'completed' ? 'View PDF' : 'Sign'}
        </Button>
      </button>
    </div>
  );
}

export default function AgreementsPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [viewing,      setViewing]      = useState<string | null>(null);
  const [groupByShareholder, setGroupByShareholder] = useState(true);

  async function viewDocument(envelopeId: string, status: string) {
    setViewing(envelopeId);
    try {
      const res = await fetch(`/api/docusign/view?envelope_id=${envelopeId}`);

      // PDF is streamed directly for completed envelopes
      if (res.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        // Open inline in new tab
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }

      const data = await res.json();
      if (!res.ok) { alert(`Error (${res.status}): ${data.error ?? JSON.stringify(data)}`); return; }

      if (data.type === 'sign') {
        // Pending — open embedded signing
        window.open(data.url, '_blank');
      }
    } catch (e: any) {
      alert(`Failed to open document: ${e.message}`);
    }
    setViewing(null);
  }

  async function syncDocuSign() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/docusign/sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) setSyncMsg(`❌ ${data.error}`);
      else setSyncMsg(`✓ Synced ${data.synced} of ${data.total} envelopes`);
    } catch { setSyncMsg('❌ Sync failed'); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  }

  async function fetchEnvelopes() {
    if (!profile) return;
    setLoading(true);

    try {
      let query = supabase
        .from('docusign_envelopes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        // Match by user_id OR email (for older envelopes where user_id wasn't set)
        query = query.or(`user_id.eq.${profile.id},recipient_email.eq.${profile.email},recipient_email.ilike.${profile.email}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEnvelopes((data ?? []) as Envelope[]);
    } catch (e) {
      console.error('Failed to fetch envelopes:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Sync first to get latest statuses, then fetch from DB
    if (['admin','super-admin','developer'].includes(role ?? '')) {
      syncDocuSign().then(() => fetchEnvelopes());
    } else {
      fetchEnvelopes();
    }
  }, [profile]);

  const signed   = envelopes.filter(e => e.status === 'completed').length;
  const pending  = envelopes.filter(e => ['sent','delivered'].includes(e.status)).length;
  const declined = envelopes.filter(e => e.status === 'declined').length;

  // Group envelopes by recipient email for admin view
  const grouped = isAdmin && groupByShareholder
    ? envelopes.reduce((acc, env) => {
        const key = env.recipient_email || 'Unknown';
        if (!acc[key]) acc[key] = { name: env.recipient_name, email: key, envelopes: [] };
        acc[key].envelopes.push(env);
        return acc;
      }, {} as Record<string, { name: string; email: string; envelopes: typeof envelopes }>)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Agreements</h1>
          <p className="text-[#7e7e7e]">Track DocuSign partnership agreements</p>
          {syncMsg && <p className={`text-xs font-medium mt-1 ${syncMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{syncMsg}</p>}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setGroupByShareholder(v => !v)}>
              {groupByShareholder ? 'Flat View' : 'Group by Shareholder'}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={syncDocuSign} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync DocuSign'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={fetchEnvelopes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Signed',   value: signed,   color: 'text-emerald-600' },
          { label: 'Pending',  value: pending,  color: 'text-amber-600' },
          { label: 'Declined', value: declined, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
              <p className="text-xs text-[#7e7e7e]">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading agreements...
        </div>
      ) : envelopes.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <p className="text-sm text-[#7e7e7e]">
              {isAdmin
                ? 'No agreements sent yet. Use the Admin Dashboard to approve applicants and send agreements.'
                : 'Your partnership agreement will appear here once it has been sent by the 1K Leaders team.'}
            </p>
          </CardContent>
        </Card>
      ) : grouped ? (
        // Admin grouped view
        <div className="space-y-6">
          {Object.values(grouped).map(group => (
            <div key={group.email}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-xs font-bold text-[#e33b5f]">
                  {group.name?.[0] ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#222]">{group.name}</p>
                  <p className="text-xs text-[#9e9e9e]">{group.email}</p>
                </div>
                <span className="ml-auto text-xs text-[#9e9e9e]">{group.envelopes.length} agreement{group.envelopes.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2 pl-9">
                {group.envelopes.map(env => (
                  <EnvelopeRow key={env.envelope_id} env={env} viewing={viewing} onView={viewDocument} />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-[#9e9e9e] text-center py-8">No agreements found. Click Sync DocuSign to import.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(grouped ? [] : envelopes).map(env => {
            const cfg = statusConfig[env.status] ?? statusConfig.sent;
            const Icon = cfg.icon;
            return (
              <Card key={env.id} className="border-[#f0f0f0]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f6f6f6] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#e33b5f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[#222] text-sm">{env.recipient_name}</p>
                      <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#7e7e7e] mt-0.5">
                      {env.recipient_email} · Sent {env.sent_at ? new Date(env.sent_at).toLocaleDateString() : new Date(env.created_at).toLocaleDateString()}
                      {env.signed_at && ` · Signed ${new Date(env.signed_at).toLocaleDateString()}`}
                    </p>
                    <p className="text-[10px] text-[#9e9e9e] font-mono mt-0.5">{env.envelope_id}</p>
                  </div>
                  <button
                    onClick={() => viewDocument(env.envelope_id, env.status)}
                    disabled={viewing === env.envelope_id}
                    className="shrink-0"
                  >
                    <Button size="sm" variant="outline" className="h-8 text-xs" disabled={viewing === env.envelope_id}>
                      {viewing === env.envelope_id
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Opening...</>
                        : env.status === 'completed'
                          ? <><ExternalLink className="w-3.5 h-3.5 mr-1" />View PDF</>
                          : <><ExternalLink className="w-3.5 h-3.5 mr-1" />Sign</>
                      }
                    </Button>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isAdmin && envelopes.length === 0 && (
        <div className="p-4 bg-[#f6f6f6] rounded-lg border border-[#f0f0f0] text-sm text-[#7e7e7e]">
          Your partnership agreement will appear here once it has been sent by the 1K Leaders team.
        </div>
      )}
    </div>
  );
}
