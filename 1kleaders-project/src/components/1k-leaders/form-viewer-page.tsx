'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronRight, ChevronLeft, Check, Star, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type Field = {
  id: string; type: string; label: string; required: boolean;
  placeholder?: string; help_text?: string; options?: string[];
  kyc_doc_type?: string;
};

type Form = {
  id: string; title: string; description: string | null;
  is_anonymous: boolean; show_progress: boolean; accent_color: string;
  fields: Field[]; purpose?: string;
};

// Answer stored for a file field
type FileAnswer = { bucket: string; path: string; name: string; size: number; mime: string };

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

interface Props { formId: string; navigate?: (p: string) => void; }

export default function FormViewerPage({ formId, navigate }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [form,      setForm]      = useState<Form | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [step,      setStep]      = useState(-1); // -1 = intro, fields.length = thank you
  const [answers,   setAnswers]   = useState<Record<string, any>>({});
  const [submitting,setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement|HTMLTextAreaElement|null>(null);
  const fileInputRef = useRef<HTMLInputElement|null>(null);

  useEffect(() => {
    supabase.from('forms').select('*').eq('id', formId).eq('is_published', true).single()
      .then(({ data }) => { setForm(data as Form); setLoading(false); });
  }, [formId]);

  useEffect(() => {
    // Auto-focus input on step change
    setTimeout(() => {
      const el = document.querySelector('[data-form-input]') as HTMLElement;
      el?.focus();
    }, 300);
  }, [step]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" />
    </div>
  );

  if (!form) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-[#9e9e9e]">This form is not available.</p>
      {navigate && <Button variant="outline" onClick={() => navigate('forms')}>Back to Forms</Button>}
    </div>
  );

  const accent = form.accent_color ?? '#e33b5f';
  const fields = form.fields;
  const field  = step >= 0 && step < fields.length ? fields[step] : null;
  const progress = step < 0 ? 0 : Math.round(((step + 1) / fields.length) * 100);

  function validateCurrent(): boolean {
    if (!field) return true;
    if (field.required && !answers[field.id]) { setError('This field is required.'); return false; }
    if (field.type === 'email' && answers[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers[field.id])) {
      setError('Please enter a valid email address.'); return false;
    }
    setError('');
    return true;
  }

  function next() {
    if (!validateCurrent()) return;
    if (step < fields.length - 1) setStep(s => s + 1);
    else submit();
  }

  function prev() { if (step > 0) setStep(s => s - 1); else setStep(-1); }

  const isKyc = form.purpose === 'kyc';

  // Files upload as soon as they're picked; the answer keeps the storage location
  async function uploadFile(f: Field, file: File) {
    if (!profile) { setError('Please sign in to upload files.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('File is too large (max 25 MB).'); return; }
    setUploading(true); setError('');
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const bucket = isKyc ? 'kyc-documents' : 'form-uploads';
    const path = isKyc
      ? `${profile.id}/${f.kyc_doc_type ?? `form-${f.id}`}/${Date.now()}_${safe}`
      : `${profile.id}/${form!.id}/${f.id}/${Date.now()}_${safe}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
    setUploading(false);
    if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }
    const value: FileAnswer = { bucket, path, name: file.name, size: file.size, mime: file.type };
    setAnswers(a => ({ ...a, [f.id]: value }));
  }

  async function submit() {
    if (!form) return;
    setSubmitting(true); setError('');
    const { data: response, error: insErr } = await supabase.from('form_responses').insert({
      form_id:  form.id,
      user_id:  form.is_anonymous && !isKyc ? null : profile?.id ?? null,
      answers,
    }).select('id').single();

    if (insErr) { setSubmitting(false); setError(`Could not submit: ${insErr.message}`); return; }

    // KYC forms: every upload becomes a KYC document, plus one entry holding the written answers
    if (isKyc && profile) {
      const now = new Date().toISOString();
      const usedTypes = new Set<string>();
      const uploads = fields.filter(f => f.type === 'file' && answers[f.id]?.path).map(f => {
        const a = answers[f.id] as FileAnswer;
        // one row per (user, doc_type) — keep types unique if two questions share one (e.g. 'other')
        let docType = f.kyc_doc_type ?? `form-${f.id}`;
        if (usedTypes.has(docType)) docType = `${docType}-${f.id}`;
        usedTypes.add(docType);
        return {
          user_id: profile.id, doc_type: docType, storage_path: a.path,
          file_name: a.name, file_size_bytes: a.size, status: 'submitted', uploaded_at: now,
          source: 'form', form_response_id: response?.id ?? null,
        };
      });
      const written = Object.fromEntries(fields.filter(f => f.type !== 'file' && answers[f.id] !== undefined && answers[f.id] !== '')
        .map(f => [f.label, answers[f.id]]));
      const rows = [
        ...uploads,
        { user_id: profile.id, doc_type: 'kyc-form', storage_path: null, file_name: form.title, file_size_bytes: null,
          status: 'submitted', uploaded_at: now, source: 'form', form_response_id: response?.id ?? null, answers: written },
      ];
      const { error: kycErr } = await supabase.from('kyc_documents').upsert(rows, { onConflict: 'user_id,doc_type' });
      if (kycErr) { setSubmitting(false); setError(`Saved your answers, but KYC documents failed: ${kycErr.message}`); return; }

      const early = [null, '', 'Meeting Completed', 'Agreement Signed', 'Platform Access Issued', 'KYC Pending'];
      if (early.includes(profile.onboarding_status)) {
        await supabase.from('profiles').update({ onboarding_status: 'KYC Submitted', updated_at: now }).eq('id', profile.id);
        await refreshProfile();
      }
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next(); }
  }

  // Thank you screen
  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: `linear-gradient(135deg, ${accent}10, white)` }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: accent }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-black text-[#222] mb-3">Thank you!</h1>
      <p className="text-[#7e7e7e] mb-8">
        {form.purpose === 'kyc'
          ? 'Your KYC details and documents have been submitted. Next step: payment.'
          : 'Your response has been submitted successfully.'}
      </p>
      {navigate && (form.purpose === 'kyc'
        ? <Button className="text-white" style={{ backgroundColor: accent }} onClick={() => navigate('onboarding')}>Continue to Payment →</Button>
        : <Button variant="outline" onClick={() => navigate('forms')}>Back to Forms</Button>)}
    </div>
  );

  // Intro screen
  if (step === -1) return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${accent}08, white)` }}>
      {/* Logo */}
      <div className="p-6 border-b border-[#f0f0f0] bg-white/80 backdrop-blur">
        <img src="/logos/logos_1KL-Hub_Horizontal_Dark.png" alt="1KL Hub" style={{ height: '24px', width: 'auto' }} />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: accent + '15' }}>
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-4xl font-black text-[#222] tracking-tight">{form.title}</h1>
          {form.description && <p className="text-lg text-[#7e7e7e] leading-relaxed">{form.description}</p>}
          <div className="flex items-center justify-center gap-6 text-sm text-[#9e9e9e]">
            <span>{fields.length} question{fields.length !== 1 ? 's' : ''}</span>
            {form.is_anonymous && <span>🔒 Anonymous</span>}
          </div>
          <Button className="text-white px-10 py-6 text-lg rounded-xl" style={{ backgroundColor: accent }}
            onClick={() => setStep(0)}>
            Start <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Question screen
  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${accent}05, white)` }}>
      {/* Header */}
      <div className="p-4 border-b border-[#f0f0f0] bg-white/80 backdrop-blur flex items-center gap-4">
        <img src="/logos/logos_1KL-Hub_Horizontal_Dark.png" alt="1KL Hub" style={{ height: '20px', width: 'auto' }} />
        {form.show_progress && (
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
            </div>
            <span className="text-xs text-[#9e9e9e] flex-shrink-0">{step + 1}/{fields.length}</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-6" onKeyDown={handleKey}>
          {/* Step number */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: accent }}>{step + 1}</span>
            <ChevronRight className="w-4 h-4" style={{ color: accent }} />
          </div>

          {/* Label */}
          <h2 className="text-2xl font-bold text-[#222]">
            {field?.label}
            {field?.required && <span style={{ color: accent }} className="ml-1">*</span>}
          </h2>
          {field?.help_text && <p className="text-[#7e7e7e]">{field.help_text}</p>}

          {/* Input */}
          {field?.type === 'text' && (
            <input data-form-input autoFocus className="w-full border-b-2 border-[#f0f0f0] focus:border-current bg-transparent text-lg py-2 outline-none text-[#222] placeholder-[#9e9e9e] transition-colors"
              style={{ borderBottomColor: answers[field.id] ? accent : undefined }}
              placeholder={field.placeholder ?? 'Your answer...'}
              value={answers[field.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} />
          )}
          {field?.type === 'textarea' && (
            <textarea data-form-input autoFocus rows={4} className="w-full border-2 border-[#f0f0f0] focus:border-current rounded-xl p-3 text-base outline-none text-[#222] placeholder-[#9e9e9e] resize-none bg-white/80 transition-colors"
              placeholder={field.placeholder ?? 'Your answer...'}
              value={answers[field.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} />
          )}
          {field?.type === 'email' && (
            <input data-form-input type="email" autoFocus className="w-full border-b-2 border-[#f0f0f0] bg-transparent text-lg py-2 outline-none text-[#222] placeholder-[#9e9e9e]"
              placeholder={field.placeholder ?? 'name@example.com'}
              value={answers[field.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} />
          )}
          {field?.type === 'number' && (
            <input data-form-input type="number" autoFocus className="w-full border-b-2 border-[#f0f0f0] bg-transparent text-lg py-2 outline-none text-[#222] placeholder-[#9e9e9e]"
              placeholder={field.placeholder ?? '0'}
              value={answers[field.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} />
          )}
          {field?.type === 'date' && (
            <input data-form-input type="date" autoFocus className="w-full border-b-2 border-[#f0f0f0] bg-transparent text-lg py-2 outline-none text-[#222]"
              value={answers[field.id] ?? ''}
              onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} />
          )}
          {field?.type === 'select' && (
            <div className="space-y-2">
              {(field.options ?? []).map(opt => (
                <button key={opt} onClick={() => setAnswers(a => ({ ...a, [field.id]: opt }))}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium"
                  style={{ borderColor: answers[field.id] === opt ? accent : '#f0f0f0', backgroundColor: answers[field.id] === opt ? accent + '10' : 'white', color: answers[field.id] === opt ? accent : '#222' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {field?.type === 'radio' && (
            <div className="space-y-2">
              {(field.options ?? []).map((opt, i) => (
                <button key={opt} onClick={() => setAnswers(a => ({ ...a, [field.id]: opt }))}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3"
                  style={{ borderColor: answers[field.id] === opt ? accent : '#f0f0f0', backgroundColor: answers[field.id] === opt ? accent + '10' : 'white' }}>
                  <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ borderColor: accent, backgroundColor: answers[field.id] === opt ? accent : 'white', color: answers[field.id] === opt ? 'white' : accent }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium" style={{ color: answers[field.id] === opt ? accent : '#222' }}>{opt}</span>
                </button>
              ))}
            </div>
          )}
          {field?.type === 'multiselect' && (
            <div className="space-y-2">
              {(field.options ?? []).map(opt => {
                const selected = (answers[field.id] ?? []).includes(opt);
                return (
                  <button key={opt} onClick={() => {
                    const cur = answers[field.id] ?? [];
                    setAnswers(a => ({ ...a, [field.id]: selected ? cur.filter((x: string) => x !== opt) : [...cur, opt] }));
                  }}
                    className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3"
                    style={{ borderColor: selected ? accent : '#f0f0f0', backgroundColor: selected ? accent + '10' : 'white' }}>
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: accent, backgroundColor: selected ? accent : 'white' }}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-medium" style={{ color: selected ? accent : '#222' }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}
          {field?.type === 'file' && (
            <div>
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(field, f); e.target.value = ''; }} />
              {!profile ? (
                <p className="text-sm text-[#9e9e9e]">Sign in to 1KL Hub to upload files.</p>
              ) : answers[field.id]?.path ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 bg-white" style={{ borderColor: accent }}>
                  <Check className="w-5 h-5 shrink-0" style={{ color: accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#222] truncate">{answers[field.id].name}</p>
                    <p className="text-xs text-[#9e9e9e]">{(answers[field.id].size / 1024 / 1024).toFixed(2)} MB · uploaded</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>Replace</Button>
                </div>
              ) : (
                <button data-form-input onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full border-2 border-dashed border-[#e0e0e0] rounded-xl p-8 text-center bg-white/80 hover:border-current transition flex flex-col items-center gap-2 disabled:opacity-60"
                  style={{ color: accent }}>
                  {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                  <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to choose a file'}</span>
                  <span className="text-xs text-[#9e9e9e]">PDF, image or document — max 25 MB</span>
                </button>
              )}
            </div>
          )}
          {field?.type === 'rating' && (
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setAnswers(a => ({ ...a, [field.id]: n }))}
                  className="transition-transform hover:scale-110">
                  <Star className="w-10 h-10" fill={n <= (answers[field.id] ?? 0) ? accent : 'none'} stroke={accent} />
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-sm" style={{ color: accent }}>{error}</p>}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            <Button className="text-white px-8" style={{ backgroundColor: accent }}
              onClick={next} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" />
                : step === fields.length - 1 ? 'Submit' : (<>OK <Check className="w-4 h-4 ml-1" /></>)}
            </Button>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
            )}
            <p className="text-xs text-[#9e9e9e] ml-auto">Press Enter ↵</p>
          </div>
        </div>
      </div>
    </div>
  );
}
