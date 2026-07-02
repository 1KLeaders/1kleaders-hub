'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Mail, MousePointer, CheckCircle, XCircle, TrendingUp, Users, Send, Plus, Loader2, RefreshCw, X, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type Newsletter = {
  id: string;
  created_at: string;
  sent_at: string | null;
  title: string;
  subject: string;
  status: string;
  recipient_count: number;
  opens?: number;
  clicks?: number;
};

type OpenRecord = {
  id: string;
  email: string | null;
  opened_at: string;
  clicked: boolean;
  profiles?: { first_name: string | null; last_name: string | null; role: string };
};

export default function NewsletterTracking() {
  const { profile } = useAuth();
  const [newsletters,    setNewsletters]    = useState<Newsletter[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedNl,     setSelectedNl]     = useState<string | null>(null);
  const [opens,          setOpens]          = useState<OpenRecord[]>([]);
  const [loadingOpens,   setLoadingOpens]   = useState(false);
  const [showCompose,    setShowCompose]     = useState(false);

  // Compose form
  const [composeTitle,   setComposeTitle]   = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody,    setComposeBody]    = useState('');
  const [sending,        setSending]        = useState(false);

  async function fetchNewsletters() {
    setLoading(true);
    const { data } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });
    setNewsletters((data ?? []) as Newsletter[]);
    setLoading(false);
  }

  useEffect(() => { fetchNewsletters(); }, []);

  async function fetchOpens(newsletterId: string) {
    setLoadingOpens(true);
    const { data } = await supabase
      .from('newsletter_opens')
      .select('*, profiles(first_name, last_name, role)')
      .eq('newsletter_id', newsletterId)
      .order('opened_at', { ascending: false });
    setOpens((data ?? []) as OpenRecord[]);
    setLoadingOpens(false);
  }

  async function sendNewsletter() {
    if (!profile || !composeTitle.trim() || !composeSubject.trim()) return;
    setSending(true);

    // Count recipients
    const { count: recipientCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['shareholder', 'user', 'admin', 'super-admin']);

    // Create newsletter record
    const { data } = await supabase.from('newsletters').insert({
      title:           composeTitle.trim(),
      subject:         composeSubject.trim(),
      body_html:       composeBody.trim(),
      status:          'sent',
      sent_at:         new Date().toISOString(),
      sent_by:         profile.id,
      recipient_count: recipientCount ?? 0,
    }).select().single();

    if (data) setNewsletters(prev => [data as Newsletter, ...prev]);

    // TODO: Trigger SendGrid send via /api/sendgrid/newsletter when configured
    setSending(false);
    setShowCompose(false);
    setComposeTitle(''); setComposeSubject(''); setComposeBody('');
  }

  const nl = newsletters.find(n => n.id === selectedNl);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#e33b5f]" /> Newsletter Tracking
          </h1>
          <p className="text-[#7e7e7e]">Send newsletters and track open rates</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchNewsletters} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-[#e33b5f] text-white" onClick={() => setShowCompose(v => !v)}>
            {showCompose ? <><X className="w-4 h-4 mr-1" />Cancel</> : <><Plus className="w-4 h-4 mr-1" />New Newsletter</>}
          </Button>
        </div>
      </div>

      {/* Compose panel */}
      {showCompose && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#e33b5f]">New Newsletter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Internal Title</Label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. May 2025 Monthly Update" value={composeTitle} onChange={e => setComposeTitle(e.target.value)} />
              </div>
              <div>
                <Label>Email Subject Line</Label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="What recipients see in their inbox" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Body (HTML or plain text)</Label>
              <textarea
                className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none font-mono"
                rows={8}
                placeholder="<h1>Hello,</h1><p>This month's update...</p>"
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
              />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Note:</strong> Actual email delivery requires SendGrid to be configured. This will log the newsletter and mark it as sent. Connect SendGrid via Settings to enable real email delivery.
            </div>
            <Button className="bg-[#e33b5f] text-white" onClick={sendNewsletter} disabled={sending || !composeTitle.trim() || !composeSubject.trim()}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Newsletter</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Opens detail view */}
      {selectedNl && nl && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{nl.title}</CardTitle>
                <p className="text-xs text-[#9e9e9e] mt-0.5">Subject: {nl.subject} · Sent {nl.sent_at ? new Date(nl.sent_at).toLocaleDateString() : '—'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNl(null)}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingOpens ? (
              <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading open data...
              </div>
            ) : opens.length === 0 ? (
              <p className="text-sm text-[#9e9e9e] text-center py-8">No open tracking data yet. Open tracking is recorded when recipients open the email.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2 bg-[#fbfbfb] text-xs font-medium text-[#7e7e7e] flex gap-8">
                  <span>Recipient</span>
                  <span className="ml-auto flex gap-6">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Opened</span>
                    <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" /> Clicked</span>
                  </span>
                </div>
                <div className="divide-y divide-[#f0f0f0] max-h-64 overflow-y-auto">
                  {opens.map(o => {
                    const name = o.profiles ? `${o.profiles.first_name ?? ''} ${o.profiles.last_name ?? ''}`.trim() : o.email ?? 'Unknown';
                    return (
                      <div key={o.id} className="flex items-center justify-between p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[8px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[#222]">{name}</span>
                          {o.profiles?.role && <Badge className="text-[10px] bg-[#f0f0f0] text-[#555353]">{o.profiles.role}</Badge>}
                        </div>
                        <div className="flex items-center gap-6">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {o.clicked ? <CheckCircle className="w-3.5 h-3.5 text-[#e33b5f]" /> : <XCircle className="w-3.5 h-3.5 text-[#d0d0d0]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Newsletter list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading newsletters...
        </div>
      ) : newsletters.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <Mail className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No newsletters sent yet</h3>
            <p className="text-sm text-[#7e7e7e]">Send your first newsletter using the button above. Open and click tracking will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {newsletters.map(nl => (
            <Card key={nl.id} className="border-[#f0f0f0]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#e33b5f]/5 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#e33b5f]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{nl.title}</CardTitle>
                      <p className="text-xs text-[#9e9e9e]">
                        {nl.sent_at ? `Sent: ${new Date(nl.sent_at).toLocaleDateString()}` : 'Draft'}
                        {nl.recipient_count > 0 && ` · ${nl.recipient_count} recipients`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={nl.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {nl.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedNl(nl.id); fetchOpens(nl.id); }}>
                      <Eye className="w-4 h-4 mr-1" /> View Opens
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-[#fbfbfb] rounded-lg">
                    <div className="text-lg font-bold text-[#222]">{nl.recipient_count}</div>
                    <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Recipients</div>
                  </div>
                  <div className="text-center p-2 bg-[#e33b5f]/5 rounded-lg">
                    <div className="text-lg font-bold text-[#c02d4f]">{nl.opens ?? 0}</div>
                    <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Opened</div>
                    {nl.recipient_count > 0 && <Progress value={((nl.opens ?? 0) / nl.recipient_count) * 100} className="h-1 mt-1" />}
                  </div>
                  <div className="text-center p-2 bg-[#f07969]/5 rounded-lg">
                    <div className="text-lg font-bold text-[#E65F5C]">{nl.clicks ?? 0}</div>
                    <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><MousePointer className="w-3 h-3" /> Clicked</div>
                    {nl.recipient_count > 0 && <Progress value={((nl.clicks ?? 0) / nl.recipient_count) * 100} className="h-1 mt-1" />}
                  </div>
                  <div className="text-center p-2 bg-[#fbfbfb] rounded-lg">
                    <div className="text-lg font-bold text-[#222]">
                      {nl.recipient_count > 0 ? `${Math.round(((nl.opens ?? 0) / nl.recipient_count) * 100)}%` : '—'}
                    </div>
                    <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Open Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
