'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check, User, Briefcase, Heart, Rocket } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Brunei','Bulgaria',
  'Cambodia','Cameroon','Canada','Chile','China','Colombia','Congo','Croatia','Cuba','Cyprus','Czechia',
  'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan',
  'Latvia','Lebanon','Libya','Lithuania','Luxembourg',
  'Malaysia','Maldives','Mali','Malta','Mexico','Moldova','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway',
  'Oman','Pakistan','Palestine, State of','Panama','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russian Federation','Rwanda',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Tunisia','Turkey','Turkmenistan',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States of America','Uruguay','Uzbekistan',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

const INDUSTRIES = [
  'Advanced Manufacturing','Aerospace','Agriculture','Agtech','Animal Health','Arts, Culture & Entertainment',
  'Brand & Retail','Crypto & Digital Assets','Deeptech','Education','Energy','Enterprise & AI','Environment',
  'Financial Services','Fintech','Food & Beverage','Healthcare & Wellness','Insurtech',
  'Logistics and Supply Chain','Maritime','Media & Advertising','Medtech','Mobility','New Materials',
  'Real Estate Tech','Robotics','Safetytech','Security','Semiconductors','Smart Cities','Sportech',
  'Sustainability','Technology','Tourism','Transportation and Mobility','Travel & Hospitality','Other',
];

const JOB_LEVELS = ['C-Level','EVP/SVP','VP','Director','Manager','Associate','Co-Founder','Other'];

const PROFILES = [
  {
    id: 'co-founder',
    label: 'Co-Founder',
    desc: "If you're an ambitious entrepreneur and would like to build a startup or join a team of builders.",
  },
  {
    id: 'advisor',
    label: 'Advisor',
    desc: 'If you are an expert in your field with high career ambitions working for a major corporation and ready to extend your knowledge to a team of builders.',
  },
  {
    id: 'idea-owner',
    label: 'Idea Owner',
    desc: "If you have a unique tech idea and want to build it, but don't have the time or resources.",
  },
  {
    id: 'investor',
    label: 'Investor',
    desc: 'If you are an angel investor and interested in qualitative and quantitative returns.',
  },
];

const DOMAINS = [
  'Marketing','Technology','Finance','Strategy and Management','Operations','Legal',
  'Compliance and Risk','Public Relations and Communications','Sales','Human Resources',
  'Product Development','Project Management','Data Analytics','Full-time Entrepreneur','Other',
];

const GENDERS = ['Male','Female','Prefer not to say'];

const PHONE_CODES = [
  { code: '+971', label: 'AE (+971)' },
  { code: '+966', label: 'SA (+966)' },
  { code: '+973', label: 'BH (+973)' },
  { code: '+968', label: 'OM (+968)' },
  { code: '+965', label: 'KW (+965)' },
  { code: '+974', label: 'QA (+974)' },
  { code: '+1',   label: 'US (+1)' },
  { code: '+44',  label: 'GB (+44)' },
  { code: '+91',  label: 'IN (+91)' },
  { code: '+92',  label: 'PK (+92)' },
  { code: '+20',  label: 'EG (+20)' },
  { code: '+962', label: 'JO (+962)' },
  { code: '+961', label: 'LB (+961)' },
  { code: '+49',  label: 'DE (+49)' },
  { code: '+33',  label: 'FR (+33)' },
];

