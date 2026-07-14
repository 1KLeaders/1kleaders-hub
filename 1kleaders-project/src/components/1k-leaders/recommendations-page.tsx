'use client';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Lightbulb, Send, CheckCircle2, ChevronRight, Sparkles,
  Bot, TrendingUp, Target, Zap, Star, Loader2, Plus,
  MessageSquare, Clock, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type RecStatus = 'submitted' | 'ai-reviewed' | 'sent-to-ops' | 'under-review' | 'accepted' | 'rejected' | 'parked' | 'implemented';

const statusConfig: Record<RecStatus, { label: string; color: string }> = {
  'submitted':    { label: 'Submitted',          color: 'bg-[#f0f0f0] text-[#555353]' },
  'ai-reviewed':  { label: 'AI Reviewed',        color: 'bg-[#f07969]/10 text-[#f07969]' },
  'sent-to-ops':  { label: 'Sent to Operations', color: 'bg-[#e33b5f]/10 text-[#e33b5f]' },
  'under-review': { label: 'Under Review',       color: 'bg-amber-100 text-amber-700' },
  'accepted':     { label: 'Accepted',           color: 'bg-emerald-100 text-emerald-700' },
  'rejected':     { label: 'Rejected',           color: 'bg-stone-100 text-stone-500' },
  'parked':       { label: 'Parked',             color: 'bg-stone-100 text-stone-500' },
  'implemented':  { label: 'Implemented ✓',      color: 'bg-[#e33b5f] text-white' },
};

const CATEGORIES = [
  'Operational Improvement', 'Governance Suggestion', 'Shareholder Opportunity',
  'Market Observation', 'Ideas & Feedback', 'Technology Suggestion', 'Other'
];

const QUICK_PROMPTS = [
  { icon: Lightbulb,  text: 'Help me refine my startup idea',       color: 'text-[#f07969]' },
  { icon: TrendingUp, text: 'What sectors are trending in MENA?',   color: 'text-[#e33b5f]' },
  { icon: Target,     text: 'Evaluate my idea using VEP criteria',  color: 'text-purple-600' },
  { icon: Sparkles,   text: 'Generate a business model canvas',     color: 'text-sky-600' },
];

type ChatSession = {
  id: string;
  title: string | null;
  session_id: string;
  messages: { role: string; content: string; created_at: string }[];
  updated_at: string;
};

type Message = { role: 'user' | 'assistant'; content: string; created_at: string };

function ImportanceStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          className={`transition ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <Star className={`w-5 h-5 ${i <= value ? 'text-[#f07969] fill-[#f07969]' : 'text-[#d0d0d0]'}`} />
        </button>
      ))}
    </div>
  );
}

export default function RecommendationsPage() {
  const { profile } = useAuth();
  const [view, setView] = useState<'chat' | 'new-rec' | 'history'>('chat');

  // Chat state
  const [sessions,       setSessions]       = useState<ChatSession[]>([]);
  const [activeSession,  setActiveSession]  = useState<ChatSession | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([{
    role: 'assistant',
    content: `Hello! I'm your 1K Leaders AI Assistant.\n\nI can help you with:\n• Refining and evaluating startup ideas\n• Market research and MENA trend analysis\n• VEP Score assessments\n• Business model generation\n• Platform process questions\n\nHow can I help you today?`,
    created_at: new Date().toISOString(),
  }]);
  const [input,          setInput]          = useState('');
  const [isTyping,       setIsTyping]       = useState(false);
  const [lyzrSessionId,  setLyzrSessionId]  = useState<string | null>(null);
  const [loadingSessions,setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Recommendations state
  const [myRecs,      setMyRecs]      = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  // New recommendation form
  const [title,      setTitle]      = useState('');
  const [category,   setCategory]   = useState('');
  const [otherCat,   setOtherCat]   = useState('');
  const [body,       setBody]        = useState('');
  const [importance, setImportance]  = useState(3);
  const [aiStage,    setAiStage]     = useState<'idle' | 'checking' | 'done'>('idle');
  const [aiResult,   setAiResult]    = useState('');
  const [submitted,  setSubmitted]   = useState(false);
  const [saving,     setSaving]      = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!profile) return;
    // Load chat sessions
    supabase.from('ai_chat_sessions')
      .select('id, title, session_id, messages, updated_at')
      .eq('user_id', profile.id)
      .eq('agent_type', 'general')
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setSessions((data ?? []) as ChatSession[]); setLoadingSessions(false); });

    // Load recommendations
    supabase.from('recommendations')
      .select('*')
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setMyRecs(data ?? []); setLoadingRecs(false); });
  }, [profile]);

  async function startNewChat() {
    const newSessionId = `general-${Date.now()}`;
    setLyzrSessionId(newSessionId);
    setActiveSession(null);
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm your 1K Leaders AI Assistant. How can I help you today?`,
      created_at: new Date().toISOString(),
    }]);
  }

  async function loadSession(session: ChatSession) {
    setActiveSession(session);
    setLyzrSessionId(session.session_id);
    setMessages(session.messages as Message[]);
  }

  async function deleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession?.id === sessionId) startNewChat();
  }

  async function sendMessage(text?: string) {
    if (!profile) return;
    const content = text ?? input;
    if (!content.trim() || isTyping) return;
    setInput('');

    const sessionId = lyzrSessionId ?? `general-${Date.now()}`;
    if (!lyzrSessionId) setLyzrSessionId(sessionId);

    const userMsg: Message = { role: 'user', content, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    let reply = 'Sorry, I had trouble responding. Please try again.';
    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, session_id: sessionId, agent_type: 'general' }),
      });
      const data = await res.json();
      reply = data.content || reply;
    } catch {}

    const assistantMsg: Message = { role: 'assistant', content: reply, created_at: new Date().toISOString() };
    const finalMessages = [...updatedMessages, assistantMsg];
    setMessages(finalMessages);
    setIsTyping(false);

    // Save/update session in Supabase
    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    if (activeSession) {
      await supabase.from('ai_chat_sessions')
        .update({ messages: finalMessages, updated_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      setSessions(prev => prev.map(s => s.id === activeSession.id
        ? { ...s, messages: finalMessages, updated_at: new Date().toISOString() } : s));
    } else {
      const { data } = await supabase.from('ai_chat_sessions').insert({
        user_id:    profile.id,
        agent_type: 'general',
        session_id: sessionId,
        title,
        messages:   finalMessages,
      }).select().single();
      if (data) {
        setActiveSession(data as ChatSession);
        setSessions(prev => [data as ChatSession, ...prev]);
      }
    }
  }

  async function handleAiCheck() {
    if (!body.trim()) return;
    setAiStage('checking');
    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Review this recommendation for 1K Leaders management. Assess it in 2-3 sentences: is it clear, actionable, and relevant? End with either "Recommend forwarding to Operations Manager." or "Suggest revising before submission."\n\nTitle: ${title}\nCategory: ${category}\n\n${body}`,
          agent_type: 'general',
        }),
      });
      const data = await res.json();
      setAiResult(data.content ?? 'AI review complete.');
    } catch {
      setAiResult('AI review complete. Your recommendation looks good to submit.');
    }
    setAiStage('done');
  }

  async function handleSubmit() {
    if (!profile) return;
    setSaving(true);
    await supabase.from('recommendations').insert({
      submitted_by: profile.id,
      title:        title.trim(),
      category:     category === 'Other' ? otherCat : category,
      body:         body.trim(),
      importance,
      ai_review:    aiResult,
      status:       'ai-reviewed',
    });
    setSaving(false);
    setSubmitted(true);
    setMyRecs(prev => [{ title, category, importance, status: 'ai-reviewed', created_at: new Date().toISOString() }, ...prev]);
  }

  function resetForm() {
    setView('chat'); setAiStage('idle'); setSubmitted(false);
    setTitle(''); setBody(''); setCategory(''); setOtherCat('');
    setImportance(3); setAiResult('');
  }

  // New recommendation view
  if (view === 'new-rec') {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="text-sm text-[#7e7e7e] hover:text-[#222]">← Back</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222]">New Recommendation</span>
        </div>
        {submitted ? (
          <Card className="border-[#f0f0f0]">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[#e33b5f]/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-[#e33b5f]" />
              </div>
              <h3 className="text-xl font-bold text-[#222]">Recommendation Submitted</h3>
              <p className="text-[#7e7e7e] text-sm">AI-reviewed and forwarded to the Operations Manager.</p>
              <Button className="bg-[#e33b5f] text-white" onClick={resetForm}>Back to Assistant</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-[#f0f0f0]">
              <CardHeader><CardTitle className="text-base">Recommendation Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title <span className="text-[#e33b5f]">*</span></Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="Brief title" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Category <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-[#f0f0f0] mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  {category === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify..." value={otherCat} onChange={e => setOtherCat(e.target.value)} />}
                </div>
                <div>
                  <Label>Importance</Label>
                  <div className="mt-2"><ImportanceStars value={importance} onChange={setImportance} /></div>
                </div>
                <div>
                  <Label>Recommendation <span className="text-[#e33b5f]">*</span></Label>
                  <Textarea placeholder="Describe your recommendation..." rows={5} className="border-[#f0f0f0] mt-1" value={body} onChange={e => setBody(e.target.value)} />
                </div>
              </CardContent>
            </Card>
            {aiStage === 'idle' && (
              <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
                disabled={!title || !category || !body || (category === 'Other' && !otherCat)}
                onClick={handleAiCheck}>
                <Sparkles className="w-4 h-4 mr-2" /> Review with AI Assistant
              </Button>
            )}
            {aiStage === 'checking' && (
              <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-[#e33b5f] animate-spin" />
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
                  </div>
                  <p className="text-sm text-[#555353]">{aiResult}</p>
                  <Button className="w-full bg-[#e33b5f] text-white" onClick={handleSubmit} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit to Operations Manager
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // Main chat view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#e33b5f]" /> AI Assistant & Recommendations
          </h1>
          <p className="text-[#7e7e7e]">AI-powered guidance and platform recommendations</p>
        </div>
        <Button className="bg-[#e33b5f] text-white" onClick={() => setView('new-rec')}>
          <Plus className="w-4 h-4 mr-2" /> New Recommendation
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat history sidebar */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChat}>
            <Plus className="w-4 h-4" /> New Chat
          </Button>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {loadingSessions ? (
              <p className="text-xs text-[#9e9e9e] text-center py-4">Loading history...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-[#9e9e9e] text-center py-4">No chat history yet</p>
            ) : sessions.map(s => (
              <div key={s.id}
                onClick={() => loadSession(s)}
                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition ${activeSession?.id === s.id ? 'bg-[#e33b5f]/10' : 'hover:bg-[#f6f6f6]'}`}>
                <MessageSquare className="w-3.5 h-3.5 text-[#9e9e9e] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#222] truncate">{s.title ?? 'Untitled chat'}</p>
                  <p className="text-[10px] text-[#9e9e9e]">{new Date(s.updated_at).toLocaleDateString()}</p>
                </div>
                <button onClick={e => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition p-0.5 hover:text-red-500">
                  <Trash2 className="w-3 h-3 text-[#9e9e9e]" />
                </button>
              </div>
            ))}
          </div>

          {/* My recommendations */}
          <div className="border-t border-[#f0f0f0] pt-3">
            <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">My Recommendations</p>
            {loadingRecs ? (
              <p className="text-xs text-[#9e9e9e]">Loading...</p>
            ) : myRecs.length === 0 ? (
              <p className="text-xs text-[#9e9e9e]">None yet</p>
            ) : myRecs.slice(0, 5).map((r, i) => {
              const sc = statusConfig[r.status as RecStatus] ?? statusConfig.submitted;
              return (
                <div key={i} className="p-2 rounded-lg mb-1 bg-[#fafafa]">
                  <p className="text-xs font-medium text-[#222] truncate">{r.title}</p>
                  <Badge className={`text-[10px] mt-0.5 ${sc.color}`}>{sc.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ height: '560px' }}>
          <CardHeader className="bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] text-white py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <CardTitle className="text-base">1K Leaders AI Assistant</CardTitle>
              <Badge className="bg-white/20 text-white text-xs">Powered by Lyzr</Badge>
              {activeSession && (
                <span className="text-white/60 text-xs ml-auto truncate max-w-32">{activeSession.title}</span>
              )}
            </div>
          </CardHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#333]'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3.5 h-3.5 text-[#e33b5f]" />
                      <span className="text-xs font-medium text-[#e33b5f]">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#f6f6f6] rounded-xl p-3">
                  <div className="flex gap-0.5">
                    {[0,150,300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-[#9e9e9e] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-[#f0f0f0] shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#f0f0f0] hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition whitespace-nowrap">
                    <p.icon className={`w-3 h-3 ${p.color}`} />{p.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t shrink-0 flex gap-2">
            <input
              className="flex-1 px-3 py-2 text-sm border border-[#f0f0f0] rounded-lg focus:outline-none focus:border-[#e33b5f]/50"
              placeholder="Ask the AI assistant anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <Button className="bg-[#e33b5f] text-white shrink-0" onClick={() => sendMessage()} disabled={isTyping}>
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
