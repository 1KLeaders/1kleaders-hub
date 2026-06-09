'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, TrendingUp, Lightbulb, ChevronUp, ChevronDown, BarChart3, Eye, Star, Shield } from 'lucide-react';
import type { RoleBadge } from './types';
import { roleBadgeConfig } from './types';

type Props = Record<string, never>;

// VEP Score criteria: Product/Service, Market Opportunity, Competitive Advantage, Business Model
const ideas = [
  {
    id: 1, title: 'GreenTech: AI-Powered Energy Optimization', owner: 'Ahmed Al-Rashid', ownerRole: 'idea-owner' as RoleBadge,
    category: 'CleanTech', status: 'under-review',
    description: 'An AI platform that optimizes energy consumption for commercial buildings, reducing costs by up to 35%.',
    submittedDate: '2026-05-10',
    vep: { product: 22, market: 20, competitive: 19, businessModel: 18 },
    mab: { productTech: 18, productMarketFit: 17, riskAssessment: 16, businessModel: 19, team: 20 },
  },
  {
    id: 2, title: 'HealthConnect: Telemedicine for MENA', owner: 'Fatima Khalid', ownerRole: 'idea-owner' as RoleBadge,
    category: 'HealthTech', status: 'approved',
    description: 'A telemedicine platform tailored for the MENA region with multi-language support and local healthcare integration.',
    submittedDate: '2026-05-08',
    vep: { product: 21, market: 23, competitive: 18, businessModel: 20 },
    mab: { productTech: 20, productMarketFit: 21, riskAssessment: 15, businessModel: 18, team: 22 },
  },
  {
    id: 3, title: 'EduPay: Student Micro-Financing', owner: 'Omar Hassan', ownerRole: 'investor' as RoleBadge,
    category: 'FinTech', status: 'under-review',
    description: 'Micro-financing platform for university students with income-share agreements and mentorship programs.',
    submittedDate: '2026-05-12',
    vep: { product: 18, market: 19, competitive: 16, businessModel: 17 },
    mab: { productTech: 16, productMarketFit: 18, riskAssessment: 14, businessModel: 17, team: 15 },
  },
  {
    id: 4, title: 'SmartFarm: IoT Agriculture Platform', owner: 'Sara Mohammed', ownerRole: 'idea-owner' as RoleBadge,
    category: 'AgriTech', status: 'evaluation',
    description: 'IoT sensors and AI analytics platform for precision agriculture in arid climates.',
    submittedDate: '2026-05-14',
    vep: { product: 17, market: 16, competitive: 15, businessModel: 16 },
    mab: { productTech: 17, productMarketFit: 15, riskAssessment: 13, businessModel: 16, team: 14 },
  },
  {
    id: 5, title: 'PropEase: Digital Real Estate', owner: 'Khalid Nasser', ownerRole: 'shareholder' as RoleBadge,
    category: 'PropTech', status: 'approved',
    description: 'End-to-end digital real estate platform with virtual tours and smart contracts.',
    submittedDate: '2026-05-05',
    vep: { product: 19, market: 17, competitive: 20, businessModel: 18 },
    mab: { productTech: 19, productMarketFit: 16, riskAssessment: 18, businessModel: 17, team: 16 },
  },
  {
    id: 6, title: 'LogiFlow: Supply Chain AI', owner: 'Noura Ali', ownerRole: 'idea-owner' as RoleBadge,
    category: 'SaaS', status: 'evaluation',
    description: 'AI-driven supply chain optimization for MENA logistics companies.',
    submittedDate: '2026-05-16',
    vep: { product: 15, market: 14, competitive: 13, businessModel: 15 },
    mab: { productTech: 15, productMarketFit: 13, riskAssessment: 12, businessModel: 14, team: 13 },
  },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  'under-review': { label: 'Under Review', color: 'bg-[#f07969]/10 text-[#E65F5C]' },
  'approved':     { label: 'Approved', color: 'bg-[#e33b5f]/10 text-[#c02d4f]' },
  'evaluation':   { label: 'In Evaluation', color: 'bg-purple-100 text-purple-700' },
  'rejected':     { label: 'Not Approved', color: 'bg-red-100 text-red-700' },
};

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

function getVEPScore(vep: typeof ideas[0]['vep']) {
  return vep.product + vep.market + vep.competitive + vep.businessModel;
}

function getMABScore(mab: typeof ideas[0]['mab']) {
  return mab.productTech + mab.productMarketFit + mab.riskAssessment + mab.businessModel + mab.team;
}