function MultiSelect({ options, selected, onChange, placeholder }: { options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item]);
  return (
    <div className="space-y-2">
      <div className="border border-[#f0f0f0] rounded-lg p-3 bg-white max-h-48 overflow-y-auto">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[#e33b5f] transition-colors text-sm">
            <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} className="data-[state=checked]:bg-[#e33b5f] data-[state=checked]:border-[#e33b5f]" />
            {opt}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(s => (
            <span key={s} className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-[#e33b5f] ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WaitlistForm({ navigate }: Props) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Contact
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+971');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Step 2 — Organisation
  const [orgName, setOrgName] = useState('');
  const [orgSite, setOrgSite] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [orgCountry, setOrgCountry] = useState('');
  const [jobLevel, setJobLevel] = useState('');

  // Step 3 — Leader Profile
  const [profiles, setProfiles] = useState<string[]>([]);
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState('');
  const [story, setStory] = useState('');
  const [other, setOther] = useState('');

  const steps = [
    { n: 1, label: 'Contact Information', icon: User },
    { n: 2, label: 'Organization Information', icon: Briefcase },
    { n: 3, label: 'Leader Profile', icon: Heart },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <Card className="max-w-md w-full text-center border-[#f0f0f0]">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-[#e33b5f]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#e33b5f]" />
            </div>
            <h2 className="text-2xl font-bold text-[#222] mb-2" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Application Submitted!
            </h2>
            <p className="text-[#7e7e7e] mb-2">Thank you for your interest in 1K Leaders.</p>
            <p className="text-[#7e7e7e] mb-6 text-sm">We will review your application and get back to you soon.</p>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold" onClick={() => navigate('landing')} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fieldClass = 'border-[#f0f0f0] focus:border-[#e33b5f] focus-visible:ring-[#e33b5f]/20';

  return (
    <div className="min-h-screen bg-[#f6f6f6] py-8 px-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate('landing')} className="mb-6 text-[#7e7e7e]">
          <ArrowLeft className="w-4 h-4 mr-2" /> {step > 1 ? 'Back' : 'Home'}
        </Button>

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
            Ignite Your Ideas: From Notepad 📝 To Launchpad 🚀
          </h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > s.n ? 'bg-[#e33b5f] text-white' : step === s.n ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white' : 'bg-[#f0f0f0] text-[#9e9e9e]'}`}>
                  {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-xs hidden sm:block text-center max-w-[80px] ${step >= s.n ? 'text-[#444] font-medium' : 'text-[#9e9e9e]'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${step > s.n ? 'bg-[#e33b5f]' : 'bg-[#f0f0f0]'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-[#f0f0f0]">
          <CardHeader>
            <CardTitle className="text-lg text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              {step}. {steps[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── Step 1: Contact Information ── */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[#222]">First Name <span className="text-[#e33b5f]">*</span></Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className={fieldClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#222]">Last Name <span className="text-[#e33b5f]">*</span></Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className={fieldClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Email Address <span className="text-[#e33b5f]">*</span></Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Phone Number <span className="text-[#e33b5f]">*</span></Label>
                  <div className="flex gap-2">
                    <Select value={phoneCode} onValueChange={setPhoneCode}>
                      <SelectTrigger className={`w-36 ${fieldClass}`}><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {PHONE_CODES.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="50 123 4567" className={`flex-1 ${fieldClass}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">LinkedIn Profile URL <span className="text-[#e33b5f]">*</span></Label>
                  <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" className={fieldClass} />
                </div>
              </>
            )}

            {/* ── Step 2: Organisation Information ── */}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Organisation Name <span className="text-[#e33b5f]">*</span></Label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your company or organisation" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Organisation Website</Label>
                  <Input value={orgSite} onChange={e => setOrgSite(e.target.value)} placeholder="https://yourcompany.com" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Organisation Industry / Sector <span className="text-[#e33b5f]">*</span> <span className="text-xs text-[#7e7e7e]">(select all that apply)</span></Label>
                  <MultiSelect options={INDUSTRIES} selected={industries} onChange={setIndustries} placeholder="Select industries" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">Where is your Organisation based? <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={orgCountry} onValueChange={setOrgCountry}>
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#222]">What is your job level in the organisation? <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={jobLevel} onValueChange={setJobLevel}>
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Select job level" /></SelectTrigger>
                    <SelectContent>
                      {JOB_LEVELS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── Step 3: Leader Profile ── */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#222]">Select the profile(s) that best describes you <span className="text-[#e33b5f]">*</span></Label>
                  <p className="text-xs text-[#7e7e7e]">Select all that apply</p>
                  <div className="space-y-3">
                    {PROFILES.map(p => (
                      <label key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${profiles.includes(p.id) ? 'border-[#e33b5f] bg-[#e33b5f]/5' : 'border-[#f0f0f0] hover:border-[#e33b5f]/40'}`}>
                        <Checkbox
                          checked={profiles.includes(p.id)}
                          onCheckedChange={() => setProfiles(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                          className="mt-0.5 data-[state=checked]:bg-[#e33b5f] data-[state=checked]:border-[#e33b5f]"
                        />
                        <div>
                          <p className="font-semibold text-[#222] text-sm">{p.label}</p>
                          <p className="text-xs text-[#7e7e7e] mt-0.5">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Nationality <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Gender <span className="text-[#e33b5f]">*</span></Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Date of Birth <span className="text-[#e33b5f]">*</span></Label>
                  <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className={fieldClass} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Domain of Expertise <span className="text-[#e33b5f]">*</span> <span className="text-xs text-[#7e7e7e]">(select all that apply)</span></Label>
                  <MultiSelect options={DOMAINS} selected={domains} onChange={setDomains} placeholder="Select domains" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Years of Experience <span className="text-[#e33b5f]">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={yearsExp}
                    onChange={e => setYearsExp(e.target.value)}
                    placeholder="e.g. 8"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">
                    We would love to hear how we can be a part of your story and leave a positive impact on your journey. <span className="text-[#e33b5f]">*</span>
                  </Label>
                  <Textarea
                    value={story}
                    onChange={e => setStory(e.target.value)}
                    placeholder="Tell us about yourself and what you hope to achieve..."
                    className={`resize-none ${fieldClass}`}
                    rows={4}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#222]">Any other things you would like us to know? <span className="text-xs text-[#7e7e7e]">(optional)</span></Label>
                  <Textarea
                    value={other}
                    onChange={e => setOther(e.target.value)}
                    placeholder="Anything else you'd like to share..."
                    className={`resize-none ${fieldClass}`}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="border-[#f0f0f0]">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : <div />}
              {step < 3 ? (
                <Button
                  className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold"
                  onClick={() => setStep(step + 1)}
                  style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold"
                  onClick={() => setSubmitted(true)}
                  style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
                >
                  Submit Application <Rocket className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
