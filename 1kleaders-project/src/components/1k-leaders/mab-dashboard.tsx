'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Shield, Star, ChevronRight, FileText, Video, BarChart3,
  CheckCircle, XCircle, Clock, MessageSquare, TrendingUp, Users,
} from 'lucide-react';

type Decision = 'feasibility' | 'more-info' | 'park' | 'reject' | 'interview' | 'merge' | null;

const ideas = [
  {
    id: 1,
    title: 'AI-Powered Legal Document Assistant',
    founder: 'Sara Al-Mansoori',
    initials: 'SM',
    sector: 'LegalTech',
    vepScore: 82,
    vepRanking: 1,
    vepRecommendation: 'Move to MAB',
    vepSummary: 'Strong problem-solution fit with clear market need. Founders have relevant legal tech background. Revenue model is well-defined. Main risk is regulatory compliance across GCC jurisdictions.',
    strengths: ['Clear market gap', 'Experienced founder', 'Scalable SaaS model'],
    risks: ['Regulatory complexity', 'Competition from global players'],
    status: 'Under MAB Evaluation',
    submittedDate: '12 May 2026',
  },
  {
    id: 2,
    title: 'Smart Agricultural Drone Network',
    founder: 'Khalid Al-Farsi',
    initials: 'KF',
    sector: 'AgriTech',
    vepScore: 76,
    vepRanking: 2,
    vepRecommendation: 'Move to MAB',
    vepSummary: 'Novel application of drone tech for GCC agricultural challenges. MVP cost is high but defensible. Co-founder with hardware engineering background strengthens execution credibility.',
    strengths: ['Hardware moat', 'Government alignment', 'Co-founder expertise'],
    risks: ['High MVP cost ($180K)', 'Regulatory approvals for drones'],
    status: 'Under MAB Evaluation',
    submittedDate: '10 May 2026',
  },
  {
    id: 3,
    title: 'B2B Marketplace for Healthcare Procurement',
    founder: 'Nour Khalil',
    initials: 'NK',
    sector: 'HealthTech',
    vepScore: 69,
    vepRanking: 3,
    vepRecommendation: 'Request more info',
    vepSummary: 'Solid market opportunity but business model needs clarification. Founders have healthcare operations experience. Co-founder commitment is unclear.',
    strengths: ['Large TAM', 'Founder domain expertise'],
    risks: ['Unclear co-founder commitment', 'Complex procurement regulations'],
    status: 'Under MAB Evaluation',
    submittedDate: '9 May 2026',
  },
];

const decisionLabels: Record<NonNullable<Decision>, { label: string; color: string }> = {
  'feasibility': { label: 'Move to Feasibility Study', color: 'bg-[#e33b5f] hover:bg-[#c02d4f] text-white' },
  'more-info': { label: 'Request More Information', color: 'bg-[#f07969] hover:bg-[#d96858] text-white' },
  'park': { label: 'Park for Later', color: 'bg-[#9e9e9e] hover:bg-[#7e7e7e] text-white' },
  'reject': { label: 'Reject', color: 'bg-[#444] hover:bg-[#222] text-white' },
  'interview': { label: 'Invite to Interview', color: 'bg-[#E65F5C] hover:bg-[#c04a47] text-white' },
  'merge': { label: 'Merge with Another Opportunity', color: 'bg-[#555353] hover:bg-[#333] text-white' },
};

