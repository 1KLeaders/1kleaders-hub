'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Bot, Send, Lightbulb, Sparkles, X, MessageSquare, TrendingUp, Target, ChevronRight } from 'lucide-react';

type Props = Record<string, never>;

const quickPrompts = [
  { icon: Lightbulb, text: 'Help me refine my startup idea', color: 'text-[#f07969]' },
  { icon: TrendingUp, text: 'What sectors are trending in MENA?', color: 'text-[#e33b5f]' },
  { icon: Target, text: 'Evaluate my idea feasibility', color: 'text-purple-600' },
  { icon: Sparkles, text: 'Generate a business model canvas', color: 'text-sky-600' },
];

const aiMessages = [
  { role: 'assistant', text: 'Hello! I\'m your AI Idea Assistant powered by 1K Leaders. I can help you with:\n\n• Refining and evaluating your startup ideas\n• Market research and trend analysis\n• Business model generation\n• Feasibility assessments\n• Connecting you with relevant partners\n\nHow can I help you today?' },
];

export default function AIAssistant({}: Props) {
  const [messages, setMessages] = useState(aiMessages);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responses: Record<string, string> = {
        default: 'Great question! Based on current market trends in the MENA region, I\'d recommend focusing on FinTech and HealthTech sectors. These areas have shown 40%+ growth in the past year. Would you like me to generate a detailed analysis for your specific idea?',
        idea: 'I\'d love to help refine your idea! Here are some key questions to consider:\n\n1. What specific problem does your idea solve?\n2. Who is your target audience?\n3. What makes your solution unique?\n4. What\'s your revenue model?\n\nShare more details and I\'ll provide a comprehensive evaluation with a feasibility score!',
        sector: 'Top trending sectors in MENA right now:\n\n🏆 FinTech - $2.3B investment in 2025\n🏥 HealthTech - 35% YoY growth\n🌱 CleanTech - Government-backed initiatives\n🤖 AI/SaaS - Fastest growing segment\n📦 E-Commerce - Logitech innovation hub\n\nWould you like a deep-dive into any of these?',
        evaluate: 'I\'ll evaluate your idea based on our VEP (Venture Evaluation Process) framework:\n\n📊 Market Size & Potential: Score /10\n💡 Innovation & Uniqueness: Score /10\n💰 Revenue Model Viability: Score /10\n👥 Team Capability: Score /10\n⚖️ Regulatory Feasibility: Score /10\n\nPlease describe your idea and I\'ll generate a preliminary score!',
        business: 'Here\'s your Business Model Canvas template:\n\n🔹 Value Proposition: [What you offer]\n🔹 Customer Segments: [Who you serve]\n🔹 Revenue Streams: [How you make money]\n🔹 Channels: [How you reach customers]\n🔹 Cost Structure: [Key costs]\n🔹 Key Partners: [Strategic allies]\n🔹 Key Activities: [What you must do]\n🔹 Key Resources: [What you need]\n🔹 Customer Relationships: [How you engage]\n\nFill in each section and I\'ll analyze the strength of your model!',
      };

      const inputLower = input.toLowerCase();
      let response = responses.default;
      if (inputLower.includes('idea') || inputLower.includes('refine')) response = responses.idea;
      else if (inputLower.includes('sector') || inputLower.includes('trend')) response = responses.sector;
      else if (inputLower.includes('evaluate') || inputLower.includes('feasib')) response = responses.evaluate;
      else if (inputLower.includes('business') || inputLower.includes('model')) response = responses.business;

      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#e33b5f]" /> AI Idea Assistant
        </h1>
        <p className="text-[#7e7e7e]">Get AI-powered guidance for your venture ideas</p>
      </div>

      {/* Feature Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Lightbulb, title: 'Idea Refinement', desc: 'Shape and improve your startup concept', color: 'bg-[#f07969]/5 text-[#f07969]' },
          { icon: TrendingUp, title: 'Market Analysis', desc: 'Real-time sector trends & insights', color: 'bg-[#e33b5f]/5 text-[#e33b5f]' },
          { icon: Target, title: 'Feasibility Score', desc: 'AI-powered venture evaluation', color: 'bg-purple-50 text-purple-600' },
          { icon: Sparkles, title: 'Business Model', desc: 'Generate complete business canvases', color: 'bg-sky-50 text-sky-600' },
        ].map(f => (
          <Card key={f.title} className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mx-auto mb-2`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#222]">{f.title}</h3>
              <p className="text-xs text-[#7e7e7e] mt-1">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chat Area */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#e33b5f] to-[#c02d4f] text-white py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <CardTitle className="text-base">1K Leaders AI Assistant</CardTitle>
              <Badge className="bg-white/20 text-white text-xs">Online</Badge>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="h-[400px] p-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#333]'}`}>
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
                    <span className="text-xs text-[#9e9e9e]">AI is typing...</span>
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

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-[#f0f0f0]">
          <p className="text-xs text-[#9e9e9e] mb-2">Quick prompts:</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => { setInput(p.text); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#f0f0f0] hover:border-[#e33b5f]/50 hover:bg-[#e33b5f]/5 transition whitespace-nowrap">
                <p.icon className={`w-3 h-3 ${p.color}`} />{p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input placeholder="Ask the AI assistant anything about your ideas..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={handleSend} disabled={isTyping}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
