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

export default function AgreementsPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading,   setLoading]   = useState(true);

  async function fetchEnvelopes() {
    if (!profile) return;
    setLoading(true);

    try {
      let query = supabase
        .from('docusign_envelopes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.or(`user_id.eq.${profile.id},recipient_email.eq.${profile.email}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEnvelopes((data ?? []) as Envelope[]);
    } catch (e) {
      console.error('Failed to fetch envelopes:', e);
    }
    setLoading(false);
  }

  useEffect(() => { fetchEnvelopes(); }, [profile]);

  const signed   = envelopes.filter(e => e.status === 'completed').length;
  const pending  = envelopes.filter(e => ['sent','delivered'].includes(e.status)).length;
  const declined = envelopes.filter(e => e.status === 'declined').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Agreements</h1>
          <p className="text-[#7e7e7e]">Track DocuSign partnership agreements</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchEnvelopes} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
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
      ) : (
        <div className="space-y-3">
          {envelopes.map(env => {
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
                  <a
                    href={`https://app.docusign.com/documents/details/${env.envelope_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </a>
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
