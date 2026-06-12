'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Edit, Mail, Star, Briefcase, MapPin, Clock, Copy, Check, Users, Lightbulb, ClipboardCheck, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { Page, DashboardRole } from './types';

interface Props {
  navigate: (page: Page) => void;
  role?: DashboardRole;
}

export default function ProfilePage({ navigate, role = 'shareholder' }: Props) {
  const [copied, setCopied] = useState(false);

  // Simulated referral link unique to this account
  const referralLink = 'https://1kleaders.com/join?ref=AR-00142';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isShareholder = role === 'shareholder' || role === 'shareholder' || role === 'super-admin' || role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">My Profile</h1>
          <p className="text-[#7e7e7e]">View and manage your profile information</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={() => navigate('settings')}>
          <Edit className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-2xl font-bold">AR</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-[#222]">Ahmed Al-Rashid</h2>
              <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start flex-wrap">
                <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">Shareholder</Badge>
                <span className="flex items-center gap-1 text-[#f07969] text-sm"><Star className="w-4 h-4" /> Gold Level</span>
              </div>
              <p className="text-sm text-[#7e7e7e] mt-2">Venture shareholder with 15+ years of experience in technology investments and startup mentoring. Passionate about building transformative ventures in the MENA region.</p>
              <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start text-xs text-[#7e7e7e] flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Riyadh, Saudi Arabia</span>
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Technology Sector</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last login: Today, 9:42 AM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Meetings Attended', value: '24' },
          { icon: Clock, label: 'Contribution Hours', value: '38.5h' },
          { icon: Lightbulb, label: 'Ideas Reviewed', value: '12' },
          { icon: ClipboardCheck, label: 'Tasks Completed', value: '7' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-[#e33b5f] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#222]">{stat.value}</p>
              <p className="text-xs text-[#7e7e7e] mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* About & Skills */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">About & Expertise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Company</p>
                <p className="text-sm font-medium text-[#222]">Al-Rashid Ventures</p>
              </div>
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Primary Sector</p>
                <p className="text-sm font-medium text-[#222]">Technology</p>
              </div>
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Years of Experience</p>
                <p className="text-sm font-medium text-[#222]">15+ years</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-[#444] mb-2">Skills & Expertise</p>
              <div className="flex flex-wrap gap-2">
                {['Investment Strategy', 'Venture Capital', 'Startup Mentoring', 'Board Advisory', 'Technology', 'Leadership', 'Negotiation', 'Portfolio Management'].map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-[#444] mb-2">Investment Interests</p>
              <div className="flex flex-wrap gap-2">
                {['FinTech', 'AI/ML', 'CleanTech', 'HealthTech'].map(s => (
                  <Badge key={s} className="bg-[#e33b5f]/5 text-[#c02d4f] text-xs">{s}</Badge>
                ))}
              </div>
            </div>

            {/* Referral Link — shareholders/shareholders only */}
            {isShareholder && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-[#444] mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#e33b5f]" /> Your Referral Link
                  </p>
                  <p className="text-xs text-[#7e7e7e] mb-2">Share this unique link to refer prospective shareholders to 1K Leaders.</p>
                  <div className="flex items-center gap-2 bg-[#f6f6f6] border border-[#f0f0f0] rounded-lg px-3 py-2">
                    <span className="text-sm text-[#444] flex-1 truncate font-mono">{referralLink}</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-[#e33b5f] hover:text-[#c02d4f] font-medium transition shrink-0"
                    >
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {[
                { text: 'Invested in GreenTech Series A', time: '2 hours ago' },
                { text: 'Updated profile information', time: '1 day ago' },
                { text: 'Signed shareholder agreement', time: '3 days ago' },
                { text: 'Connected with Omar Hassan', time: '5 days ago' },
                { text: 'Submitted idea evaluation', time: '1 week ago' },
                { text: 'Attended Demo Day event', time: '2 weeks ago' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#e33b5f]/50 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#444]">{a.text}</p>
                    <p className="text-xs text-[#9e9e9e]">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
