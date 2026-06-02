'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, Star, AlertTriangle, CheckCircle2, Lock, ChevronRight, FileText, Play, ChevronDown } from 'lucide-react';

type DeclarationStatus = 'pending' | 'declared-conflict' | 'cleared';
type ScoringStatus = 'not-started' | 'in-progress' | 'submitted';

const assignedIdeas = [
  { id: 1, name: 'EduTech MENA Platform', sector: 'EdTech', submitter: 'Ahmed Al-Rashidi', stage: 'VEP Review', declarationStatus: 'cleared' as DeclarationStatus, scoringStatus: 'submitted' as ScoringStatus, score: 78 },
  { id: 2, name: 'GreenLogistics AI',      sector: 'CleanTech', submitter: 'Sara Mohammed',  stage: 'VEP Review', declarationStatus: 'cleared' as DeclarationStatus, scoringStatus: 'in-progress' as ScoringStatus, score: null },
  { id: 3, name: 'FinTrack SMB',           sector: 'FinTech',   submitter: 'Khalid Nasser',   stage: 'VEP Review', declarationStatus: 'pending' as DeclarationStatus,   scoringStatus: 'not-started' as ScoringStatus, score: null },
];

const scoringCriteria = [
  { key: 'problem',    label: 'Problem Clarity',          max: 10, desc: 'Is the problem well-defined and significant?' },
  { key: 'solution',   label: 'Solution Innovation',      max: 10, desc: 'Is the solution innovative and feasible?' },
  { key: 'market',     label: 'Market Size & Potential',  max: 10, desc: 'Is there a large enough addressable market?' },
  { key: 'team',       label: 'Founder / Team Quality',   max: 10, desc: 'Does the team have the skills to execute?' },
  { key: 'model',      label: 'Business Model Viability', max: 10, desc: 'Is the revenue model credible?' },
  { key: 'traction',   label: 'Traction / Validation',    max: 10, desc: 'Is there any existing evidence of demand?' },
  { key: 'risk',       label: 'Risk Assessment',          max: 10, desc: 'Are key risks identified and manageable?' },
  { key: 'impact',     label: 'Regional Impact',          max: 10, desc: 'Does it benefit the MENA ecosystem?' },
];

