'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Send, Loader2, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type BugReport = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  severity: string;
  page: string;
  status: string;
  reporter_email: string;
  reporter_name: string;
};

const severityColors: Record<string, string> = {
  low:      'bg-stone-100 text-stone-600',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function BugReportPage() {
  const { profile, role } = useAuth();
  const isDeveloper = role === 'developer';

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [severity,    setSeverity]    = useState('medium');
  const [page,        setPage]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Developer-only: view all reports
  const [reports,     setReports]     = useState<BugReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const fetchReports = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReports(data as BugReport[]);
    setLoadingReports(false);
  };

  useEffect(() => { if (isDeveloper) fetchReports(); }, [isDeveloper]);

  const updateBugStatus = async (id: string, status: string) => {
    await supabase.from('bug_reports').update({ status }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  async function handleSubmit() {
    setError(null);
    if (!title.trim() || !description.trim()) return setError('Title and description are required.');
    setSubmitting(true);
    const { error } = await supabase.from('bug_reports').insert({
      title:          title.trim(),
      description:    description.trim(),
      severity,
      page:           page.trim() || null,
      status:         'open',
      reporter_email: profile?.email ?? 'unknown',
      reporter_name:  `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Unknown',
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setTitle(''); setDescription(''); setPage(''); setSeverity('medium');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    if (isDeveloper) fetchReports();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e33b5f]/10 flex items-center justify-center">
          <Bug className="w-5 h-5 text-[#e33b5f]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Bug Report</h1>
          <p className="text-[#7e7e7e] text-sm">Report an issue with the platform</p>
        </div>
      </div>

      {/* Submit form */}
      <Card className="border-[#f0f0f0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submit a Bug Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title <span className="text-[#e33b5f]">*</span></Label>
            <Input className="mt-1 border-[#f0f0f0]" placeholder="Brief description of the bug" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Severity <span className="text-[#e33b5f]">*</span></Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low — minor visual issue</SelectItem>
                  <SelectItem value="medium">🟡 Medium — feature not working</SelectItem>
                  <SelectItem value="high">🟠 High — blocking a workflow</SelectItem>
                  <SelectItem value="critical">🔴 Critical — site is broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Page / Section</Label>
              <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Admin Dashboard, Calendar" value={page} onChange={e => setPage(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description <span className="text-[#e33b5f]">*</span></Label>
            <textarea
              className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none"
              rows={4}
              placeholder="Steps to reproduce, what you expected vs what happened..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {submitted && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <Check className="w-4 h-4" /> Bug report submitted — thanks!
            </div>
          )}
          <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Send className="w-4 h-4 mr-2" />Submit Report</>}
          </Button>
        </CardContent>
      </Card>

      {/* Developer-only: view all reports */}
      {isDeveloper && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="w-4 h-4 text-[#e33b5f]" /> All Reports
                <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] ml-1">{reports.filter(r => r.status === 'open').length} open</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={fetchReports} disabled={loadingReports} className="h-7 px-2">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 && !loadingReports && (
              <p className="text-sm text-[#9e9e9e] text-center py-6">No bug reports yet.</p>
            )}
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="border border-[#f0f0f0] rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#fafafa]"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <Badge className={`text-xs shrink-0 ${severityColors[r.severity] ?? 'bg-stone-100 text-stone-600'}`}>{r.severity}</Badge>
                    <p className="text-sm font-medium text-[#222] flex-1 truncate">{r.title}</p>
                    <span className="text-xs text-[#9e9e9e] shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                    <Badge className={`text-xs shrink-0 ${r.status === 'open' ? 'bg-amber-100 text-amber-700' : r.status === 'fixed' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                      {r.status}
                    </Badge>
                    {expanded === r.id ? <ChevronUp className="w-4 h-4 text-[#9e9e9e]" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e]" />}
                  </div>
                  {expanded === r.id && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#f0f0f0] bg-[#fafafa]">
                      <div className="grid sm:grid-cols-2 gap-2 text-xs text-[#7e7e7e]">
                        <span>Reporter: <strong className="text-[#444]">{r.reporter_name} ({r.reporter_email})</strong></span>
                        {r.page && <span>Page: <strong className="text-[#444]">{r.page}</strong></span>}
                      </div>
                      <p className="text-sm text-[#555353] whitespace-pre-wrap">{r.description}</p>
                      <div className="flex gap-2">
                        {['open', 'in-progress', 'fixed', 'wont-fix'].map(s => (
                          <Button key={s} size="sm" variant={r.status === s ? 'default' : 'outline'}
                            className={`h-7 text-xs ${r.status === s ? 'bg-[#e33b5f] text-white' : ''}`}
                            onClick={() => updateBugStatus(r.id, s)}>
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
