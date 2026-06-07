'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Send, CheckCircle2, Clock, Archive, ChevronRight, Sparkles, MessageSquare } from 'lucide-react';

type RecStatus = 'submitted' | 'ai-reviewed' | 'sent-to-ops' | 'under-review' | 'accepted' | 'rejected' | 'parked' | 'implemented';

const statusConfig: Record<RecStatus, { label: string; color: string }> = {
  'submitted':     { label: 'Submitted',                color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]' },
  'ai-reviewed':   { label: 'AI Reviewed',              color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20' },
  'sent-to-ops':   { label: 'Sent to Operations',       color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20' },
  'under-review':  { label: 'Under Review',             color: 'bg-[#E65F5C]/10 text-[#E65F5C] border-[#E65F5C]/20' },
  'accepted':      { label: 'Accepted',                 color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20' },
  'rejected':      { label: 'Rejected',                 color: 'bg-[#f0f0f0] text-[#9e9e9e] border-[#e8e8e8]' },
  'parked':        { label: 'Parked',                   color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]' },
  'implemented':   { label: 'Implemented',              color: 'bg-[#e33b5f] text-white border-[#e33b5f]' },
};

const categories = ['Operational Improvement', 'Governance Suggestion', 'Shareholder Opportunity', 'Market Observation', 'Ideas & Feedback', 'Technology Suggestion', 'Other'];

const myRecs = [
  { id: 1, title: 'Partner Mentorship Program', category: 'Operational Improvement', status: 'implemented' as RecStatus, date: 'Apr 2, 2026', aiNote: 'Clear, relevant, and actionable. No duplicates found.' },
  { id: 2, title: 'Quarterly In-Person Summit',  category: 'Partnership Opportunity',  status: 'accepted' as RecStatus,    date: 'Mar 15, 2026', aiNote: 'Relevant to company direction. Feasible. Sent to Operations Manager.' },
  { id: 3, title: 'MENA PropTech Sector Report',  category: 'Market Observation',        status: 'under-review' as RecStatus, date: 'May 10, 2026', aiNote: 'Good market insight. No similar reports on file.' },
];

export default function RecommendationsPage() {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [aiStage, setAiStage] = useState<'idle' | 'checking' | 'done'>('idle');
  const [aiResult, setAiResult] = useState('');
  const [finalSubmitted, setFinalSubmitted] = useState(false);

  const handleAiCheck = () => {
    if (!body.trim()) return;
    setAiStage('checking');
    setTimeout(() => {
      setAiResult('Your recommendation is clear and relevant to 1K Leaders operations. No duplicate submissions found. It does not require immediate governance review. Recommended for forwarding to the Operations Manager.');
      setAiStage('done');
    }, 1800);
  };

  const handleSubmit = () => setFinalSubmitted(true);

  if (view === 'new') {
    return (
      <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setAiStage('idle'); setFinalSubmitted(false); setTitle(''); setBody(''); setCategory(''); }}
            className="text-sm text-[#7e7e7e] hover:text-[#222] transition">← Back</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222]">New Recommendation</span>
        </div>

        {finalSubmitted ? (
          <Card className="border-[#f0f0f0]">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[#e33b5f]/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-[#e33b5f]" />
              </div>
              <h3 className="text-xl font-bold text-[#222]">Recommendation Submitted</h3>
              <p className="text-[#7e7e7e] text-sm">Your recommendation has been reviewed by AI and forwarded to the Operations Manager. You will be notified when there is an update.</p>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => { setView('list'); setFinalSubmitted(false); setTitle(''); setBody(''); setCategory(''); setAiStage('idle'); }}>
                Back to Recommendations
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-[#f0f0f0]">
              <CardHeader><CardTitle className="text-base text-[#222]">Recommendation Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#222]">Title <span className="text-[#e33b5f]">*</span></Label>
                  <Input placeholder="Brief title for your recommendation" className="border-[#f0f0f0] mt-1" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[#222]">Category <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-[#f0f0f0] mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#222]">Recommendation <span className="text-[#e33b5f]">*</span></Label>
                  <Textarea placeholder="Describe your recommendation in detail. What do you suggest, and why? What problem does it solve or opportunity does it address?" rows={6} className="border-[#f0f0f0] mt-1" value={body} onChange={e => setBody(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {aiStage === 'idle' && (
              <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white"
                disabled={!title || !category || !body}
                onClick={handleAiCheck}>
                <Sparkles className="w-4 h-4 mr-2" /> Review with AI Assistant
              </Button>
            )}

            {aiStage === 'checking' && (
              <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#e33b5f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#e33b5f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#e33b5f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-[#555353]">AI is reviewing your recommendation…</p>
                </CardContent>
              </Card>
            )}

            {aiStage === 'done' && (
              <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e33b5f]" />
                    <p className="text-sm font-semibold text-[#222]">AI Review Complete</p>
                    <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20 text-xs">AI Reviewed</Badge>
                  </div>
                  <p className="text-sm text-[#555353]">{aiResult}</p>
                  <Button className="w-full bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={handleSubmit}>
                    Submit to Operations Manager <Send className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-[#e33b5f]" /> Recommendations
          </h1>
          <p className="text-[#7e7e7e]">Submit suggestions, feedback, and ideas to the 1K Leaders team</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => setView('new')}>
          + New Recommendation
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-[#f0f0f0] bg-[#fbfbfb]">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-[#555353] uppercase tracking-wider mb-3">How It Works</p>
          <div className="flex flex-wrap gap-2 text-xs text-[#555353]">
            {['1. Submit your recommendation', '2. AI assistant reviews it', '3. Forwarded to Operations Manager', '4. You receive status updates'].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-[#f0f0f0] rounded-full px-3 py-1.5">
                <span>{s}</span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-[#d0d0d0]" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My submissions */}
      <Card className="border-[#f0f0f0]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-[#222]">My Recommendations</CardTitle>
          <Badge className="bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]">{myRecs.length} total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {myRecs.map(r => {
            const sc = statusConfig[r.status];
            return (
              <div key={r.id} className="p-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fbfbfb] transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-[#222] mb-1">{r.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#f0f0f0] text-[#555353] border-[#e8e8e8] text-xs">{r.category}</Badge>
                      <Badge className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                      <span className="text-xs text-[#9e9e9e]">{r.date}</span>
                    </div>
                    {r.aiNote && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Sparkles className="w-3 h-3 text-[#e33b5f] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7e7e7e]">{r.aiNote}</p>
                      </div>
                    )}
                  </div>
                  <MessageSquare className="w-4 h-4 text-[#d0d0d0] flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