export default function MABDashboard() {
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  const idea = ideas.find(i => i.id === selectedIdea);

  const handleSubmit = (id: number) => {
    if (!decisions[id]) return;
    setSubmitted(prev => ({ ...prev, [id]: true }));
  };

  if (selectedIdea && idea) {
    const decision = decisions[idea.id] ?? null;
    const isSubmitted = submitted[idea.id];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedIdea(null)} className="text-[#7e7e7e] hover:text-[#222] transition text-sm flex items-center gap-1">
            ← Back to MAB Queue
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#222]">{idea.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">{idea.sector}</Badge>
              <Badge variant="outline">{idea.status}</Badge>
              <span className="text-sm text-[#7e7e7e]">Submitted {idea.submittedDate}</span>
            </div>
          </div>
          {isSubmitted && (
            <Badge className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm px-3 py-1">
              <CheckCircle className="w-4 h-4 mr-1" /> Evaluation Submitted
            </Badge>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Founder */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-[#e33b5f]" /> Founder</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] font-bold">{idea.initials}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium text-[#222]">{idea.founder}</p>
                    <p className="text-sm text-[#7e7e7e]">{idea.sector} · Cohort 1</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VEP Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#e33b5f]" /> VEP Evaluation Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#7e7e7e]">VEP Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={idea.vepScore} className="w-32 h-2" />
                    <span className="font-bold text-[#e33b5f] text-lg">{idea.vepScore}/100</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#7e7e7e]">VEP Ranking</span>
                  <span className="font-semibold text-[#222]">#{idea.vepRanking} of {ideas.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#7e7e7e]">VEP Recommendation</span>
                  <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">{idea.vepRecommendation}</Badge>
                </div>
                <p className="text-sm text-[#444] bg-[#f6f6f6] rounded-lg p-3">{idea.vepSummary}</p>
              </CardContent>
            </Card>

            {/* Strengths & Risks */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm text-[#e33b5f] flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Strengths</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {idea.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#444]">
                        <CheckCircle className="w-4 h-4 text-[#e33b5f] shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm text-[#f07969] flex items-center gap-1"><XCircle className="w-4 h-4" /> Risks</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {idea.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#444]">
                        <XCircle className="w-4 h-4 text-[#f07969] shrink-0 mt-0.5" />{r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Document links */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-[#e33b5f]" /> Submission Documents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {['Idea Application Form', 'Lean Canvas', 'Founder Video'].map(doc => (
                  <div key={doc} className="flex items-center justify-between p-2 bg-[#f6f6f6] rounded-lg">
                    <span className="text-sm text-[#444] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#9e9e9e]" />{doc}
                    </span>
                    <Badge className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs">View</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* MAB Decision Panel */}
          <div className="space-y-4">
            <Card className={isSubmitted ? 'border-[#e33b5f]/30 bg-[#e33b5f]/5' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#e33b5f]" /> MAB Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isSubmitted ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-[#e33b5f] mx-auto mb-2" />
                    <p className="font-semibold text-[#222]">Evaluation Submitted</p>
                    <p className="text-sm text-[#7e7e7e] mt-1">Decision: <span className="text-[#e33b5f] font-medium">{decisionLabels[decisions[idea.id]!]?.label}</span></p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#7e7e7e]">Select your decision for this idea:</p>
                    <div className="space-y-2">
                      {(Object.entries(decisionLabels) as [Decision, { label: string; color: string }][]).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setDecisions(prev => ({ ...prev, [idea.id]: key }))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition border-2 ${
                            decision === key
                              ? 'border-[#e33b5f] bg-[#e33b5f]/10 text-[#e33b5f]'
                              : 'border-transparent bg-[#f6f6f6] text-[#444] hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {val.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-[#7e7e7e] mb-1">Comments / Notes</p>
                      <Textarea
                        placeholder="Add your evaluation notes..."
                        className="text-sm resize-none"
                        rows={3}
                        value={comments[idea.id] ?? ''}
                        onChange={e => setComments(prev => ({ ...prev, [idea.id]: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full bg-[#e33b5f] hover:bg-[#c02d4f] text-white"
                      disabled={!decision}
                      onClick={() => handleSubmit(idea.id)}
                    >
                      Submit MAB Decision
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">MAB Evaluation Dashboard</h1>
        <p className="text-[#7e7e7e]">Management Advisory Board — review VEP-selected ideas and make strategic decisions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Ideas in Queue', value: ideas.length, icon: FileText },
          { label: 'Evaluated', value: Object.values(submitted).filter(Boolean).length, icon: CheckCircle },
          { label: 'Pending', value: ideas.length - Object.values(submitted).filter(Boolean).length, icon: Clock },
          { label: 'Avg VEP Score', value: Math.round(ideas.reduce((a, b) => a + b.vepScore, 0) / ideas.length), icon: Star },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-[#e33b5f] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#222]">{stat.value}</p>
              <p className="text-xs text-[#7e7e7e]">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Idea list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ideas for MAB Review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ideas.map(idea => (
            <button
              key={idea.id}
              onClick={() => setSelectedIdea(idea.id)}
              className="w-full text-left p-4 rounded-lg border border-[#f0f0f0] hover:border-[#e33b5f]/30 hover:bg-[#e33b5f]/5 transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e33b5f]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#e33b5f]">#{idea.vepRanking}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#222] group-hover:text-[#e33b5f] transition">{idea.title}</p>
                    <p className="text-sm text-[#7e7e7e]">{idea.founder} · {idea.sector}</p>
                    <p className="text-xs text-[#9e9e9e] mt-1">VEP: {idea.vepRecommendation}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#f07969]" />
                    <span className="font-bold text-[#222]">{idea.vepScore}</span>
                  </div>
                  {submitted[idea.id]
                    ? <Badge className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>
                    : <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1 text-[#f07969]" />Pending</Badge>
                  }
                  <ChevronRight className="w-4 h-4 text-[#9e9e9e] group-hover:text-[#e33b5f] transition" />
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