export default function IdeaRanking({}: Props) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'vep' | 'mab'>('vep');

  const filteredIdeas = ideas.filter(i => filterStatus === 'all' || i.status === filterStatus);
  const sortedByVEP = [...filteredIdeas].sort((a, b) => getVEPScore(b.vep) - getVEPScore(a.vep));
  const sortedByMAB = [...filteredIdeas].sort((a, b) => getMABScore(b.mab) - getMABScore(a.mab));
  const sorted = activeTab === 'vep' ? sortedByVEP : sortedByMAB;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#e33b5f]" /> Idea Ranking
        </h1>
        <p className="text-[#7e7e7e]">Ideas ranked by VEP Score and MAB Assessment criteria</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'vep' | 'mab')}>
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="vep" className="flex items-center gap-2"><Star className="w-4 h-4" /> VEP Score</TabsTrigger>
          <TabsTrigger value="mab" className="flex items-center gap-2"><Shield className="w-4 h-4" /> MAB Ranking</TabsTrigger>
        </TabsList>

        {/* VEP Methodology */}
        <TabsContent value="vep">
          <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-[#c02d4f] mb-2">⭐ VEP Score Criteria (100 pts total)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Product/Service', pts: 25 },
                  { label: 'Market Opportunity', pts: 25 },
                  { label: 'Competitive Advantage', pts: 25 },
                  { label: 'Business Model', pts: 25 },
                ].map(c => (
                  <div key={c.label} className="text-center p-2 bg-white rounded-lg border border-[#e33b5f]/10">
                    <p className="font-bold text-[#c02d4f] text-base">{c.pts}</p>
                    <p className="text-[#7e7e7e]">{c.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAB Methodology */}
        <TabsContent value="mab">
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-purple-700 mb-2">🛡️ MAB Ranking Criteria (100 pts total)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {[
                  { label: 'Product & Tech', pts: 20 },
                  { label: 'Product Market Fit', pts: 20 },
                  { label: 'Risk Assessment', pts: 20 },
                  { label: 'Business Model', pts: 20 },
                  { label: 'Team', pts: 20 },
                ].map(c => (
                  <div key={c.label} className="text-center p-2 bg-white rounded-lg border border-purple-100">
                    <p className="font-bold text-purple-700 text-base">{c.pts}</p>
                    <p className="text-[#7e7e7e]">{c.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#9e9e9e] self-center mr-1">Status:</span>
        {['all', 'under-review', 'approved', 'evaluation'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterStatus === s ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {s === 'all' ? 'All' : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Ranking List */}
      <div className="space-y-3">
        {sorted.map((idea, index) => {
          const vepScore = getVEPScore(idea.vep);
          const mabScore = getMABScore(idea.mab);
          const displayScore = activeTab === 'vep' ? vepScore : mabScore;
          const isExpanded = expanded === idea.id;
          return (
            <Card key={idea.id} className={`transition ${index < 3 ? 'border-[#e33b5f]/20' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
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
                        <div className="text-2xl font-bold text-[#e33b5f]">{displayScore}</div>
                        <div className="text-[10px] text-[#9e9e9e]">{activeTab === 'vep' ? 'VEP Score' : 'MAB Score'}</div>
                      </div>
                    </div>

                    {/* Score criteria bars */}
                    {activeTab === 'vep' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        {[
                          { label: 'Product/Service', val: idea.vep.product, max: 25 },
                          { label: 'Market Opp.', val: idea.vep.market, max: 25 },
                          { label: 'Comp. Advantage', val: idea.vep.competitive, max: 25 },
                          { label: 'Business Model', val: idea.vep.businessModel, max: 25 },
                        ].map(c => (
                          <div key={c.label}>
                            <div className="flex justify-between text-xs mb-0.5"><span className="text-[#7e7e7e] truncate">{c.label}</span><span className="font-medium">{c.val}/{c.max}</span></div>
                            <Progress value={(c.val / c.max) * 100} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                        {[
                          { label: 'Product & Tech', val: idea.mab.productTech, max: 20 },
                          { label: 'PMF', val: idea.mab.productMarketFit, max: 20 },
                          { label: 'Risk', val: idea.mab.riskAssessment, max: 20 },
                          { label: 'Biz Model', val: idea.mab.businessModel, max: 20 },
                          { label: 'Team', val: idea.mab.team, max: 20 },
                        ].map(c => (
                          <div key={c.label}>
                            <div className="flex justify-between text-xs mb-0.5"><span className="text-[#7e7e7e] truncate">{c.label}</span><span className="font-medium">{c.val}/{c.max}</span></div>
                            <Progress value={(c.val / c.max) * 100} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    )}

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
