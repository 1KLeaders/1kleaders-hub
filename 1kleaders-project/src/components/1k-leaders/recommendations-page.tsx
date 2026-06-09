'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Send, CheckCircle2, ChevronRight, Sparkles, MessageSquare, Bot, TrendingUp, Target, Zap, Star } from 'lucide-react';

type RecStatus = 'submitted' | 'ai-reviewed' | 'sent-to-ops' | 'under-review' | 'accepted' | 'rejected' | 'parked' | 'implemented';

const statusConfig: Record<RecStatus, { label: string; color: string }> = {
  'submitted':     { label: 'Submitted',             color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]' },
  'ai-reviewed':   { label: 'AI Reviewed',           color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20' },
  'sent-to-ops':   { label: 'Sent to Operations',    color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20' },
  'under-review':  { label: 'Under Review',          color: 'bg-[#E65F5C]/10 text-[#E65F5C] border-[#E65F5C]/20' },
  'accepted':      { label: 'Accepted',              color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20' },
  'rejected':      { label: 'Rejected',              color: 'bg-[#f0f0f0] text-[#9e9e9e] border-[#e8e8e8]' },
  'parked':        { label: 'Parked',                color: 'bg-[#f0f0f0] text-[#555353] border-[#e8e8e8]' },
  'implemented':   { label: 'Implemented',           color: 'bg-[#e33b5f] text-white border-[#e33b5f]' },
};

const categories = ['Operational Improvement', 'Governance Suggestion', 'Shareholder Opportunity', 'Market Observation', 'Ideas & Feedback', 'Technology Suggestion', 'Other'];

const myRecs = [
  { id: 1, title: 'Partner Mentorship Program', category: 'Operational Improvement', status: 'implemented' as RecStatus, date: 'Apr 2, 2026', importance: 5, aiNote: 'Clear, relevant, and actionable. No duplicates found.' },
  { id: 2, title: 'Quarterly In-Person Summit',  category: 'Partnership Opportunity',  status: 'accepted' as RecStatus,    date: 'Mar 15, 2026', importance: 4, aiNote: 'Relevant to company direction. Feasible. Sent to Operations Manager.' },
  { id: 3, title: 'MENA PropTech Sector Report',  category: 'Market Observation',       status: 'under-review' as RecStatus, date: 'May 10, 2026', importance: 3, aiNote: 'Good market insight. No similar reports on file.' },
];

const quickPrompts = [
  { icon: Lightbulb, text: 'Help me refine my startup idea', color: 'text-[#f07969]' },
  { icon: TrendingUp, text: 'What sectors are trending in MENA?', color: 'text-[#e33b5f]' },
  { icon: Target, text: 'Evaluate my idea feasibility', color: 'text-purple-600' },
  { icon: Sparkles, text: 'Generate a business model canvas', color: 'text-sky-600' },
];

const aiMessages = [
  { role: 'assistant', text: 'Hello! I\'m your AI Idea Assistant powered by 1K Leaders. I can help you with:\n\n• Refining and evaluating your startup ideas\n• Market research and trend analysis\n• Business model generation\n• Feasibility assessments\n• Connecting you with relevant shareholders\n\nHow can I help you today?' },
];

function ImportanceStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} className={`transition ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <Star className={`w-5 h-5 ${i <= value ? 'text-[#f07969] fill-[#f07969]' : 'text-[#d0d0d0]'}`} />
        </button>
      ))}
      <span className="text-xs text-[#9e9e9e] ml-1">
        {value === 1 ? 'Low' : value === 2 ? 'Minor' : value === 3 ? 'Moderate' : value === 4 ? 'Important' : 'Critical'}
      </span>
    </div>
  );
}

export default function RecommendationsPage() {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [body, setBody] = useState('');
  const [importance, setImportance] = useState(3);
  const [aiStage, setAiStage] = useState<'idle' | 'checking' | 'done'>('idle');
  const [aiResult, setAiResult] = useState('');
  const [finalSubmitted, setFinalSubmitted] = useState(false);

  // Chat state
  const [messages, setMessages] = useState(aiMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleAiCheck = () => {
    if (!body.trim()) return;
    setAiStage('checking');
    setTimeout(() => {
      setAiResult('Your recommendation is clear and relevant to 1K Leaders operations. No duplicate submissions found. It does not require immediate governance review. Recommended for forwarding to the Operations Manager.');
      setAiStage('done');
    }, 1800);
  };

  const handleSubmit = () => setFinalSubmitted(true);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const responses: Record<string, string> = {
        default: 'Great question! Based on current market trends in the MENA region, I\'d recommend focusing on FinTech and HealthTech sectors. These areas have shown 40%+ growth in the past year. Would you like me to generate a detailed analysis for your specific idea?',
        idea: 'I\'d love to help refine your idea! Here are some key questions to consider:\n\n1. What specific problem does your idea solve?\n2. Who is your target audience?\n3. What makes your solution unique?\n4. What\'s your revenue model?\n\nShare more details and I\'ll provide a comprehensive evaluation!',
        sector: 'Top trending sectors in MENA right now:\n\n🏆 FinTech - $2.3B investment in 2025\n🏥 HealthTech - 35% YoY growth\n🌱 CleanTech - Government-backed initiatives\n🤖 AI/SaaS - Fastest growing segment\n📦 E-Commerce - Logitech innovation hub\n\nWould you like a deep-dive into any of these?',
        evaluate: 'I\'ll evaluate your idea based on the VEP Score framework:\n\n📊 Product/Service: Score /25\n💡 Market Opportunity: Score /25\n💪 Competitive Advantage: Score /25\n💰 Business Model: Score /25\n\nPlease describe your idea and I\'ll generate a preliminary VEP Score!',
        business: 'Here\'s your Business Model Canvas template:\n\n🔹 Value Proposition: [What you offer]\n🔹 Customer Segments: [Who you serve]\n🔹 Revenue Streams: [How you make money]\n🔹 Channels: [How you reach customers]\n🔹 Cost Structure: [Key costs]\n🔹 Key Partners: [Strategic allies]\n🔹 Key Activities: [What you must do]\n🔹 Key Resources: [What you need]\n🔹 Customer Relationships: [How you engage]\n\nFill in each section and I\'ll analyze the strength of your model!',
      };
      const inputLower = input.toLowerCase();
      let response = responses.default;
      if (inputLower.includes('idea') || inputLower.includes('refine')) response = responses.idea;
      else if (inputLower.includes('sector') || inputLower.includes('trend')) response = responses.sector;
      else if (inputLower.includes('evaluate') || inputLower.includes('feasib') || inputLower.includes('vep')) response = responses.evaluate;
      else if (inputLower.includes('business') || inputLower.includes('model')) response = responses.business;
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      setIsTyping(false);
    }, 1500);
  };

  const resetForm = () => { setView('list'); setAiStage('idle'); setFinalSubmitted(false); setTitle(''); setBody(''); setCategory(''); setOtherCategory(''); setImportance(3); };

  if (view === 'new') {
    return (
      <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="text-sm text-[#7e7e7e] hover:text-[#222] transition">← Back</button>
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
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={resetForm}>Back to Recommendations</Button>
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
                  {category === 'Other' && (
                    <Input placeholder="Please specify your category..." className="border-[#f0f0f0] mt-2" value={otherCategory} onChange={e => setOtherCategory(e.target.value)} />
                  )}
                </div>
                <div>
                  <Label className="text-[#222]">Importance Rating <span className="text-[#e33b5f]">*</span></Label>
                  <p className="text-xs text-[#9e9e9e] mb-2">How important do you think this recommendation is?</p>
                  <ImportanceStars value={importance} onChange={setImportance} />
                </div>
                <div>
                  <Label className="text-[#222]">Recommendation <span className="text-[#e33b5f]">*</span></Label>
                  <Textarea placeholder="Describe your recommendation in detail. What do you suggest, and why? What problem does it solve or opportunity does it address?" rows={6} className="border-[#f0f0f0] mt-1" value={body} onChange={e => setBody(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {aiStage === 'idle' && (
              <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white"
                disabled={!title || !category || !body || (category === 'Other' && !otherCategory)}
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
            <Bot className="w-6 h-6 text-[#e33b5f]" /> AI Assistant & Recommendations
          </h1>
          <p className="text-[#7e7e7e]">Get AI-powered guidance and submit recommendations to the 1K Leaders team</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => setView('new')}>
          + New Recommendation
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: AI Chat */}
        <div className="space-y-4">
          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Lightbulb, title: 'Idea Refinement', desc: 'Shape and improve your startup concept', color: 'bg-[#f07969]/5 text-[#f07969]' },
              { icon: Target, title: 'VEP Score Analysis', desc: 'AI-powered venture evaluation', color: 'bg-purple-50 text-purple-600' },
              { icon: TrendingUp, title: 'Growth Opportunities', desc: 'Suggested partnerships & expansion', color: 'bg-sky-50 text-sky-600' },
              { icon: Sparkles, title: 'Recommendations', desc: 'AI-generated strategic recommendations', color: 'bg-[#e33b5f]/5 text-[#e33b5f]' },
            ].map(f => (
              <Card key={f.title} className="hover:shadow-md transition cursor-pointer">
                <CardContent className="p-3 text-center">
                  <div className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center mx-auto mb-2`}>
                    <f.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-[#222]">{f.title}</h3>
                  <p className="text-[10px] text-[#7e7e7e] mt-0.5">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chat */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] text-white py-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <CardTitle className="text-base">1K Leaders AI Assistant</CardTitle>
                <Badge className="bg-white/20 text-white text-xs">Online</Badge>
              </div>
            </CardHeader>

            <ScrollArea className="h-[320px] p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#333]'}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3.5 h-3.5 text-[#e33b5f]" />
                          <span className="text-xs font-medium text-[#e33b5f]">AI Assistant</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#f6f6f6] rounded-xl p-3">
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[#e33b5f]" />
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 bg-[#9e9e9e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-[#9e9e9e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-[#9e9e9e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-4 py-2 border-t border-[#f0f0f0]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => setInput(p.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#f0f0f0] hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition whitespace-nowrap">
                    <p.icon className={`w-3 h-3 ${p.color}`} />{p.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-[#f0f0f0] rounded-lg focus:outline-none focus:border-[#e33b5f]/50"
                placeholder="Ask the AI assistant anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={handleSend} disabled={isTyping}><Send className="w-4 h-4" /></Button>
            </div>
          </Card>
        </div>

        {/* Right: Recommendations */}
        <div className="space-y-4">
          <Card className="border-[#f0f0f0] bg-[#fbfbfb]">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[#555353] uppercase tracking-wider mb-3">How It Works</p>
              <div className="flex flex-col gap-2 text-xs text-[#555353]">
                {['1. Submit your recommendation', '2. AI assistant reviews it', '3. Forwarded to Operations Manager', '4. You receive status updates'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-[#f0f0f0] rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-[#e33b5f]/10 text-[#e33b5f] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                    <span>{s.replace(/^\d+\. /, '')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className="bg-[#f0f0f0] text-[#555353] border-[#e8e8e8] text-xs">{r.category}</Badge>
                          <Badge className={`text-xs border ${sc.color}`}>{sc.label}</Badge>
                          <span className="text-xs text-[#9e9e9e]">{r.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs text-[#9e9e9e] mr-1">Importance:</span>
                          <ImportanceStars value={r.importance} />
                        </div>
                        {r.aiNote && (
                          <div className="flex items-start gap-1.5">
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
      </div>
    </div>
  );
}