export default function VEPDashboard() {
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  const [declarationDone, setDeclarationDone] = useState<Record<number, boolean>>({ 1: true, 2: true });
  const [conflictDeclared, setConflictDeclared] = useState<Record<number, boolean>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({ 1: true });
  const [showDeclaration, setShowDeclaration] = useState<number | null>(null);

  const idea = assignedIdeas.find(i => i.id === selectedIdea);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxScore = scoringCriteria.length * 10;
  const allScored = scoringCriteria.every(c => scores[c.key] !== undefined);

  const setScore = (key: string, val: number) => setScores(prev => ({ ...prev, [key]: val }));
  const setComment = (key: string, val: string) => setComments(prev => ({ ...prev, [key]: val }));

  if (!selectedIdea) {
    return (
      <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#e33b5f]" /> VEP Review Dashboard
          </h1>
          <p className="text-[#7e7e7e]">Venture Evaluation Panel — score and evaluate assigned ideas</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Assigned Ideas', value: assignedIdeas.length, color: 'text-[#222]' },
            { label: 'Scores Submitted', value: Object.keys(submitted).length, color: 'text-[#e33b5f]' },
            { label: 'Pending Review', value: assignedIdeas.length - Object.keys(submitted).length, color: 'text-[#f07969]' },
          ].map(s => (
            <Card key={s.label} className="border-[#f0f0f0]">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-[#7e7e7e] mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Idea List */}
        <Card className="border-[#f0f0f0]">
          <CardHeader><CardTitle className="text-base text-[#222]">Your Assigned Ideas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {assignedIdeas.map(idea => {
              const isCleared = declarationDone[idea.id];
              const isSubmitted = submitted[idea.id];
              return (
                <div key={idea.id} className="p-4 border-b border-[#f0f0f0] last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-[#222] text-sm">{idea.name}</p>
                        <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20 text-xs">{idea.sector}</Badge>
                        {isSubmitted && <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Score Submitted</Badge>}
                      </div>
                      <p className="text-xs text-[#7e7e7e]">Submitted by {idea.submitter}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCleared && (
                        <Button size="sm" variant="outline" className="border-[#f07969] text-[#f07969] text-xs"
                          onClick={() => setShowDeclaration(idea.id)}>
                          <AlertTriangle className="w-3 h-3 mr-1" /> Declaration Required
                        </Button>
                      )}
                      {isCleared && !isSubmitted && (
                        <Button size="sm" className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white text-xs"
                          onClick={() => setSelectedIdea(idea.id)}>
                          Score Idea <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                      {isSubmitted && (
                        <Button size="sm" variant="outline" className="border-[#f0f0f0] text-[#555353] text-xs"
                          onClick={() => setSelectedIdea(idea.id)}>
                          View Score <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Conflict declaration modal inline */}
                  {showDeclaration === idea.id && (
                    <div className="mt-3 p-4 bg-[#f07969]/5 border border-[#f07969]/20 rounded-lg space-y-3">
                      <p className="text-sm font-semibold text-[#222]">Conflict of Interest Declaration</p>
                      <p className="text-xs text-[#555353]">Before reviewing this idea, you must declare any potential conflicts of interest. Are you currently involved with this idea or sector as a founder, advisor, or investor?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-[#f07969] text-[#f07969] text-xs"
                          onClick={() => { setConflictDeclared(p => ({ ...p, [idea.id]: true })); setDeclarationDone(p => ({ ...p, [idea.id]: true })); setShowDeclaration(null); }}>
                          Declare Conflict
                        </Button>
                        <Button size="sm" className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white text-xs"
                          onClick={() => { setDeclarationDone(p => ({ ...p, [idea.id]: true })); setShowDeclaration(null); }}>
                          No Conflict — Proceed
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scoring view
  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedIdea(null)} className="text-sm text-[#7e7e7e] hover:text-[#222] transition">← Back to Ideas</button>
        <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
        <span className="text-sm font-medium text-[#222]">{idea?.name}</span>
      </div>

      {/* Idea info */}
      <Card className="border-[#f0f0f0]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#222]">{idea?.name}</h2>
              <p className="text-sm text-[#7e7e7e]">Submitted by {idea?.submitter} · {idea?.sector}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="border-[#f0f0f0] text-[#555353] text-xs gap-1">
                <FileText className="w-3 h-3" /> View Lean Canvas
              </Button>
              <Button size="sm" variant="outline" className="border-[#f0f0f0] text-[#555353] text-xs gap-1">
                <Play className="w-3 h-3" /> Founder Video
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {submitted[selectedIdea] ? (
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-14 h-14 bg-[#e33b5f]/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-[#e33b5f]" />
            </div>
            <p className="text-lg font-bold text-[#222]">Score Submitted</p>
            <p className="text-sm text-[#7e7e7e]">Your evaluation has been submitted. The admin will compile all VEP scores to generate the summary report.</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e33b5f]/5 rounded-lg">
              <Star className="w-4 h-4 text-[#e33b5f]" />
              <span className="text-lg font-bold text-[#e33b5f]">{idea?.score}/80</span>
              <span className="text-sm text-[#7e7e7e]">Your Total Score</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Score progress */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#222]">Scoring Progress</p>
            <span className="text-sm font-bold text-[#e33b5f]">{totalScore}/{maxScore}</span>
          </div>
          <Progress value={(totalScore / maxScore) * 100} className="h-2" />

          {scoringCriteria.map(c => (
            <Card key={c.key} className="border-[#f0f0f0]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#222]">{c.label}</p>
                    <p className="text-xs text-[#7e7e7e]">{c.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#e33b5f]">{scores[c.key] ?? '—'}</span>
                    <span className="text-xs text-[#9e9e9e]">/{c.max}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from({ length: c.max + 1 }, (_, i) => i).map(n => (
                    <button key={n} onClick={() => setScore(c.key, n)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition border ${scores[c.key] === n ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-[#f6f6f6] text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/50'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <Textarea placeholder={`Comments on ${c.label}...`} rows={2} className="text-xs border-[#f0f0f0]"
                  value={comments[c.key] || ''} onChange={e => setComment(c.key, e.target.value)} />
              </CardContent>
            </Card>
          ))}

          <Card className="border-[#f0f0f0]">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-[#222]">Overall Assessment</p>
              <Textarea placeholder="Overall comments and summary of your evaluation..." rows={4} className="border-[#f0f0f0]"
                value={overallComment} onChange={e => setOverallComment(e.target.value)} />
              <div>
                <p className="text-sm font-medium text-[#222] mb-2">Recommendation</p>
                <div className="flex flex-wrap gap-2">
                  {['Move to MAB', 'Request More Information', 'Park for Future', 'Reject', 'Merge with Another Idea'].map(r => (
                    <button key={r} onClick={() => setRecommendation(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${recommendation === r ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-[#f6f6f6] text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/50'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full bg-[#e33b5f] hover:bg-[#c02d4f] text-white"
            disabled={!allScored || !recommendation}
            onClick={() => setSubmitted(p => ({ ...p, [selectedIdea]: true }))}>
            Submit Evaluation <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
          {(!allScored || !recommendation) && (
            <p className="text-xs text-center text-[#9e9e9e]">Score all criteria and select a recommendation to submit.</p>
          )}
        </div>
      )}
    </div>
  );
}
