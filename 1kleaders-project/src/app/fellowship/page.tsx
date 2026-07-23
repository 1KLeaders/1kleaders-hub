'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STEPS = ['Personal','Availability','AI & Tech','Mindset','Challenge','Culture','Final','Confirm'];
const TOOLS = ['ChatGPT','Claude','Gemini','Perplexity','Midjourney','Runway','n8n','Zapier','Make','Airtable','Notion','GitHub','Cursor','Replit','Supabase','None of the above','Other'];
const INTERESTS = ['AI automation','AI agents','Venture building','Startup research','Product building','Marketing automation','Content creation','Data analysis','Operations','UI/UX','Sales automation','Legal/admin automation','Founder support'];

type F = {
  fullName: string; email: string; mobile: string; city: string;
  university: string; major: string; academicYear: string; gradYear: string;
  linkedin: string; portfolio: string; isStudent: string;
  commit6mo: string; hoursPerWeek: string; weeklyMeetings: string;
  willingRealProjects: string; partnerTrackInterest: string;
  aiSkillLevel: string; tools: string[]; otherTools: string;
  builtBefore: string; builtDesc: string; canCode: string; interests: string[];
  whyJoin: string; aiGeneralist: string; learnedQuickly: string;
  teamPressure: string; startupProblem: string; describesYou: string;
  challengeOption: string; challengeResponse: string;
  confComfortable: string; willingSignNDA: string; understandVerify: string;
  biggestRisk: string; handleUncertain: string;
  whySelectYou: string; becomeAfter: string; anythingElse: string;
  confStudent: boolean; confAccurate: boolean; confNoGuarantee: boolean;
  confPartnerSelective: boolean; confRules: boolean;
};

const empty: F = {
  fullName:'', email:'', mobile:'', city:'', university:'', major:'',
  academicYear:'', gradYear:'', linkedin:'', portfolio:'', isStudent:'',
  commit6mo:'', hoursPerWeek:'', weeklyMeetings:'', willingRealProjects:'', partnerTrackInterest:'',
  aiSkillLevel:'', tools:[], otherTools:'', builtBefore:'', builtDesc:'', canCode:'', interests:[],
  whyJoin:'', aiGeneralist:'', learnedQuickly:'', teamPressure:'', startupProblem:'', describesYou:'',
  challengeOption:'', challengeResponse:'',
  confComfortable:'', willingSignNDA:'', understandVerify:'', biggestRisk:'', handleUncertain:'',
  whySelectYou:'', becomeAfter:'', anythingElse:'',
  confStudent:false, confAccurate:false, confNoGuarantee:false, confPartnerSelective:false, confRules:false,
};

function Chip({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`px-4 py-3 rounded-lg border text-sm font-medium transition text-left ${
        active ? 'border-[#e33b5f] bg-[#fff5f7] text-[#c02d4f] border-2 font-semibold' :
        disabled ? 'border-[#e8e8e8] bg-[#f6f6f6] text-[#9e9e9e] cursor-not-allowed opacity-50' :
        'border-[#e8e8e8] bg-white text-[#222] hover:border-[#e33b5f]/40'
      }`}>
      {label}
    </button>
  );
}

