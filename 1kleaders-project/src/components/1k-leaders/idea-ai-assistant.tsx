'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  // Current form context passed in so AI can give relevant suggestions
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
}

type Message = { role: 'user' | 'assistant'; content: string };

const SECTION_PROMPTS: Record<number, string[]> = {
  1: ['Suggest a better name for my idea', 'What sector should I choose?', 'Help me write a tagline'],
  2: ['Help me articulate the problem', 'Is my solution clear?', 'How do I find my UVP?'],
  3: ['How big is my target market?', 'What revenue model fits best?', 'Estimate my MVP cost'],
  4: ['What should I include about my team?', 'I have no co-founder — is that OK?'],
  5: ['What goes in a Lean Canvas?', 'Tips for the founder video'],
  6: [],
};

const SYSTEM_PROMPT = `You are an AI assistant embedded in the 1K Leaders idea submission form. Your job is to help the user improve and refine their startup idea as they fill in the form.

You have access to their current form data and should give specific, actionable advice tailored to what they've written so far.

VEP Score framework (what the evaluation panel uses — hint toward this):
- Product/Service (0-25): Innovation, uniqueness, technical feasibility
- Market Opportunity (0-25): Market size, accessibility, timing  
- Competitive Advantage (0-25): Defensibility, moat, differentiation
- Business Model (0-25): Revenue credibility, sustainability, scalability

Guidelines:
- Be concise — 2-4 sentences max unless they ask for more
- Be specific to their idea, not generic
- Ask one clarifying question if their answer is vague
- Flag weak areas that VEP evaluators will scrutinise
- Don't be harsh — be a supportive advisor`;

export default function IdeaAIAssistant({ context }: Props) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);
  const [minimised,setMinimised]= useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Reset and greet when section changes
  useEffect(() => {
    if (!open) return;
    const greetings: Record<number, string> = {
      1: `I'm here to help with your idea's basic info. What's the core concept you're working with?`,
      2: `Let's sharpen your problem and solution. ${context.title ? `For "${context.title}" — ` : ''}what specific pain point are you solving?`,
      3: `Time to think about the market and business model. ${context.sector ? `In the ${context.sector} space, ` : ''}who exactly is your customer?`,
      4: `Tell me about your team. Evaluators care a lot about execution ability — what makes your team the right one to build this?`,
      5: `Almost there! Your Lean Canvas and founder video are required. Need help with either?`,
    };
    const greeting = greetings[context.currentSection ?? 1];
    if (greeting) {
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [context.currentSection, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function send(text?: string) {
    const content = text ?? input;
    if (!content.trim() || typing) return;
    setInput('');

    const contextSummary = [
      context.title && `Idea name: ${context.title}`,
      context.sector && `Sector: ${context.sector}`,
      context.problem && `Problem: ${context.problem}`,
      context.solution && `Solution: ${context.solution}`,
      context.targetMarket && `Target market: ${context.targetMarket}`,
      context.targetCustomer && `Target customer: ${context.targetCustomer}`,
      context.revModel && `Revenue model: ${context.revModel}`,
      context.currentSection && `Currently on section ${context.currentSection} of 6`,
    ].filter(Boolean).join('\n');

    const systemWithContext = contextSummary
      ? `${SYSTEM_PROMPT}\n\nCurrent form data:\n${contextSummary}`
      : SYSTEM_PROMPT;

    const userMsg: Message = { role: 'user', content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system:   systemWithContext,
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? 'Sorry, I had trouble responding.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setTyping(false);
  }

  const quickPrompts = SECTION_PROMPTS[context.currentSection ?? 1] ?? [];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">AI Idea Coach</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 shadow-2xl rounded-2xl overflow-hidden border border-[#f0f0f0] flex flex-col"
      style={{ maxHeight: minimised ? 'auto' : '480px' }}>

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
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white" style={{ minHeight: '200px', maxHeight: '300px' }}>
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-[#e33b5f]/30 mx-auto mb-2" />
                <p className="text-xs text-[#9e9e9e]">Ask me anything about your idea</p>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#333]'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-[#e33b5f]" />
                      <span className="text-[10px] font-medium text-[#e33b5f]">AI Coach</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                </div>
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

          {/* Quick prompts */}
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

          {/* Input */}
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
