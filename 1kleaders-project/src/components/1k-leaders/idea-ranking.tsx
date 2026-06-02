'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, ThumbsDown, TrendingUp, Lightbulb, ChevronUp, ChevronDown, Filter, BarChart3, Users, Eye, Star } from 'lucide-react';
import type { RoleBadge } from './types';
import { roleBadgeConfig } from './types';

type Props = Record<string, never>;

const ideas = [
  { id: 1, title: 'GreenTech: AI-Powered Energy Optimization', owner: 'Ahmed Al-Rashid', ownerRole: 'idea-owner' as RoleBadge, category: 'CleanTech', votes: 87, interest: 92, feasibility: 78, status: 'under-review', description: 'An AI platform that optimizes energy consumption for commercial buildings, reducing costs by up to 35%.', submittedDate: '2026-05-10' },
  { id: 2, title: 'HealthConnect: Telemedicine for MENA', owner: 'Fatima Khalid', ownerRole: 'idea-owner' as RoleBadge, category: 'HealthTech', votes: 72, interest: 85, feasibility: 82, status: 'approved', description: 'A telemedicine platform tailored for the MENA region with multi-language support and local healthcare integration.', submittedDate: '2026-05-08' },
  { id: 3, title: 'EduPay: Student Micro-Financing', owner: 'Omar Hassan', ownerRole: 'investor' as RoleBadge, category: 'FinTech', votes: 65, interest: 78, feasibility: 70, status: 'under-review', description: 'Micro-financing platform for university students with income-share agreements and mentorship programs.', submittedDate: '2026-05-12' },
  { id: 4, title: 'SmartFarm: IoT Agriculture Platform', owner: 'Sara Mohammed', ownerRole: 'idea-owner' as RoleBadge, category: 'AgriTech', votes: 58, interest: 71, feasibility: 68, status: 'evaluation', description: 'IoT sensors and AI analytics platform for precision agriculture in arid climates.', submittedDate: '2026-05-14' },
  { id: 5, title: 'PropEase: Digital Real Estate', owner: 'Khalid Nasser', ownerRole: 'partner' as RoleBadge, category: 'PropTech', votes: 51, interest: 65, feasibility: 74, status: 'approved', description: 'End-to-end digital real estate platform with virtual tours and smart contracts.', submittedDate: '2026-05-05' },
  { id: 6, title: 'LogiFlow: Supply Chain AI', owner: 'Noura Ali', ownerRole: 'idea-owner' as RoleBadge, category: 'SaaS', votes: 44, interest: 60, feasibility: 65, status: 'evaluation', description: 'AI-driven supply chain optimization for MENA logistics companies.', submittedDate: '2026-05-16' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  'under-review': { label: 'Under Review', color: 'bg-[#f07969]/10 text-[#E65F5C]' },
  'approved': { label: 'Approved', color: 'bg-[#e33b5f]/10 text-[#c02d4f]' },
  'evaluation': { label: 'In Evaluation', color: 'bg-purple-100 text-purple-700' },
  'rejected': { label: 'Not Approved', color: 'bg-red-100 text-red-700' },
};

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

function getScore(votes: number, interest: number, feasibility: number) {
  return Math.round((votes * 0.3 + interest * 0.35 + feasibility * 0.35) / 100 * 100);
}

export default function IdeaRanking({}: Props) {
  const [sortBy, setSortBy] = useState<'ranking' | 'votes' | 'interest' | 'feasibility'>('ranking');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const sorted = [...ideas]
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'ranking') return getScore(b.votes, b.interest, b.feasibility) - getScore(a.votes, a.interest, a.feasibility);
      if (sortBy === 'votes') return b.votes - a.votes;
      if (sortBy === 'interest') return b.interest - a.interest;
      return b.feasibility - a.feasibility;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#e33b5f]" /> Idea Ranking
        </h1>
        <p className="text-[#7e7e7e]">Ideas ranked by votes, interest, and feasibility score</p>
      </div>

      {/* Ranking Methodology */}
      <Card className="border-emerald-200 bg-[#e33b5f]/5/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-[#c02d4f] mb-2">📊 Ranking Methodology</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="font-bold text-[#c02d4f]">30%</p>
              <p className="text-[#7e7e7e]">Community Votes</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="font-bold text-[#c02d4f]">35%</p>
              <p className="text-[#7e7e7e]">Interest Level</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="font-bold text-[#c02d4f]">35%</p>
              <p className="text-[#7e7e7e]">Feasibility Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort & Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#9e9e9e] self-center mr-1">Sort by:</span>
        {[
          { key: 'ranking' as const, label: 'Overall Ranking' },
          { key: 'votes' as const, label: 'Most Voted' },
          { key: 'interest' as const, label: 'Most Interest' },
          { key: 'feasibility' as const, label: 'Most Feasible' },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${sortBy === s.key ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {s.label}
          </button>
        ))}
        <span className="text-xs text-[#9e9e9e] self-center mx-2">|</span>
        <span className="text-xs text-[#9e9e9e] self-center mr-1">Status:</span>
        {['all', 'under-review', 'approved', 'evaluation'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterStatus === s ? 'bg-[#f07969]/50 text-white' : 'bg-[#f6f6f6] text-[#555353]'}`}>
            {s === 'all' ? 'All' : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Ranking List */}
      <div className="space-y-3">
        {sorted.map((idea, index) => {
          const score = getScore(idea.votes, idea.interest, idea.feasibility);
          const isExpanded = expanded === idea.id;
          return (
            <Card key={idea.id} className={`transition ${index < 3 ? 'border-emerald-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${index === 0 ? 'bg-[#f07969]/10 text-[#E65F5C]' : index === 1 ? 'bg-[#e8e8e8] text-[#555353]' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[#222]">{idea.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-[#7e7e7e] flex items-center gap-1">
                            <Avatar className="w-4 h-4"><AvatarFallback className="text-[8px] bg-[#f6f6f6]">{idea.owner.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                            {idea.owner}
                          </span>
                          <DigitalBadge role={idea.ownerRole} />
                          <Badge variant="secondary" className="text-xs">{idea.category}</Badge>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig[idea.status]?.color}`}>
                            {statusConfig[idea.status]?.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-[#e33b5f]">{score}</div>
                        <div className="text-[10px] text-[#9e9e9e]">Overall Score</div>
                      </div>
                    </div>

                    {/* Score bars */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <div className="flex justify-between text-xs mb-0.5"><span className="text-[#7e7e7e]">Votes</span><span className="font-medium">{idea.votes}</span></div>
                        <Progress value={idea.votes} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-0.5"><span className="text-[#7e7e7e]">Interest</span><span className="font-medium">{idea.interest}%</span></div>
                        <Progress value={idea.interest} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-0.5"><span className="text-[#7e7e7e]">Feasibility</span><span className="font-medium">{idea.feasibility}%</span></div>
                        <Progress value={idea.feasibility} className="h-1.5" />
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button onClick={() => setExpanded(isExpanded ? null : idea.id)} className="text-xs text-[#e33b5f] font-medium mt-2 flex items-center gap-1">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Less details' : 'View details'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-3 bg-[#fbfbfb] rounded-lg space-y-2">
                        <p className="text-sm text-[#444]">{idea.description}</p>
                        <p className="text-xs text-[#9e9e9e]">Submitted: {idea.submittedDate}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"><ThumbsUp className="w-3 h-3 mr-1" /> Upvote</Button>
                          <Button variant="outline" size="sm"><Eye className="w-3 h-3 mr-1" /> View Full Idea</Button>
                          <Button variant="outline" size="sm"><Star className="w-3 h-3 mr-1" /> Express Interest</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
