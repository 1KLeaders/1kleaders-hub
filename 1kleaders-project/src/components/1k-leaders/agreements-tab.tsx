'use client';
// Agreements tab — lives inside the Documents page (replaces the old standalone Agreements page)
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, CheckCircle, Clock, XCircle, RefreshCw, Loader2, ExternalLink, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';
import { apiFetch } from '@/lib/api-fetch';

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
  voided_at: string | null;
  hidden: boolean | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  sent:       { label: 'Awaiting Signature', color: 'bg-amber-100 text-amber-700',     icon: Clock },
  delivered:  { label: 'Delivered',          color: 'bg-blue-100 text-blue-700',       icon: Clock },
  completed:  { label: 'Signed',             color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  declined:   { label: 'Declined',           color: 'bg-red-100 text-red-700',         icon: XCircle },
  voided:     { label: 'Voided',             color: 'bg-stone-100 text-stone-500',     icon: XCircle },
};

const SIGNABLE = ['sent', 'delivered'];

export default function AgreementsTab({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [envelopes,  setEnvelopes]  = useState<Envelope[]>([]);
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [viewing,    setViewing]    = useState<string | null>(null);
  const [grouped,    setGrouped]    = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [pendingHide, setPendingHide] = useState<Envelope | null>(null);

  const isRecipient = (env: Envelope) =>
    env.user_id === profile?.id || env.recipient_email?.toLowerCase() === profile?.email?.toLowerCase();

  async function viewDocument(envelopeId: string) {
    setViewing(envelopeId);
    try {
      const res = await apiFetch(`/api/docusign/view?envelope_id=${envelopeId}`);

      // PDF is streamed directly for completed envelopes
      if (res.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }

      const data = await res.json();
      if (!res.ok) { alert(`Error (${res.status}): ${data.error ?? JSON.stringify(data)}`); return; }
      if (data.type === 'sign') window.open(data.url, '_blank');
    } catch (e: any) {
      alert(`Failed to open document: ${e.message}`);
    } finally {
      setViewing(null);
    }
  }

  async function syncDocuSign() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await apiFetch('/api/docusign/sync', { method: 'POST' });
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
        query = query
          .or(`user_id.eq.${profile.id},recipient_email.ilike.${profile.email}`)
          .or('hidden.is.null,hidden.eq.false');
      }

      const { data, error } = await query;
      if (error) throw error;
      setEnvelopes((data ?? []) as Envelope[]);
    } catch (e) {
      console.error('Failed to fetch envelopes:', e);
    }
    setLoading(false);
  }

  async function setHidden(env: Envelope, hidden: boolean) {
    const res = await apiFetch('/api/docusign/hide', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ envelope_id: env.envelope_id, hidden }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Could not update agreement: ${d.error ?? res.status}`);
      return;
    }
    setEnvelopes(prev => prev.map(e => e.envelope_id === env.envelope_id ? { ...e, hidden } : e));
  }

  useEffect(() => {
    // Admins: sync first to get latest statuses, then fetch from DB
    if (isAdmin) syncDocuSign().then(() => fetchEnvelopes());
    else fetchEnvelopes();
  }, [profile?.id, isAdmin]);

  // Hidden agreements never reach non-admins; admins can reveal them with the toggle
  const hiddenCount = envelopes.filter(e => e.hidden).length;
  const visible = envelopes.filter(e => showHidden ? true : !e.hidden);

  const signed   = visible.filter(e => e.status === 'completed').length;
  const pending  = visible.filter(e => SIGNABLE.includes(e.status)).length;
  const declined = visible.filter(e => e.status === 'declined' || e.status === 'voided').length;

  const groups = isAdmin && grouped
    ? Object.values(visible.reduce((acc, env) => {
        const key = env.recipient_email || 'Unknown';
        if (!acc[key]) acc[key] = { name: env.recipient_name, email: key, envelopes: [] as Envelope[] };
        acc[key].envelopes.push(env);
        return acc;
      }, {} as Record<string, { name: string; email: string; envelopes: Envelope[] }>))
    : null;

  function ActionButton({ env }: { env: Envelope }) {
    const busy = viewing === env.envelope_id;
    if (env.status === 'completed') {
      return (
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy} onClick={() => viewDocument(env.envelope_id)}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ExternalLink className="w-3.5 h-3.5 mr-1" />View PDF</>}
        </Button>
      );
    }
    // Only the recipient can sign, and only while the envelope is still open
    if (SIGNABLE.includes(env.status) && isRecipient(env)) {
      return (
        <Button size="sm" className="h-8 text-xs bg-[#e33b5f] hover:bg-[#c02d4f] text-white" disabled={busy} onClick={() => viewDocument(env.envelope_id)}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ExternalLink className="w-3.5 h-3.5 mr-1" />Sign</>}
        </Button>
      );
    }
    return null;
  }

  function EnvelopeCard({ env, compact }: { env: Envelope; compact?: boolean }) {
    const cfg = statusConfig[env.status] ?? { label: env.status, color: 'bg-stone-100 text-stone-500', icon: FileText };
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center gap-3 p-3 border border-[#f0f0f0] rounded-xl bg-white hover:border-[#e33b5f]/20 transition ${env.hidden ? 'opacity-50' : ''}`}>
        {!compact && (
          <div className="w-10 h-10 rounded-xl bg-[#f6f6f6] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#e33b5f]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[#222] truncate">{compact ? 'Partnership Agreement' : env.recipient_name}</p>
            <Badge className={`text-[10px] flex items-center gap-1 ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</Badge>
            {env.hidden && <Badge className="text-[10px] bg-stone-100 text-stone-500">Hidden</Badge>}
          </div>
          <p className="text-xs text-[#9e9e9e] mt-0.5">
            {!compact && `${env.recipient_email} · `}
            Sent {env.sent_at ? new Date(env.sent_at).toLocaleDateString() : new Date(env.created_at).toLocaleDateString()}
            {env.signed_at && ` · Signed ${new Date(env.signed_at).toLocaleDateString()}`}
            {env.voided_at && ` · Voided ${new Date(env.voided_at).toLocaleDateString()}`}
          </p>
          {isAdmin && !compact && <p className="text-[10px] text-[#9e9e9e] font-mono mt-0.5">{env.envelope_id}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ActionButton env={env} />
          {isAdmin && (
            env.hidden ? (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#9e9e9e]" title="Unhide agreement" onClick={() => setHidden(env, false)}>
                <Eye className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#9e9e9e] hover:text-red-500" title="Hide agreement" onClick={() => setPendingHide(env)}>
                <EyeOff className="w-4 h-4" />
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-[#7e7e7e]">DocuSign partnership agreements</p>
          {syncMsg && <p className={`text-xs font-medium mt-1 ${syncMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{syncMsg}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && hiddenCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowHidden(v => !v)}>
              {showHidden ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setGrouped(v => !v)}>
              {grouped ? 'Flat View' : 'Group by Shareholder'}
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
          { label: 'Signed',            value: signed,   color: 'text-emerald-600' },
          { label: 'Pending',           value: pending,  color: 'text-amber-600' },
          { label: 'Declined / Voided', value: declined, color: 'text-red-600' },
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
      ) : visible.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <p className="text-sm text-[#7e7e7e]">
              {isAdmin
                ? 'No agreements yet. Click Sync DocuSign to import, or send one from the Admin Dashboard.'
                : 'Your partnership agreement will appear here once it has been sent by the 1K Leaders team.'}
            </p>
          </CardContent>
        </Card>
      ) : groups ? (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.email}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-xs font-bold text-[#e33b5f]">
                  {group.name?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#222] truncate">{group.name}</p>
                  <p className="text-xs text-[#9e9e9e] truncate">{group.email}</p>
                </div>
                <span className="ml-auto text-xs text-[#9e9e9e] shrink-0">{group.envelopes.length} agreement{group.envelopes.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2 sm:pl-9">
                {group.envelopes.map(env => <EnvelopeCard key={env.envelope_id} env={env} compact />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(env => <EnvelopeCard key={env.envelope_id} env={env} />)}
        </div>
      )}

      <AlertDialog open={!!pendingHide} onOpenChange={open => { if (!open) setPendingHide(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide this agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingHide?.recipient_name} ({pendingHide?.recipient_email}) will no longer see it, and it's removed from
              the admin list. It stays in DocuSign, and you can unhide it any time with "Show hidden".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (pendingHide) setHidden(pendingHide, true); setPendingHide(null); }}>
              Hide agreement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
