'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check, User, Briefcase, Heart } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

const industries = ['Technology', 'Healthcare', 'Finance', 'Real Estate', 'Education', 'Energy', 'Retail', 'Manufacturing', 'Media', 'Agriculture'];
const skills = ['Leadership', 'Strategy', 'Marketing', 'Sales', 'Product Management', 'Engineering', 'Design', 'Finance', 'Operations', 'Legal'];
const interests = ['Angel Investing', 'Venture Capital', 'Seed Funding', 'Growth Equity', 'Impact Investing', 'Startup Mentoring', 'Board Advisory'];
const sectors = ['FinTech', 'HealthTech', 'EdTech', 'PropTech', 'CleanTech', 'AgriTech', 'E-Commerce', 'SaaS', 'AI/ML', 'IoT'];
const stages = ['Idea Stage', 'Pre-Seed', 'Seed', 'Series A', 'Early Growth', 'Scaling'];
const sources = ['LinkedIn', 'Twitter/X', 'Friend/Colleague', 'Event/Conference', 'News Article', 'Search Engine', 'Other'];
const userTypes = ['Prospective Partner', 'Prospective Shareholder', 'Prospective Investor', 'Idea Owner', 'Co-Founder'];

export default function WaitlistForm({ navigate }: Props) {
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedUserTypes, setSelectedUserTypes] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [otherCountry, setOtherCountry] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [otherSource, setOtherSource] = useState('');

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <Card className="max-w-md w-full text-center border-[#f0f0f0]">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-[#e33b5f]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#e33b5f]" />
            </div>
            <h2 className="text-2xl font-bold text-[#222] mb-2" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>Application Submitted!</h2>
            <p className="text-[#7e7e7e] mb-6">Thank you for your interest in 1K Leaders. We will review your application and get back to you soon.</p>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold" onClick={() => navigate('landing')} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6] py-8 px-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('landing')} className="mb-6 text-[#7e7e7e]">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { n: 1, label: 'Personal Info', icon: User },
            { n: 2, label: 'Professional', icon: Briefcase },
            { n: 3, label: 'Interest', icon: Heart },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${step >= s.n ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white' : 'bg-[#f0f0f0] text-[#7e7e7e]'}`}>
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.n}</span>
              </div>
              {i < 2 && <div className={`w-8 h-0.5 mx-1 ${step > s.n ? 'bg-[#e33b5f]' : 'bg-[#f0f0f0]'}`} />}
            </div>
          ))}
        </div>

        <Card className="border-[#f0f0f0]">
          <CardHeader>
            <CardTitle className="text-xl text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              {step === 1 && 'Personal Information'}
              {step === 2 && 'Professional Information'}
              {step === 3 && 'Interests & Preferences'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label className="text-[#222]">Full Name</Label><Input placeholder="Enter your full name" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                  <div><Label className="text-[#222]">Email</Label><Input type="email" placeholder="your@email.com" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label className="text-[#222]">Phone Number</Label><Input placeholder="+966 5x xxx xxxx" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                  <div><Label className="text-[#222]">Country</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}><SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {['Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Egypt', 'Jordan', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedCountry === 'Other' && (
                      <Input placeholder="Please specify your country..." className="border-[#f0f0f0] mt-2" value={otherCountry} onChange={e => setOtherCountry(e.target.value)} />
                    )}
                  </div>
                </div>
                <div><Label className="text-[#222]">City</Label><Input placeholder="Enter your city" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label className="text-[#222]">Current Role / Position</Label><Input placeholder="e.g., CEO, CTO, Manager" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                  <div><Label className="text-[#222]">Company / Organization</Label><Input placeholder="Enter company name" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label className="text-[#222]">Years of Experience</Label>
                    <Select><SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['0-2 years', '3-5 years', '6-10 years', '11-15 years', '16-20 years', '20+ years'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[#222]">Industry / Sector</Label>
                    <Select><SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Areas of Expertise</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map(s => (
                      <button key={s} onClick={() => toggleItem(selectedSkills, setSelectedSkills, s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedSkills.includes(s) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Relevant Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Negotiation', 'Fundraising', 'Team Building', 'Project Management', 'Data Analysis', 'Communication', 'Risk Management', 'Innovation'].map(s => (
                      <button key={s} onClick={() => toggleItem(selectedSkills, setSelectedSkills, s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedSkills.includes(s) ? 'bg-[#f07969] text-white border-[#f07969]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#f07969]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label className="text-[#222]">LinkedIn Profile URL</Label><Input placeholder="https://linkedin.com/in/yourprofile" className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                <div><Label className="text-[#222]">Professional Summary</Label><Textarea placeholder="Brief summary of your professional background and achievements..." rows={3} className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label className="text-[#222]">I am a...</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {userTypes.map(t => (
                      <button key={t} onClick={() => toggleItem(selectedUserTypes, setSelectedUserTypes, t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${selectedUserTypes.includes(t) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Investment Interests</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {interests.map(i => (
                      <button key={i} onClick={() => toggleItem(selectedInterests, setSelectedInterests, i)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedInterests.includes(i) ? 'bg-[#f07969] text-white border-[#f07969]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Sector Preferences</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sectors.map(s => (
                      <button key={s} onClick={() => toggleItem(selectedSectors, setSelectedSectors, s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedSectors.includes(s) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Startup Stage Preferences</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stages.map(s => (
                      <button key={s} onClick={() => toggleItem(selectedStages, setSelectedStages, s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedStages.includes(s) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label className="text-[#222]">Motivation for Joining</Label><Textarea placeholder="What drives you to join 1K Leaders?" rows={3} className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
                <div><Label className="text-[#222]">How did you hear about us?</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}><SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedSource === 'Other' && (
                    <Input placeholder="Please specify how you heard about us..." className="border-[#f0f0f0] mt-2" value={otherSource} onChange={e => setOtherSource(e.target.value)} />
                  )}
                </div>
                <div><Label className="text-[#222]">Additional Information</Label><Textarea placeholder="Anything else you'd like to share?" rows={2} className="border-[#f0f0f0] focus:border-[#e33b5f]" /></div>
              </>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="border-[#f0f0f0]"><ArrowLeft className="w-4 h-4 mr-2" /> Previous</Button>
              ) : <div />}
              {step < 3 ? (
                <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold" onClick={() => setStep(step + 1)}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              ) : (
                <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold" onClick={() => setSubmitted(true)}>Submit Application <Check className="w-4 h-4 ml-2" /></Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
