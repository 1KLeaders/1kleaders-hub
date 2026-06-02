'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, ChevronRight, Star, Send } from 'lucide-react';
import type { RoleBadge } from './types';
import { roleBadgeConfig } from './types';

type Props = Record<string, never>;

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

const assignments = [
  { id: 1, idea: 'GreenTech: AI-Powered Energy Optimization', owner: 'Ahmed Al-Rashid', ownerRole: 'idea-owner' as RoleBadge, assignedBy: 'Admin', priority: 'high', status: 'pending', dueDate: '2026-05-25', score: null, category: 'CleanTech' },
  { id: 2, idea: 'HealthConnect: Telemedicine for MENA', owner: 'Fatima Khalid', ownerRole: 'idea-owner' as RoleBadge, assignedBy: 'Admin', priority: 'medium', status: 'in-progress', dueDate: '2026-05-28', score: null, category: 'HealthTech' },
  { id: 3, idea: 'EduPay: Student Micro-Financing', owner: 'Omar Hassan', ownerRole: 'investor' as RoleBadge, assignedBy: 'Super Admin', priority: 'high', status: 'completed', dueDate: '2026-05-20', score: 8.5, category: 'FinTech' },
  { id: 4, idea: 'SmartFarm: IoT Agriculture', owner: 'Sara Mohammed', ownerRole: 'idea-owner' as RoleBadge, assignedBy: 'Admin', priority: 'low', status: 'completed', dueDate: '2026-05-18', score: 7.2, category: 'AgriTech' },
  { id: 5, idea: 'PropEase: Digital Real Estate', owner: 'Khalid Nasser', ownerRole: 'partner' as RoleBadge, assignedBy: 'Admin', priority: 'medium', status: 'overdue', dueDate: '2026-05-15', score: null, category: 'PropTech' },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'pending': { label: 'Pending', color: 'bg-[#f07969]/10 text-[#E65F5C]', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-sky-100 text-sky-700', icon: ChevronRight },
  'completed': { label: 'Completed', color: 'bg-[#e33b5f]/10 text-[#c02d4f]', icon: CheckCircle },
  'overdue': { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function VVPAssignments({}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#e33b5f]" /> VVP Assignments
        </h1>
        <p className="text-[#7e7e7e]">Evaluate assigned ideas and provide your assessment scores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Assigned', value: assignments.length, color: 'bg-[#fbfbfb]' },
          { label: 'Pending', value: assignments.filter(a => a.status === 'pending').length, color: 'bg-[#f07969]/5' },
          { label: 'In Progress', value: assignments.filter(a => a.status === 'in-progress').length, color: 'bg-sky-50' },
          { label: 'Completed', value: assignments.filter(a => a.status === 'completed').length, color: 'bg-[#e33b5f]/5' },
        ].map(s => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#222]">{s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {assignments.map(a => {
          const sc = statusConfig[a.status];
          const Icon = sc.icon;
          return (
            <Card key={a.id} className={`hover:shadow-md transition ${a.priority === 'high' ? 'border-l-4 border-l-red-400' : a.priority === 'medium' ? 'border-l-4 border-l-amber-400' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#222]">{a.idea}</h3>
                      <Badge variant="secondary" className="text-xs">{a.category}</Badge>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        <Icon className="w-3 h-3" /> {sc.label}
                      </span>
                      {a.priority === 'high' && <Badge className="bg-red-100 text-red-700 text-xs">High Priority</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-[#7e7e7e]">Owner:</span>
                      <span className="text-xs flex items-center gap-1">
                        <Avatar className="w-4 h-4"><AvatarFallback className="text-[8px]">{a.owner.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                        {a.owner}
                      </span>
                      <DigitalBadge role={a.ownerRole} />
                      <span className="text-xs text-[#9e9e9e]">• Due: {a.dueDate}</span>
                      <span className="text-xs text-[#9e9e9e]">• Assigned by: {a.assignedBy}</span>
                    </div>

                    {a.score !== null && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[#7e7e7e]">Your Score:</span>
                        <span className="text-lg font-bold text-[#e33b5f]">{a.score}/10</span>
                        <Progress value={a.score * 10} className="h-2 w-24" />
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {(a.status === 'pending' || a.status === 'in-progress' || a.status === 'overdue') ? (
                      <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" size="sm">
                        <Star className="w-4 h-4 mr-1" /> Evaluate
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm"><Send className="w-4 h-4 mr-1" /> View Report</Button>
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
