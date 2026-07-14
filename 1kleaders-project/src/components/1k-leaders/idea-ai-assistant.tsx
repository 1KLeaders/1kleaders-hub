'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props {
  context: {
    title?: string;
    sector?: string;
    problem?: string;
    solution?: string;
    targetMarket?: string;
    targetCustomer?: string;
    revModel?: string;
    currentSection?: number;
  };
  onApplyField?: (field: string, value: string) => void;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  suggestions?: { field: string; value: string; label: string }[];
};

const SECTION_PROMPTS: Record<number, string[]> = {
  1: ['Suggest a better name', 'Help me write a tagline', 'What sector fits best?'],
  2: ['Help me articulate the problem', 'Sharpen my solution description', 'What is my UVP?'],
  3: ['How big is my target market?', 'What revenue model fits?', 'Estimate MVP cost'],
  4: ['What should I say about my team?', 'I have no co-founder — is that OK?'],
  5: ['What goes in a Lean Canvas?', 'Tips for my founder video'],
  6: [],
};

const FIELD_MAP: Record<string, string> = {
  title: 'title', tagline: 'tagline', problem: 'problem',
  solution: 'solution', targetMarket: 'targetMarket',
  targetCustomer: 'targetCustomer',
};

export default function IdeaAIAssistant({ context, onApplyField }: Props) {
  const { profile } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [typing,    setTyping]    = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Greet when section changes
  useEffect(() => {
    if (!open) return;
    const greetings: Record<number, string> = {
      1: `Let's work on your basic info. What's the core concept you're working with?`,
      2: `Now let's sharpen the problem and solution.${context.title ? ` For "${context.title}" — ` : ' '}what specific pain point are you solving?`,
      3: `Time to think about market and business model.${context.sector ? ` In the ${context.sector} space, ` : ' '}who exactly is your customer?`,
      4: `Tell me about your founding team. Evaluators care a lot about execution ability.`,
      5: `Your Lean Canvas and founder video are required. Need tips on either?`,
    };
    const greeting = greetings[context.currentSection ?? 1];
    if (greeting && (messages.length === 0 || messages[messages.length - 1]?.role === 'user')) {
      const lyzrId = `idea-${Date.now()}`;
      setSessionId(lyzrId);
      setMessages([{ role: 'assistant', content: greeting, created_at: new Date().toISOString() }]);
    }
  }, [context.currentSection, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Parse AI response for field suggestions
  function parseSuggestions(content: string): { field: string; value: string; label: string }[] {
    const suggestions: { field: string; value: string; label: string }[] = [];
    // Look for patterns like: "Suggested title: X" or "Try: X" 
    const patterns = [
      { regex: /suggested?\s+(?:idea\s+)?name[:\s]+"([^"]+)"/i,   field: 'title',         label: 'Apply as title' },
      { regex: /suggested?\s+tagline[:\s]+"([^"]+)"/i,             field: 'tagline',       label: 'Apply as tagline' },
      { regex: /suggested?\s+problem[:\s]+"([^"]+)"/i,             field: 'problem',       label: 'Apply to problem' },
      { regex: /suggested?\s+solution[:\s]+"([^"]+)"/i,            field: 'solution',      label: 'Apply to solution' },
      { regex: /target\s+customer[:\s]+"([^"]+)"/i,                field: 'targetCustomer',label: 'Apply to target customer' },
    ];
    for (const p of patterns) {
      const m = content.match(p.regex);
      if (m?.[1]) suggestions.push({ field: p.field, value: m[1], label: p.label });
    }
    return suggestions;
  }

  async function send(text?: string) {
    if (!profile) return;
    const content = text ?? input;
    if (!content.trim() || typing) return;
    setInput('');

    const sid = sessionId ?? `idea-${Date.now()}`;
    if (!sessionId) setSessionId(sid);

    // Build context summary for the message
    const ctx = [
      context.title && `Idea: ${context.title}`,
      context.sector && `Sector: ${context.sector}`,
      context.problem && `Problem: ${context.problem}`,
      context.solution && `Solution: ${context.solution}`,
      context.targetMarket && `Market: ${context.targetMarket}`,
      context.targetCustomer && `Customer: ${context.targetCustomer}`,
      context.revModel && `Revenue: ${context.revModel}`,
      `Currently on section ${context.currentSection ?? 1} of the submission form`,
    ].filter(Boolean).join('. ');

    const messageWithContext = ctx
      ? `[Form context: ${ctx}]\n\nUser says: ${content}`
      : content;

    const userMsg: Message = { role: 'user', content, created_at: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setTyping(true);

    let reply = 'Sorry, I had trouble responding. Please try again.';
    let suggestions: { field: string; value: string; label: string }[] = [];

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    messageWithContext,
          session_id: sid,
          agent_type: 'idea',
        }),
      });
      const data = await res.json();
      reply = data.content || reply;
      suggestions = parseSuggestions(reply);
    } catch {}

    const assistantMsg: Message = {
      role: 'assistant', content: reply,
      created_at: new Date().toISOString(),
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
    const finalMessages = [...updated, assistantMsg];
    setMessages(finalMessages);
    setTyping(false);

    // Persist to Supabase
    if (dbSessionId) {
      await supabase.from('ai_chat_sessions')
        .update({ messages: finalMessages, updated_at: new Date().toISOString() })
        .eq('id', dbSessionId);
    } else {
      const { data } = await supabase.from('ai_chat_sessions').insert({
        user_id:    profile.id,
        agent_type: 'idea',
        session_id: sid,
        title:      content.slice(0, 50),
        messages:   finalMessages,
        idea_id:    null,
      }).select('id').single();
      if (data) setDbSessionId(data.id);
    }
  }

  const quickPrompts = SECTION_PROMPTS[context.currentSection ?? 1] ?? [];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">AI Idea Coach</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 shadow-2xl rounded-2xl overflow-hidden border border-[#f0f0f0] flex flex-col bg-white"
      style={{ maxHeight: minimised ? 'auto' : '500px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-white" />
          <p className="text-sm font-semibold text-white">AI Idea Coach</p>
          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">
            Section {context.currentSection ?? 1}/6
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimised(m => !m)} className="text-white/70 hover:text-white p-1">
            {minimised ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimised && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: '200px', maxHeight: '320px' }}>
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-[#e33b5f]/30 mx-auto mb-2" />
                <p className="text-xs text-[#9e9e9e]">Ask me anything about your idea</p>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#333]'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-[#e33b5f]" />
                      <span className="text-[10px] font-medium text-[#e33b5f]">AI Coach</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                </div>
                {/* Auto-fill suggestion buttons */}
                {m.suggestions?.map((s, si) => (
                  <button key={si}
                    onClick={() => onApplyField?.(s.field, s.value)}
                    className="mt-1 flex items-center gap-1.5 text-[10px] px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full hover:bg-emerald-100 transition">
                    <Zap className="w-2.5 h-2.5" /> {s.label}
                  </button>
                ))}
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-[#f6f6f6] rounded-xl px-3 py-2">
                  <div className="flex gap-0.5">
                    {[0,150,300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-[#9e9e9e] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {quickPrompts.length > 0 && messages.length <= 1 && (
            <div className="bg-[#fafafa] border-t border-[#f0f0f0] px-3 py-2 flex flex-wrap gap-1.5">
              {quickPrompts.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="text-[10px] px-2 py-1 rounded-full border border-[#e8e8e8] text-[#555353] hover:border-[#e33b5f] hover:text-[#e33b5f] transition bg-white">
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border-t border-[#f0f0f0] p-2 flex gap-2 flex-shrink-0">
            <input
              className="flex-1 text-xs px-3 py-2 border border-[#f0f0f0] rounded-lg focus:outline-none focus:border-[#e33b5f]/50"
              placeholder="Ask about your idea..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <Button size="sm" className="bg-[#e33b5f] text-white h-8 w-8 p-0 flex-shrink-0" onClick={() => send()} disabled={typing}>
              {typing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
