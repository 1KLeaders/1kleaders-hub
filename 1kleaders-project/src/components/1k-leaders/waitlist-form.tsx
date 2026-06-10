'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check, User, Briefcase, Heart, Loader2 } from 'lucide-react';
import type { Page } from './types';
import { supabase } from '@/lib/supabase';

interface Props { navigate: (page: Page) => void; }

// Match exact industry list from 1kleaders.com/join
const industries = [
  'Advanced Manufacturing','Aerospace','Agriculture','Agtech','Animal Health',
  'Arts, Culture & Entertainment','Brand & Retail','Crypto & Digital Assets','Deeptech',
  'Education','Energy','Enterprise & AI','Environment','Financial Services','Fintech',
  'Food & Beverage','Healthcare & Wellness','Insurtech','Logistics and Supply Chain',
  'Maritime','Media & Advertising','Medtech','Mobility','New Materials','Real Estate Tech',
  'Robotics','Safetytech','Security','Semiconductors','Smart Cities','Sportech',
  'Sustainability','Technology','Tourism','Transportation and Mobility','Travel & Hospitality','Other',
];

// Match exact expertise domains from 1kleaders.com/join
const expertiseDomains = [
  'Marketing','Technology','Finance','Strategy and Management','Operations','Legal',
  'Compliance and Risk','Public Relations and Communications','Sales','Human Resources',
  'Product Development','Project Management','Data Analytics','Full-time Entrepreneur','Other',
];

// Job levels from 1kleaders.com/join
const jobLevels = ['C-Level','EVP/SVP','VP','Director','Manager','Associate','Co-Founder','Other'];

// Leader profiles from 1kleaders.com/join
const leaderProfiles = [
  { value: 'co-founder', label: 'Co-Founder', desc: 'Ambitious entrepreneur who wants to build a startup or join a team of builders.' },
  { value: 'advisor', label: 'Advisor', desc: 'Expert in your field, high career ambitions, ready to extend knowledge to a team of builders.' },
  { value: 'idea-owner', label: 'Idea Owner', desc: 'Unique tech idea, want to build it, but don\'t have the time or resources.' },
  { value: 'investor', label: 'Investor', desc: 'Angel investor interested in qualitative and quantitative returns.' },
];

const genders = ['Male', 'Female'];

// Full country list (abbreviated for readability)
const countries = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei Darussalam','Bulgaria','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Chad','Chile','China','Colombia','Comoros','Congo',
  'Costa Rica','Croatia','Cuba','Cyprus','Czechia','Denmark','Djibouti','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland',
  'France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Guatemala','Guinea','Haiti',
  'Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia',
  'Lebanon','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malaysia','Maldives',
  'Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro',
  'Morocco','Mozambique','Myanmar','Namibia','Nepal','Netherlands','New Zealand','Nicaragua',
  'Niger','Nigeria','Norway','Oman','Pakistan','Palestine','Panama','Papua New Guinea','Paraguay',
  'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russian Federation','Rwanda',
  'Saudi Arabia','Senegal','Serbia','Sierra Leone','Singapore','Slovakia','Slovenia','Somalia',
  'South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo','Trinidad and Tobago','Tunisia',
  'Turkey','Turkmenistan','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States of America','Uruguay','Uzbekistan','Venezuela','Vietnam',
  'Yemen','Zambia','Zimbabwe',
];