export default function FellowshipPage() {
  const [step,       setStep]       = useState(0); // 0=cover, 1-8=form, 9=success
  const [f,          setF]          = useState<F>(empty);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof F, val: any) => {
    setF(prev => ({ ...prev, [field]: val }));
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const toggleTool = (val: string) => {
    const NONE = 'None of the above';
    setF(prev => {
      let arr = [...prev.tools];
      if (val === NONE) { arr = arr.includes(NONE) ? [] : [NONE]; }
      else { arr = arr.filter(x => x !== NONE); arr.includes(val) ? arr = arr.filter(x => x !== val) : arr.push(val); }
      return { ...prev, tools: arr };
    });
    setErrors(prev => { const e = { ...prev }; delete e.tools; return e; });
  };

  const toggleInterest = (val: string) => {
    setF(prev => {
      let arr = [...prev.interests];
      if (arr.includes(val)) arr = arr.filter(x => x !== val);
      else if (arr.length < 3) arr.push(val);
      return { ...prev, interests: arr };
    });
  };

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    const need = (keys: (keyof F)[]) => keys.forEach(k => {
      const v = f[k];
      if (!v || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)) e[k] = 'Required';
    });
    if (s === 1) {
      need(['fullName','email','mobile','city','university','major','academicYear','gradYear','linkedin','isStudent']);
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address';
    }
    if (s === 2) need(['commit6mo','hoursPerWeek','weeklyMeetings','willingRealProjects','partnerTrackInterest']);
    if (s === 3) { need(['aiSkillLevel','tools','builtBefore','canCode','interests']); if (f.tools.includes('Other') && !f.otherTools.trim()) e.otherTools = 'Required'; }
    if (s === 4) need(['whyJoin','aiGeneralist','learnedQuickly','teamPressure','startupProblem','describesYou']);
    if (s === 5) need(['challengeOption','challengeResponse']);
    if (s === 6) need(['confComfortable','willingSignNDA','understandVerify','biggestRisk','handleUncertain']);
    if (s === 7) need(['whySelectYou','becomeAfter']);
    if (s === 8) { ['confStudent','confAccurate','confNoGuarantee','confPartnerSelective','confRules'].forEach(k => { if (!f[k as keyof F]) e[k] = 'req'; }); }
    return e;
  }

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) { setErrors(e); window.scrollTo(0,0); return; }
    setStep(s => s + 1); setErrors({}); window.scrollTo(0,0);
  };

  const back = () => { setStep(s => Math.max(0, s - 1)); setErrors({}); window.scrollTo(0,0); };

  const submit = async () => {
    const e = validate(8);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    await supabase.from('fellowship_applications').insert({
      full_name: f.fullName, email: f.email, mobile: f.mobile, city: f.city,
      university: f.university, major: f.major, academic_year: f.academicYear,
      grad_year: f.gradYear, linkedin: f.linkedin, portfolio: f.portfolio, is_student: f.isStudent,
      commit_6mo: f.commit6mo, hours_per_week: f.hoursPerWeek, weekly_meetings: f.weeklyMeetings,
      willing_real_projects: f.willingRealProjects, partner_track_interest: f.partnerTrackInterest,
      ai_skill_level: f.aiSkillLevel, tools: f.tools, other_tools: f.otherTools,
      built_before: f.builtBefore, built_desc: f.builtDesc, can_code: f.canCode, interests: f.interests,
      why_join: f.whyJoin, ai_generalist: f.aiGeneralist, learned_quickly: f.learnedQuickly,
      team_pressure: f.teamPressure, startup_problem: f.startupProblem, describes_you: f.describesYou,
      challenge_option: f.challengeOption, challenge_response: f.challengeResponse,
      conf_comfortable: f.confComfortable, willing_sign_nda: f.willingSignNDA,
      understand_verify: f.understandVerify, biggest_risk: f.biggestRisk, handle_uncertain: f.handleUncertain,
      why_select_you: f.whySelectYou, become_after: f.becomeAfter, anything_else: f.anythingElse,
    });
    setSubmitting(false);
    setStep(9);
    window.scrollTo(0,0);
  };

  const CHALLENGE_OPTIONS = [
    { key: 'Option A — Automation Thinking', desc: 'Choose one repetitive task at your university or in daily life and explain how you\'d automate it using AI.', bullets: ['The problem','Who has the problem','The current manual process','Your proposed AI / automation solution','Tools you might use','The expected benefit'] },
    { key: 'Option B — Venture-Builder Thinking', desc: 'Choose a startup idea and explain how AI can help validate it faster.', bullets: ['The startup idea','The target customer','The main problem','How AI helps with research, testing, marketing, or operations','The first prototype you would build'] },
    { key: 'Option C — AI Assistant Thinking', desc: 'Design an AI assistant for 1K Leaders.', bullets: ['Name of the assistant','Who uses it','What tasks it performs','What tools / data it needs','How success would be measured'] },
  ];

  // ── COVER ────────────────────────────────────────────────────
  if (step === 0) return (
    <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <img src="/logo-light-mid.png" alt="1K Leaders" className="h-8 mb-10 object-contain" />
        <p className="text-xs font-bold tracking-widest text-[#f07969] uppercase mb-4">Application · Cohort 2026</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-none tracking-tight mb-5">
          AI Venture Builder<br />Fellowship
        </h1>
        <p className="text-white/70 text-lg leading-relaxed max-w-xl mb-2">
          A six-month program for university students who want to become AI generalists — building real automations, agents, and ventures alongside the 1K Leaders team.
        </p>
        <p className="font-mono text-[#f07969] text-sm mb-10">Invent, Build, Scale…</p>

        <div className="grid grid-cols-4 border border-white/10 rounded-xl overflow-hidden mb-10">
          {[['6 mo','Fellowship'],['~25 min','To complete'],['Jul 31','Deadline'],['EN','Language']].map(([val, label], i) => (
            <div key={i} className="bg-white/5 p-4 border-r border-white/10 last:border-r-0">
              <div className={`font-mono text-lg font-bold ${i === 2 ? 'text-[#f07969]' : 'text-white'}`}>{val}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <Button size="lg" className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white px-8 h-13 text-base"
            onClick={() => { setStep(1); window.scrollTo(0,0); }}>
            Begin application →
          </Button>
          <span className="text-sm text-white/40">Open to current university students only.</span>
        </div>
      </div>
    </div>
  );

  // ── SUCCESS ──────────────────────────────────────────────────
  if (step === 9) return (
    <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="w-16 h-16 rounded-full bg-[#e33b5f] flex items-center justify-center mx-auto mb-7">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs font-bold tracking-widest text-[#f07969] uppercase mb-4">Application received</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4">
          {f.fullName ? `You're in the pile, ${f.fullName.split(' ')[0]}.` : 'Your application is in.'}
        </h1>
        <p className="text-white/70 leading-relaxed mb-10">
          Thanks for applying to the AI Venture Builder Fellowship. We review every application by hand — you'll hear from us by email after the July 31 deadline with next steps.
        </p>
        <p className="font-mono text-sm text-[#f07969]">Invent, Build, Scale…</p>
      </div>
    </div>
  );

  // ── FORM ─────────────────────────────────────────────────────
  const pct = ((step - 1) / 7) * 100;
  const err = (k: keyof F) => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k]}</p> : null;
  const TITLES = ['Personal Information','Availability & Commitment','AI & Technical Background','Startup & Venture-Building Mindset','Practical Challenge','Culture & Ethics','Final Questions','Confirm & Submit'];
  const INTROS = [
    'Tell us who you are and where you study.',
    'The fellowship runs six months. Let\'s make sure the timing works for you.',
    'Where you\'re starting from — there are no wrong answers here.',
    'How you think about building. Be specific and honest.',
    'One mini-task to complete before your interview. Pick the track that fits you best.',
    'Working on real ventures means real responsibility. A few quick checks.',
    'Last few — tell us what we\'d miss if we didn\'t read your file closely.',
    'Review and confirm the statements below, then submit your application.',
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#f0f0f0]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <img src="/logo-mark-coral.png" alt="1KL" className="h-5 object-contain" onError={e => (e.currentTarget.style.display='none')} />
              <span className="text-sm font-bold text-[#222]">AI Venture Builder Fellowship</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#e33b5f] bg-[#fff5f7] px-2 py-1 rounded">DEADLINE · JUL 31</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((label, i) => {
              const n = i + 1; const reached = step >= n; const curr = step === n;
              return (
                <div key={label} className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (step > n) { setStep(n); setErrors({}); window.scrollTo(0,0); } }}>
                  <div className={`h-1 rounded-full mb-1.5 transition-colors ${reached ? 'bg-[#e33b5f]' : 'bg-[#e8e8e8]'}`} />
                  <p className={`text-[10px] font-semibold truncate ${curr ? 'text-[#e33b5f]' : reached ? 'text-[#7e7e7e]' : 'text-[#b0b0b0]'}`}>{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 pb-32">
        <p className="text-xs font-bold tracking-widest text-[#e33b5f] uppercase mb-2">Section {step} of 7</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#222] mb-2">{TITLES[step - 1]}</h2>
        <p className="text-[#7e7e7e] mb-8 max-w-xl">{INTROS[step - 1]}</p>

        {/* Step 1 — Personal */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <Label>Full name <span className="text-[#e33b5f]">*</span></Label>
              <Input className="mt-1 border-[#e8e8e8]" placeholder="e.g. Layla Al-Otaibi" value={f.fullName} onChange={e => set('fullName', e.target.value)} />
              {err('fullName')}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Email address <span className="text-[#e33b5f]">*</span></Label>
                <Input type="email" className="mt-1 border-[#e8e8e8]" placeholder="you@email.com" value={f.email} onChange={e => set('email', e.target.value)} />
                {err('email')}
              </div>
              <div>
                <Label>Mobile number <span className="text-[#e33b5f]">*</span></Label>
                <Input type="tel" className="mt-1 border-[#e8e8e8]" placeholder="+966 …" value={f.mobile} onChange={e => set('mobile', e.target.value)} />
                {err('mobile')}
              </div>
              <div>
                <Label>City <span className="text-[#e33b5f]">*</span></Label>
                <Input className="mt-1 border-[#e8e8e8]" value={f.city} onChange={e => set('city', e.target.value)} />
                {err('city')}
              </div>
              <div>
                <Label>University <span className="text-[#e33b5f]">*</span></Label>
                <Input className="mt-1 border-[#e8e8e8]" value={f.university} onChange={e => set('university', e.target.value)} />
                {err('university')}
              </div>
              <div>
                <Label>Major <span className="text-[#e33b5f]">*</span></Label>
                <Input className="mt-1 border-[#e8e8e8]" value={f.major} onChange={e => set('major', e.target.value)} />
                {err('major')}
              </div>
              <div>
                <Label>Current academic year <span className="text-[#e33b5f]">*</span></Label>
                <Select value={f.academicYear} onValueChange={v => set('academicYear', v)}>
                  <SelectTrigger className="mt-1 border-[#e8e8e8]"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['1st year','2nd year','3rd year','4th year','5th year or beyond',"Master's / postgraduate"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                {err('academicYear')}
              </div>
              <div>
                <Label>Expected graduation year <span className="text-[#e33b5f]">*</span></Label>
                <Select value={f.gradYear} onValueChange={v => set('gradYear', v)}>
                  <SelectTrigger className="mt-1 border-[#e8e8e8]"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['2026','2027','2028','2029','2030','2031 or later'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                {err('gradYear')}
              </div>
            </div>
            <div>
              <Label>LinkedIn profile <span className="text-[#e33b5f]">*</span></Label>
              <Input className="mt-1 border-[#e8e8e8]" placeholder="linkedin.com/in/…" value={f.linkedin} onChange={e => set('linkedin', e.target.value)} />
              {err('linkedin')}
            </div>
            <div>
              <Label>Portfolio / GitHub / website <span className="text-[#7e7e7e] text-xs font-normal">(optional)</span></Label>
              <Input className="mt-1 border-[#e8e8e8]" placeholder="https://…" value={f.portfolio} onChange={e => set('portfolio', e.target.value)} />
            </div>
            <div>
              <Label className="block mb-2">Are you currently a university student? <span className="text-[#e33b5f]">*</span></Label>
              <div className="flex gap-3">
                {['Yes','No'].map(o => <Chip key={o} label={o} active={f.isStudent === o} onClick={() => set('isStudent', o)} />)}
              </div>
              {err('isStudent')}
              {f.isStudent === 'No' && (
                <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">This fellowship is open to <strong>current university students</strong> only. Based on your answer, you're not eligible to continue.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Availability */}
        {step === 2 && (
          <div className="space-y-7">
            {([
              { field: 'commit6mo', q: 'Can you commit to the full 6-month fellowship?', opts: ['Yes','No','Not sure'] },
              { field: 'hoursPerWeek', q: 'How many hours per week can you realistically commit?', opts: ['Less than 5 hours','5–8 hours','8–12 hours','12+ hours'] },
              { field: 'weeklyMeetings', q: 'Are you available for weekly meetings or workshops?', opts: ['Yes','No','Depends on timing'] },
              { field: 'willingRealProjects', q: 'Are you willing to work on real internal 1K Leaders projects after the training phase?', opts: ['Yes','No'] },
              { field: 'partnerTrackInterest', q: 'Are you interested in qualifying for the 13-month Partner Track after the fellowship?', opts: ['Yes','No','Maybe, I want to learn more first'] },
            ] as { field: keyof F; q: string; opts: string[] }[]).map(({ field, q, opts }) => (
              <div key={field}>
                <Label className="block mb-2">{q} <span className="text-[#e33b5f]">*</span></Label>
                <div className="flex flex-wrap gap-2.5">
                  {opts.map(o => <Chip key={o} label={o} active={f[field] === o} onClick={() => set(field, o)} />)}
                </div>
                {err(field)}
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — AI & Tech */}
        {step === 3 && (
          <div className="space-y-7">
            <div>
              <Label className="block mb-2">How would you describe your current AI skill level? <span className="text-[#e33b5f]">*</span></Label>
              <div className="flex flex-wrap gap-2.5">
                {['Beginner','Intermediate','Advanced','I use AI daily but haven\'t built systems yet'].map(o => <Chip key={o} label={o} active={f.aiSkillLevel === o} onClick={() => set('aiSkillLevel', o)} />)}
              </div>
              {err('aiSkillLevel')}
            </div>
            <div>
              <Label className="block mb-1">Which tools have you used before? <span className="text-[#e33b5f]">*</span></Label>
              <p className="text-sm text-[#7e7e7e] mb-2">Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map(o => <Chip key={o} label={o} active={f.tools.includes(o)} onClick={() => toggleTool(o)} />)}
              </div>
              {f.tools.includes('Other') && (
                <div className="mt-3">
                  <Input className="border-[#e8e8e8]" placeholder="Which other tools?" value={f.otherTools} onChange={e => set('otherTools', e.target.value)} />
                  {err('otherTools')}
                </div>
              )}
              {err('tools')}
            </div>
            <div>
              <Label className="block mb-2">Have you ever built an automation, chatbot, AI assistant, website, app, or workflow? <span className="text-[#e33b5f]">*</span></Label>
              <div className="flex gap-2.5">
                {['Yes','No'].map(o => <Chip key={o} label={o} active={f.builtBefore === o} onClick={() => set('builtBefore', o)} />)}
              </div>
              {err('builtBefore')}
            </div>
            <div>
              <Label>Briefly describe anything you have built before. <span className="text-[#7e7e7e] text-xs font-normal">(optional)</span></Label>
              <Textarea className="mt-1 border-[#e8e8e8]" rows={3} placeholder="A sentence or two is fine." value={f.builtDesc} onChange={e => set('builtDesc', e.target.value)} />
            </div>
            <div>
              <Label className="block mb-2">Do you know how to code? <span className="text-[#e33b5f]">*</span></Label>
              <div className="flex flex-wrap gap-2.5">
                {['No','Basic','Intermediate','Advanced'].map(o => <Chip key={o} label={o} active={f.canCode === o} onClick={() => set('canCode', o)} />)}
              </div>
              {err('canCode')}
            </div>
            <div>
              <Label className="block mb-1">Which areas interest you most? <span className="text-[#e33b5f]">*</span></Label>
              <p className="text-sm text-[#7e7e7e] mb-2">Select up to 3 — <span className="font-mono text-[#e33b5f] font-bold">{f.interests.length} of 3</span> selected</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(o => {
                  const active = f.interests.includes(o);
                  const disabled = !active && f.interests.length >= 3;
                  return <Chip key={o} label={o} active={active} disabled={disabled} onClick={() => !disabled && toggleInterest(o)} />;
                })}
              </div>
              {err('interests')}
            </div>
          </div>
        )}

        {/* Step 4 — Mindset */}
        {step === 4 && (
          <div className="space-y-5">
            {([
              { field: 'whyJoin', label: 'Why do you want to join the 1KL AI Venture Builder Fellowship?' },
              { field: 'aiGeneralist', label: 'What does "AI Generalist" mean to you?' },
              { field: 'learnedQuickly', label: 'Tell us about a time you learned something difficult quickly.' },
              { field: 'teamPressure', label: 'Tell us about a time you worked in a team under pressure.' },
              { field: 'startupProblem', label: 'What kind of startup problem would you be excited to solve using AI?' },
            ] as { field: keyof F; label: string }[]).map(({ field, label }) => (
              <div key={field}>
                <Label>{label} <span className="text-[#e33b5f]">*</span></Label>
                <Textarea className="mt-1 border-[#e8e8e8]" rows={4} value={f[field] as string} onChange={e => set(field, e.target.value)} />
                {err(field)}
              </div>
            ))}
            <div>
              <Label className="block mb-2">Which describes you best? <span className="text-[#e33b5f]">*</span></Label>
              <div className="flex flex-wrap gap-2.5">
                {['Builder','Researcher','Operator','Designer','Marketer','Strategist','Technical learner','Not sure yet'].map(o => <Chip key={o} label={o} active={f.describesYou === o} onClick={() => set('describesYou', o)} />)}
              </div>
              {err('describesYou')}
            </div>
          </div>
        )}

        {/* Step 5 — Challenge */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="text-sm text-[#555353] bg-[#fff5f7] border border-[#f07969]/20 rounded-lg p-4">
              Complete <strong>one</strong> mini-task before your interview. Pick the track that fits you best — you'll write your answer below.
            </div>
            <div className="space-y-3">
              {CHALLENGE_OPTIONS.map(c => {
                const active = f.challengeOption === c.key;
                return (
                  <div key={c.key} onClick={() => set('challengeOption', c.key)}
                    className={`p-5 rounded-xl border cursor-pointer transition ${active ? 'border-[#e33b5f] border-2 bg-[#fff5f7]' : 'border-[#e8e8e8] bg-white hover:border-[#e33b5f]/40'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-extrabold text-[#222]">{c.key}</p>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 transition ${active ? 'border-[#e33b5f] bg-[#e33b5f]' : 'border-[#d0d0d0]'}`} />
                    </div>
                    <p className="text-[#7e7e7e] text-sm mt-1.5">{c.desc}</p>
                    <ul className="mt-3 space-y-1 pl-4">
                      {c.bullets.map(b => <li key={b} className="text-sm text-[#7e7e7e] list-disc">{b}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
            {err('challengeOption')}
            {f.challengeOption && (
              <div>
                <Label>Your response <span className="text-[#e33b5f]">*</span></Label>
                <Textarea className="mt-1 border-[#e8e8e8]" rows={8} placeholder="Address each point above in your answer…" value={f.challengeResponse} onChange={e => set('challengeResponse', e.target.value)} />
                {err('challengeResponse')}
              </div>
            )}
          </div>
        )}

        {/* Step 6 — Culture */}
        {step === 6 && (
          <div className="space-y-7">
            {([
              { field: 'confComfortable', q: 'Are you comfortable working with confidential startup and company information?', opts: ['Yes','No'] },
              { field: 'willingSignNDA', q: 'Are you willing to sign a confidentiality and IP assignment agreement before accessing internal projects?', opts: ['Yes','No'] },
              { field: 'understandVerify', q: 'Do you understand that using AI does not remove your responsibility to verify accuracy and quality?', opts: ['Yes','No'] },
            ] as { field: keyof F; q: string; opts: string[] }[]).map(({ field, q, opts }) => (
              <div key={field}>
                <Label className="block mb-2">{q} <span className="text-[#e33b5f]">*</span></Label>
                <div className="flex gap-2.5">
                  {opts.map(o => <Chip key={o} label={o} active={f[field] === o} onClick={() => set(field, o)} />)}
                </div>
                {err(field)}
              </div>
            ))}
            {([
              { field: 'biggestRisk', label: 'What do you think is the biggest risk when using AI in business operations?' },
              { field: 'handleUncertain', label: 'How would you handle a situation where an AI tool gives you an answer you\'re not sure about?' },
            ] as { field: keyof F; label: string }[]).map(({ field, label }) => (
              <div key={field}>
                <Label>{label} <span className="text-[#e33b5f]">*</span></Label>
                <Textarea className="mt-1 border-[#e8e8e8]" rows={4} value={f[field] as string} onChange={e => set(field, e.target.value)} />
                {err(field)}
              </div>
            ))}
          </div>
        )}

        {/* Step 7 — Final */}
        {step === 7 && (
          <div className="space-y-5">
            {([
              { field: 'whySelectYou', label: 'Why should we select you?' },
              { field: 'becomeAfter', label: 'What do you hope to become after 12–18 months?' },
              { field: 'anythingElse', label: 'Is there anything else you want us to know?', optional: true },
            ] as { field: keyof F; label: string; optional?: boolean }[]).map(({ field, label, optional }) => (
              <div key={field}>
                <Label>{label} {optional ? <span className="text-[#7e7e7e] text-xs font-normal">(optional)</span> : <span className="text-[#e33b5f]">*</span>}</Label>
                <Textarea className="mt-1 border-[#e8e8e8]" rows={4} value={f[field] as string} onChange={e => set(field, e.target.value)} />
                {!optional && err(field)}
              </div>
            ))}
          </div>
        )}

        {/* Step 8 — Confirm */}
        {step === 8 && (
          <div className="space-y-5">
            <p className="text-[#7e7e7e]">By submitting this application, I confirm that:</p>
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-6 space-y-4 shadow-sm">
              {([
                { field: 'confStudent',        label: 'I am currently a university student.' },
                { field: 'confAccurate',       label: 'All information provided is accurate.' },
                { field: 'confNoGuarantee',    label: 'I understand that acceptance does not guarantee employment, partnership, or shares.' },
                { field: 'confPartnerSelective',label: 'I understand that the Partner Track is selective and performance-based.' },
                { field: 'confRules',          label: 'I am willing to follow 1K Leaders\' confidentiality, IP, AI-usage, and conduct rules.' },
              ] as { field: keyof F; label: string }[]).map(({ field, label }) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={f[field] as boolean} onCheckedChange={v => set(field, !!v)}
                    className={`mt-0.5 ${errors[field] ? 'border-red-500' : ''}`} />
                  <span className="text-sm text-[#333] leading-relaxed">{label}</span>
                </label>
              ))}
            </div>
            {['confStudent','confAccurate','confNoGuarantee','confPartnerSelective','confRules'].some(k => errors[k]) && (
              <p className="text-sm text-red-500 font-medium">Please confirm all five statements before submitting.</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-[#e8e8e8]">
          <Button variant="outline" onClick={back} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 8 ? (
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white gap-1" onClick={next} disabled={f.isStudent === 'No'}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white gap-2" onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />Submit application</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
