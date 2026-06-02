'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, CheckCircle, Save, Lock, Clock, Calendar, Bot, Sparkles, Send, Lightbulb, ArrowRight } from 'lucide-react';
import type { DashboardRole } from './types';

interface Props { role: DashboardRole; navigate: (page: string) => void; }

// Hackathon config - change dates to control access
const HACKATHON_START = new Date('2026-06-01T00:00:00');
const HACKATHON_END = new Date('2026-06-15T23:59:59');
const NEXT_HACKATHON_LABEL = 'June 1-15, 2026';

function isHackathonOpen(): boolean {
  const now = new Date();
  return now >= HACKATHON_START && now <= HACKATHON_END;
}

function isIdeaOwner(role: DashboardRole): boolean {
  return role === 'idea-owner';
}

// Countdown component
function Countdown({ target, label }: { target: Date; label: string }) {
  const [now, setNow] = useState(new Date());
  // Update every minute
  useState(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  });

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return <Badge className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm">Open Now!</Badge>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-[#f07969]">{days}d {hours}h</p>
      <p className="text-xs text-[#7e7e7e] mt-1">until {label}</p>
    </div>
  );
}

// Suggestion via AI bot
function SuggestionBot({ navigate }: { navigate: (page: string) => void }) {
  const [suggestion, setSuggestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [aiScore, setAiScore] = useState<{ score: number; feedback: string } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleSubmitSuggestion = () => {
    if (!suggestion.trim()) return;
    setEvaluating(true);
    setTimeout(() => {
      setAiScore({
        score: Math.floor(Math.random() * 3) + 7, // 7-9
        feedback: 'Interesting suggestion! Your concept shows strong potential in the target market. The AI assistant recommends refining the value proposition and exploring the revenue model further. Visit the AI Assistant for a deeper evaluation.',
      });
      setEvaluating(false);
      setSubmitted(true);
    }, 2000);
  };

  if (submitted && aiScore) {
    return (
      <Card className="border-emerald-200 bg-[#e33b5f]/5/30">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-[#e33b5f] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[#222] mb-2">Suggestion Evaluated!</h3>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e33b5f]/10 mb-3">
            <Sparkles className="w-5 h-5 text-[#e33b5f]" />
            <span className="text-xl font-bold text-[#c02d4f]">{aiScore.score}/10</span>
            <span className="text-sm text-[#e33b5f]">AI Score</span>
          </div>
          <p className="text-sm text-[#555353] mb-4 max-w-md mx-auto">{aiScore.feedback}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setSubmitted(false); setSuggestion(''); setAiScore(null); }}>Submit Another</Button>
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={() => navigate('ai-assistant')}>
              <Bot className="w-4 h-4 mr-1" /> Continue with AI Assistant
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-[#f07969]/5/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#f07969]" /> Submit a Suggestion Instead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[#555353]">Hackathon submission is currently closed, but you can still share your idea as a suggestion! Our AI bot will evaluate it and give you feedback.</p>
        <Textarea placeholder="Describe your idea or suggestion..." rows={4} value={suggestion} onChange={e => setSuggestion(e.target.value)} />
        <Button className="bg-[#f07969] hover:bg-[#E65F5C] w-full" onClick={handleSubmitSuggestion} disabled={!suggestion.trim() || evaluating}>
          {evaluating ? (
            <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> AI is evaluating...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Submit Suggestion for AI Evaluation</>
          )}
        </Button>
        {evaluating && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#7e7e7e]">
            <Bot className="w-4 h-4 animate-bounce" /> Our AI is analyzing your suggestion...
          </div>
        )}
        <Separator />
        <p className="text-xs text-[#9e9e9e] text-center">Want a deeper evaluation? <button onClick={() => navigate('ai-assistant')} className="text-[#e33b5f] font-medium hover:underline">Open AI Assistant</button></p>
      </CardContent>
    </Card>
  );
}

export default function IdeaSubmission({ role, navigate }: Props) {
  const [section, setSection] = useState(1);
  const sections = ['Basic Info', 'Problem & Solution', 'Market & Business', 'Team', 'Documents'];
  const progress = (section / sections.length) * 100;

  const isOwner = isIdeaOwner(role);
  const hackathonOpen = isHackathonOpen();
  const canSubmit = isOwner || hackathonOpen;

  // Idea Owner - always open
  if (isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Submit Your Idea</h1>
          <p className="text-[#7e7e7e]">Share your venture idea with our evaluation team.</p>
          <Badge className="mt-2 bg-[#e33b5f]/10 text-[#c02d4f]">💡 Idea Owner - Always Open</Badge>
        </div>

        <Progress value={progress} className="h-2" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((s, i) => (
            <button key={s} onClick={() => setSection(i + 1)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${section === i + 1 ? 'bg-[#e33b5f] text-white' : section > i + 1 ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
              {section > i + 1 && <CheckCircle className="w-3 h-3 inline mr-1" />}{s}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{sections[section - 1]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {section === 1 && (<>
              <div><Label>Idea Title</Label><Input placeholder="Give your idea a compelling name" /></div>
              <div><Label>Category</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{['FinTech', 'HealthTech', 'EdTech', 'PropTech', 'CleanTech', 'AgriTech', 'E-Commerce', 'SaaS', 'AI/ML'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Idea Description</Label><Textarea placeholder="Describe your idea in detail..." rows={4} /></div>
            </>)}
            {section === 2 && (<>
              <div><Label>Problem Statement</Label><Textarea placeholder="What problem does your idea solve?" rows={3} /></div>
              <div><Label>Proposed Solution</Label><Textarea placeholder="How does your idea solve this problem?" rows={3} /></div>
              <div><Label>Unique Value Proposition</Label><Input placeholder="What makes your solution unique?" /></div>
            </>)}
            {section === 3 && (<>
              <div><Label>Target Market</Label><Textarea placeholder="Who are your target customers?" rows={2} /></div>
              <div><Label>Business Model</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>{['SaaS Subscription', 'Marketplace', 'Freemium', 'Licensing', 'Direct Sales', 'Advertising'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Revenue Model</Label><Textarea placeholder="How will you generate revenue?" rows={2} /></div>
              <div><Label>Startup Stage</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>{['Idea Stage', 'Pre-Seed', 'Seed', 'Series A', 'Growth'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>)}
            {section === 4 && (<>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Founder Name</Label><Input placeholder="Your name" /></div>
                <div><Label>Role</Label><Input placeholder="e.g., CEO" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Co-Founder Name</Label><Input placeholder="Co-founder name" /></div>
                <div><Label>Co-Founder Role</Label><Input placeholder="e.g., CTO" /></div>
              </div>
              <div><Label>Team Description</Label><Textarea placeholder="Brief description of your team's expertise..." rows={2} /></div>
            </>)}
            {section === 5 && (<>
              <div><Label>Pitch Deck</Label>
                <div className="mt-2 border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-emerald-400 transition cursor-pointer">
                  <Upload className="w-10 h-10 text-[#9e9e9e] mx-auto mb-3" /><p className="text-sm text-[#555353] font-medium">Upload your pitch deck</p><p className="text-xs text-[#9e9e9e] mt-1">PDF, PPT or PPTX (max 20MB)</p>
                </div>
              </div>
              <div><Label>Additional Documents</Label>
                <div className="mt-2 border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-emerald-400 transition cursor-pointer">
                  <Upload className="w-6 h-6 text-[#9e9e9e] mx-auto mb-2" /><p className="text-sm text-[#7e7e7e]">Financial projections, market research, etc.</p>
                </div>
              </div>
            </>)}
            <div className="flex justify-between pt-4">
              {section > 1 ? <Button variant="outline" onClick={() => setSection(section - 1)}>Previous</Button> : <div />}
              <div className="flex gap-2">
                <Button variant="outline"><Save className="w-4 h-4 mr-2" /> Save Draft</Button>
                {section < 5 ? <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={() => setSection(section + 1)}>Next</Button> : <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]">Submit Idea</Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-Idea-Owner & Hackathon is OPEN
  if (hackathonOpen) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">🎯 Hackathon Idea Submission</h1>
          <p className="text-[#7e7e7e]">The hackathon is LIVE! Submit your idea now.</p>
          <Badge className="mt-2 bg-[#e33b5f]/10 text-[#c02d4f] animate-pulse">🔥 Hackathon Open - Limited Time!</Badge>
        </div>

        <Card className="border-emerald-200 bg-[#e33b5f]/5/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#e33b5f]" />
            <div>
              <p className="text-sm font-medium text-[#222]">Hackathon Period: {NEXT_HACKATHON_LABEL}</p>
              <p className="text-xs text-[#7e7e7e]">Submit your ideas before the hackathon closes!</p>
            </div>
          </CardContent>
        </Card>

        <Progress value={progress} className="h-2" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((s, i) => (
            <button key={s} onClick={() => setSection(i + 1)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${section === i + 1 ? 'bg-[#e33b5f] text-white' : section > i + 1 ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
              {section > i + 1 && <CheckCircle className="w-3 h-3 inline mr-1" />}{s}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{sections[section - 1]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {section === 1 && (<>
              <div><Label>Idea Title</Label><Input placeholder="Give your idea a compelling name" /></div>
              <div><Label>Category</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{['FinTech', 'HealthTech', 'EdTech', 'PropTech', 'CleanTech', 'AgriTech', 'E-Commerce', 'SaaS', 'AI/ML'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Idea Description</Label><Textarea placeholder="Describe your idea in detail..." rows={4} /></div>
            </>)}
            {section === 2 && (<>
              <div><Label>Problem Statement</Label><Textarea placeholder="What problem does your idea solve?" rows={3} /></div>
              <div><Label>Proposed Solution</Label><Textarea placeholder="How does your idea solve this problem?" rows={3} /></div>
              <div><Label>Unique Value Proposition</Label><Input placeholder="What makes your solution unique?" /></div>
            </>)}
            {section === 3 && (<>
              <div><Label>Target Market</Label><Textarea placeholder="Who are your target customers?" rows={2} /></div>
              <div><Label>Business Model</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>{['SaaS Subscription', 'Marketplace', 'Freemium', 'Licensing', 'Direct Sales', 'Advertising'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Revenue Model</Label><Textarea placeholder="How will you generate revenue?" rows={2} /></div>
              <div><Label>Startup Stage</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>{['Idea Stage', 'Pre-Seed', 'Seed', 'Series A', 'Growth'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>)}
            {section === 4 && (<>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Founder Name</Label><Input placeholder="Your name" /></div>
                <div><Label>Role</Label><Input placeholder="e.g., CEO" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Co-Founder Name</Label><Input placeholder="Co-founder name" /></div>
                <div><Label>Co-Founder Role</Label><Input placeholder="e.g., CTO" /></div>
              </div>
              <div><Label>Team Description</Label><Textarea placeholder="Brief description of your team's expertise..." rows={2} /></div>
            </>)}
            {section === 5 && (<>
              <div><Label>Pitch Deck</Label>
                <div className="mt-2 border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-emerald-400 transition cursor-pointer">
                  <Upload className="w-10 h-10 text-[#9e9e9e] mx-auto mb-3" /><p className="text-sm text-[#555353] font-medium">Upload your pitch deck</p><p className="text-xs text-[#9e9e9e] mt-1">PDF, PPT or PPTX (max 20MB)</p>
                </div>
              </div>
              <div><Label>Additional Documents</Label>
                <div className="mt-2 border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-emerald-400 transition cursor-pointer">
                  <Upload className="w-6 h-6 text-[#9e9e9e] mx-auto mb-2" /><p className="text-sm text-[#7e7e7e]">Financial projections, market research, etc.</p>
                </div>
              </div>
            </>)}
            <div className="flex justify-between pt-4">
              {section > 1 ? <Button variant="outline" onClick={() => setSection(section - 1)}>Previous</Button> : <div />}
              <div className="flex gap-2">
                <Button variant="outline"><Save className="w-4 h-4 mr-2" /> Save Draft</Button>
                {section < 5 ? <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={() => setSection(section + 1)}>Next</Button> : <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]">Submit Hackathon Idea</Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-Idea-Owner & Hackathon is CLOSED
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1>
        <p className="text-[#7e7e7e]">Submit your venture ideas during hackathon periods.</p>
      </div>

      {/* Hackathon Closed Card */}
      <Card className="border-amber-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f07969]/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#f07969]" />
          </div>
          <h2 className="text-xl font-bold text-[#222] mb-2">Hackathon Submissions Are Currently Closed</h2>
          <p className="text-[#7e7e7e] mb-6 max-w-md mx-auto">Idea submission is only available during hackathon periods. Idea Owners can submit anytime. The next hackathon is coming soon!</p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f07969]/5 border border-amber-200 mb-4">
            <Calendar className="w-5 h-5 text-[#f07969]" />
            <span className="font-semibold text-[#E65F5C]">Next Hackathon: {NEXT_HACKATHON_LABEL}</span>
          </div>

          <div className="mt-4">
            <Countdown target={HACKATHON_START} label="Hackathon Opens" />
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-center gap-2 text-sm text-[#7e7e7e] mb-4">
            <Lightbulb className="w-4 h-4 text-[#f07969]" />
            <span>💡 <strong>Idea Owners</strong> can submit ideas anytime — become one to get unrestricted access!</span>
          </div>
        </CardContent>
      </Card>

      {/* Hackathon Schedule Info */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-5 h-5 text-[#e33b5f]" /> Upcoming Hackathon Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { period: 'June 1-15, 2026', theme: 'MENA Innovation Challenge', status: 'Upcoming', statusColor: 'bg-[#f07969]/10 text-[#E65F5C]' },
              { period: 'August 5-20, 2026', theme: 'Sustainability & CleanTech Sprint', status: 'Planned', statusColor: 'bg-[#f6f6f6] text-[#555353]' },
              { period: 'October 10-25, 2026', theme: 'AI & Digital Transformation Hack', status: 'Planned', statusColor: 'bg-[#f6f6f6] text-[#555353]' },
            ].map(h => (
              <div key={h.period} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm text-[#222]">{h.theme}</p>
                  <p className="text-xs text-[#7e7e7e]">{h.period}</p>
                </div>
                <Badge className={`text-xs ${h.statusColor}`}>{h.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestion via AI Bot */}
      <SuggestionBot navigate={navigate} />
    </div>
  );
}