export default function WaitlistForm({ navigate }: Props) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1 - Contact Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('SA(+966)');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Step 2 - Organization Information
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [orgCountry, setOrgCountry] = useState('');
  const [jobLevel, setJobLevel] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');

  // Step 3 - Leader Profile
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const phonePrefixes = [
    'AF(+93)','AL(+355)','DZ(+213)','AD(+376)','AO(+244)','AR(+54)','AM(+374)',
    'AU(+61)','AT(+43)','AZ(+994)','BS(+1)','BH(+973)','BD(+880)','BE(+32)',
    'BR(+55)','BG(+359)','CA(+1)','CL(+56)','CN(+86)','CO(+57)','HR(+385)',
    'CZ(+420)','DK(+45)','EG(+20)','EE(+372)','FI(+358)','FR(+33)','GE(+995)',
    'DE(+49)','GH(+233)','GR(+30)','HK(+852)','HU(+36)','IN(+91)','ID(+62)',
    'IR(+98)','IQ(+964)','IE(+353)','IL(+972)','IT(+39)','JP(+81)','JO(+962)',
    'KZ(+7)','KE(+254)','KW(+965)','LB(+961)','MY(+60)','MX(+52)','MA(+212)',
    'NL(+31)','NZ(+64)','NG(+234)','NO(+47)','OM(+968)','PK(+92)','PS(+970)',
    'PH(+63)','PL(+48)','PT(+351)','QA(+974)','RO(+40)','RU(+7)','SA(+966)',
    'SG(+65)','ZA(+27)','KR(+82)','ES(+34)','SE(+46)','CH(+41)','TW(+886)',
    'TH(+66)','TN(+216)','TR(+90)','AE(+971)','GB(+44)','US(+1)','UZ(+998)',
    'VE(+58)','VN(+84)','YE(+967)','ZM(+260)','ZW(+263)',
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.from('waitlist_submissions').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone_country_code: phoneCountry,
      phone_number: phone,
      linkedin_url: linkedin,
      org_name: orgName,
      org_website: orgWebsite,
      org_industries: selectedIndustries,
      org_country: orgCountry,
      job_level: jobLevel,
      years_experience: Number(yearsExperience),
      leader_profiles: selectedProfiles,
      nationality,
      gender,
      date_of_birth: dateOfBirth,
      expertise_domains: selectedExpertise,
    });
    setIsSubmitting(false);
    if (error) {
      setSubmitError('Something went wrong. Please try again.');
      console.error('Waitlist submission error:', error);
    } else {
      setSubmitted(true);
    }
  };

  const requiredStar = <span className="text-[#e33b5f] ml-0.5">*</span>;

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
            { n: 1, label: 'Contact Info', icon: User },
            { n: 2, label: 'Organization', icon: Briefcase },
            { n: 3, label: 'Leader Profile', icon: Heart },
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
              {step === 1 && '1. Contact Information'}
              {step === 2 && '2. Organization Information'}
              {step === 3 && '3. Leader Profile'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* ── STEP 1: Contact Information ── */}
            {step === 1 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#222]">First Name {requiredStar}</Label>
                    <Input placeholder="First name" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-[#222]">Last Name {requiredStar}</Label>
                    <Input placeholder="Last name" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Email {requiredStar}</Label>
                  <Input type="email" placeholder="your@email.com" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-[#222]">Phone Number {requiredStar}</Label>
                  <div className="flex gap-2">
                    <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                      <SelectTrigger className="border-[#f0f0f0] w-36 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {phonePrefixes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="5x xxx xxxx" className="border-[#f0f0f0] focus:border-[#e33b5f] flex-1" value={phone} onChange={e => setPhone(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">LinkedIn Profile URL {requiredStar}</Label>
                  <Input placeholder="https://linkedin.com/in/yourprofile" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={linkedin} onChange={e => setLinkedin(e.target.value)} required />
                </div>
              </>
            )}

            {/* ── STEP 2: Organization Information ── */}
            {step === 2 && (
              <>
                <div>
                  <Label className="text-[#222]">Organization Name {requiredStar}</Label>
                  <Input placeholder="Enter your organization name" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={orgName} onChange={e => setOrgName(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-[#222]">Organization Website {requiredStar}</Label>
                  <Input placeholder="https://yourcompany.com" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-[#222]">Organization Industry / Sector (select all that apply) {requiredStar}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {industries.map(ind => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => toggleItem(selectedIndustries, setSelectedIndustries, ind)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedIndustries.includes(ind) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Where is your Organization based? {requiredStar}</Label>
                  <Select value={orgCountry} onValueChange={setOrgCountry}>
                    <SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select an Option" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#222]">What is your job level in the organization? {requiredStar}</Label>
                  <Select value={jobLevel} onValueChange={setJobLevel}>
                    <SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select an Option" /></SelectTrigger>
                    <SelectContent>
                      {jobLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#222]">Years of Experience {requiredStar}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    placeholder="e.g. 10"
                    className="border-[#f0f0f0] focus:border-[#e33b5f] w-36"
                    value={yearsExperience}
                    onChange={e => setYearsExperience(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                  />
                </div>
              </>
            )}

            {/* ── STEP 3: Leader Profile ── */}
            {step === 3 && (
              <>
                <div>
                  <Label className="text-[#222]">Select the profile that best describes you {requiredStar}</Label>
                  <p className="text-xs text-[#7e7e7e] mt-1 mb-3">Select all that apply</p>
                  <div className="space-y-3">
                    {leaderProfiles.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => toggleItem(selectedProfiles, setSelectedProfiles, p.value)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition ${selectedProfiles.includes(p.value) ? 'border-[#e33b5f] bg-[#e33b5f]/5' : 'border-[#f0f0f0] bg-white hover:border-[#e33b5f]/50'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${selectedProfiles.includes(p.value) ? 'border-[#e33b5f] bg-[#e33b5f]' : 'border-[#ccc]'}`}>
                            {selectedProfiles.includes(p.value) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-[#222] text-sm">{p.label}</p>
                            <p className="text-xs text-[#7e7e7e] mt-0.5">{p.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">What is your Nationality? {requiredStar}</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select an Option" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#222]">What is your Gender? {requiredStar}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="border-[#f0f0f0]"><SelectValue placeholder="Select an Option" /></SelectTrigger>
                    <SelectContent>
                      {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#222]">Date of Birth {requiredStar}</Label>
                  <Input type="date" className="border-[#f0f0f0] focus:border-[#e33b5f]" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-[#222]">In which domain is your expertise, or where would you like to innovate? (select all that apply) {requiredStar}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {expertiseDomains.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleItem(selectedExpertise, setSelectedExpertise, d)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedExpertise.includes(d) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="border-[#f0f0f0]"><ArrowLeft className="w-4 h-4 mr-2" /> Previous</Button>
              ) : <div />}
              {step < 3 ? (
                <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold" onClick={() => setStep(step + 1)}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              ) : (
                <>
                  {submitError && (
                    <p className="text-sm text-[#e33b5f] text-center">{submitError}</p>
                  )}
                  <Button
                    className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      <>Submit Application <Check className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
