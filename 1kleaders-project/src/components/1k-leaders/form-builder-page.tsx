'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, GripVertical, Eye, EyeOff, Save, Loader2,
  ChevronUp, ChevronDown, Settings, BarChart2, Copy, ExternalLink,
  Type, AlignLeft, Mail, Hash, List, CheckSquare, Star, Calendar,
  Upload, ToggleLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; navigate?: (p: string) => void; }

type FieldType = 'text'|'textarea'|'email'|'number'|'select'|'multiselect'|'radio'|'checkbox'|'rating'|'date';

type Field = {
  id: string; type: FieldType; label: string; required: boolean;
  placeholder?: string; help_text?: string; options?: string[];
};

type Form = {
  id: string; title: string; description: string | null; is_published: boolean;
  is_anonymous: boolean; show_progress: boolean; accent_color: string;
  fields: Field[]; created_at: string;
};

const FIELD_TYPES: { type: FieldType; label: string; icon: any }[] = [
  { type: 'text',        label: 'Short Text',    icon: Type },
  { type: 'textarea',    label: 'Long Text',      icon: AlignLeft },
  { type: 'email',       label: 'Email',          icon: Mail },
  { type: 'number',      label: 'Number',         icon: Hash },
  { type: 'select',      label: 'Dropdown',       icon: List },
  { type: 'radio',       label: 'Multiple Choice',icon: ToggleLeft },
  { type: 'multiselect', label: 'Checkboxes',     icon: CheckSquare },
  { type: 'rating',      label: 'Rating',         icon: Star },
  { type: 'date',        label: 'Date',           icon: Calendar },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

export default function FormBuilderPage({ role, navigate }: Props) {
  const isAdmin = ['admin','super-admin','developer'].includes(role ?? '');
  const [forms,      setForms]      = useState<Form[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editForm,   setEditForm]   = useState<Form | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [view,       setView]       = useState<'list'|'edit'|'responses'>('list');
  const [responses,  setResponses]  = useState<any[]>([]);
  const [copied,     setCopied]     = useState(false);

  useEffect(() => {
    supabase.from('forms').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setForms((data ?? []) as Form[]); setLoading(false); });
  }, []);

  function newForm(): Form {
    return {
      id: '', title: 'Untitled Form', description: '',
      is_published: false, is_anonymous: false, show_progress: true,
      accent_color: '#e33b5f', fields: [], created_at: new Date().toISOString(),
    };
  }

  async function saveForm() {
    if (!editForm || !editForm.title.trim()) return;
    setSaving(true);
    const payload = {
      title: editForm.title, description: editForm.description,
      is_published: editForm.is_published, is_anonymous: editForm.is_anonymous,
      show_progress: editForm.show_progress, accent_color: editForm.accent_color,
      fields: editForm.fields,
    };
    if (editForm.id) {
      await supabase.from('forms').update(payload).eq('id', editForm.id);
      setForms(prev => prev.map(f => f.id === editForm.id ? { ...f, ...payload } : f));
    } else {
      const { data } = await supabase.from('forms').insert(payload).select().single();
      if (data) { setForms(prev => [data as Form, ...prev]); setEditForm(data as Form); }
    }
    setSaving(false);
  }

  async function deleteForm(id: string) {
    await supabase.from('forms').delete().eq('id', id);
    setForms(prev => prev.filter(f => f.id !== id));
    if (editForm?.id === id) { setEditForm(null); setView('list'); }
  }

  async function togglePublish(form: Form) {
    await supabase.from('forms').update({ is_published: !form.is_published }).eq('id', form.id);
    setForms(prev => prev.map(f => f.id === form.id ? { ...f, is_published: !f.is_published } : f));
  }

  async function loadResponses(formId: string) {
    const { data } = await supabase.from('form_responses').select('*, profiles(first_name,last_name,email)').eq('form_id', formId).order('created_at', { ascending: false });
    setResponses(data ?? []);
    setView('responses');
  }

  function addField(type: FieldType) {
    if (!editForm) return;
    const field: Field = {
      id: genId(), type, label: FIELD_TYPES.find(t => t.type === type)?.label ?? type,
      required: false, placeholder: '',
      options: ['select','radio','multiselect'].includes(type) ? ['Option 1','Option 2'] : undefined,
    };
    setEditForm(f => f ? { ...f, fields: [...f.fields, field] } : f);
  }

  function updateField(id: string, updates: Partial<Field>) {
    setEditForm(f => f ? { ...f, fields: f.fields.map(field => field.id === id ? { ...field, ...updates } : field) } : f);
  }

  function removeField(id: string) {
    setEditForm(f => f ? { ...f, fields: f.fields.filter(field => field.id !== id) } : f);
  }

  function moveField(id: string, dir: -1|1) {
    if (!editForm) return;
    const idx = editForm.fields.findIndex(f => f.id === id);
    if (idx + dir < 0 || idx + dir >= editForm.fields.length) return;
    const fields = [...editForm.fields];
    [fields[idx], fields[idx + dir]] = [fields[idx + dir], fields[idx]];
    setEditForm(f => f ? { ...f, fields } : f);
  }

  function copyLink(formId: string) {
    const url = `${window.location.origin}/?page=form-${formId}`;
    navigator.clipboard?.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ── List view ─────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Forms</h1>
          <p className="text-[#7e7e7e] mt-1">Create and manage 1KL-branded forms</p>
        </div>
        {isAdmin && (
          <Button className="bg-[#e33b5f] text-white" onClick={() => { setEditForm(newForm()); setView('edit'); }}>
            <Plus className="w-4 h-4 mr-1" />New Form
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#9e9e9e]">
          <Loader2 className="w-5 h-5 animate-spin" />Loading...
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#e8e8e8] rounded-2xl">
          <Type className="w-10 h-10 text-[#9e9e9e]" />
          <p className="text-sm text-[#9e9e9e]">No forms yet</p>
          {isAdmin && <Button variant="outline" size="sm" onClick={() => { setEditForm(newForm()); setView('edit'); }}>Create your first form</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(form => (
            <Card key={form.id} className="border-[#f0f0f0] hover:border-[#e33b5f]/20 transition">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: form.accent_color + '15' }}>
                  <Type className="w-5 h-5" style={{ color: form.accent_color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#222]">{form.title}</p>
                    <Badge className={form.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}>
                      {form.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#9e9e9e] mt-0.5">{form.fields.length} fields · Created {new Date(form.created_at).toLocaleDateString()}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { loadResponses(form.id); setEditForm(form); }}>
                      <BarChart2 className="w-3.5 h-3.5 mr-1" />Responses
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(form.id)}>
                      <Copy className="w-3.5 h-3.5 mr-1" />{copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditForm(form); setView('edit'); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => togglePublish(form)}>
                      {form.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => deleteForm(form.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {!isAdmin && (
                  <Button size="sm" className="text-white" style={{ backgroundColor: form.accent_color }}
                    onClick={() => navigate?.(`form-${form.id}`)}>
                    Open Form <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── Responses view ────────────────────────────────────────
  if (view === 'responses' && editForm) return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setView('list')}>← Back</Button>
        <div>
          <h1 className="text-xl font-bold text-[#222]">{editForm.title} — Responses</h1>
          <p className="text-sm text-[#9e9e9e]">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {responses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#e8e8e8] rounded-2xl">
          <BarChart2 className="w-10 h-10 text-[#9e9e9e]" />
          <p className="text-sm text-[#9e9e9e]">No responses yet</p>
        </div>
      ) : responses.map((r, i) => (
        <Card key={r.id} className="border-[#f0f0f0]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#222]">
                {r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : 'Anonymous'}
                {r.profiles?.email && <span className="text-[#9e9e9e] font-normal ml-2">{r.profiles.email}</span>}
              </p>
              <p className="text-xs text-[#9e9e9e]">{new Date(r.created_at).toLocaleString()}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {editForm.fields.map(field => (
              <div key={field.id} className="flex gap-3 text-sm">
                <span className="text-[#9e9e9e] min-w-32 flex-shrink-0">{field.label}</span>
                <span className="text-[#222]">{
                  Array.isArray(r.answers[field.id])
                    ? r.answers[field.id].join(', ')
                    : r.answers[field.id] ?? '—'
                }</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── Edit view ─────────────────────────────────────────────
  if (view === 'edit' && editForm) return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => { setView('list'); setEditForm(null); }}>← Back</Button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="accent-[#e33b5f]" checked={editForm.is_published}
              onChange={e => setEditForm(f => f ? { ...f, is_published: e.target.checked } : f)} />
            Published
          </label>
          <Button className="bg-[#e33b5f] text-white" onClick={saveForm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Form settings */}
      <Card className="border-[#f0f0f0]">
        <CardContent className="p-5 space-y-3">
          <Input className="text-xl font-bold border-0 border-b border-[#f0f0f0] rounded-none px-0 focus-visible:ring-0"
            placeholder="Form title" value={editForm.title}
            onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)} />
          <Input className="border-0 border-b border-[#f0f0f0] rounded-none px-0 focus-visible:ring-0 text-[#7e7e7e]"
            placeholder="Description (optional)" value={editForm.description ?? ''}
            onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)} />
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-[#e33b5f]" checked={editForm.show_progress}
                onChange={e => setEditForm(f => f ? { ...f, show_progress: e.target.checked } : f)} />
              Show progress bar
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-[#e33b5f]" checked={editForm.is_anonymous}
                onChange={e => setEditForm(f => f ? { ...f, is_anonymous: e.target.checked } : f)} />
              Anonymous responses
            </label>
            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className="text-[#9e9e9e]">Accent:</span>
              <input type="color" value={editForm.accent_color} className="w-7 h-7 rounded cursor-pointer border border-[#f0f0f0]"
                onChange={e => setEditForm(f => f ? { ...f, accent_color: e.target.value } : f)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <div className="space-y-3">
        {editForm.fields.map((field, idx) => {
          const Icon = FIELD_TYPES.find(t => t.type === field.type)?.icon ?? Type;
          return (
            <Card key={field.id} className="border-[#f0f0f0]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: editForm.accent_color }} />
                  <Input className="flex-1 font-medium border-[#f0f0f0]" value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs text-[#9e9e9e] cursor-pointer flex-shrink-0">
                    <input type="checkbox" className="accent-[#e33b5f]" checked={field.required}
                      onChange={e => updateField(field.id, { required: e.target.checked })} />
                    Required
                  </label>
                  <button onClick={() => moveField(field.id, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveField(field.id, 1)} disabled={idx === editForm.fields.length - 1} className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeField(field.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {['text','textarea','email','number'].includes(field.type) && (
                  <Input className="text-sm border-[#f0f0f0] text-[#9e9e9e]" placeholder="Placeholder text (optional)"
                    value={field.placeholder ?? ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                )}
                {['select','radio','multiselect'].includes(field.type) && (
                  <div className="space-y-1.5">
                    {(field.options ?? []).map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input className="flex-1 text-sm border-[#f0f0f0]" value={opt}
                          onChange={e => { const opts = [...(field.options ?? [])]; opts[oi] = e.target.value; updateField(field.id, { options: opts }); }} />
                        <button onClick={() => { const opts = (field.options ?? []).filter((_, i) => i !== oi); updateField(field.id, { options: opts }); }}
                          className="text-[#9e9e9e] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => { const opts = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`]; updateField(field.id, { options: opts }); }}
                      className="text-xs text-[#e33b5f] hover:underline">+ Add option</button>
                  </div>
                )}
                <Input className="text-xs border-[#f0f0f0] text-[#9e9e9e]" placeholder="Help text (optional)"
                  value={field.help_text ?? ''} onChange={e => updateField(field.id, { help_text: e.target.value })} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add field buttons */}
      <Card className="border-dashed border-[#e8e8e8]">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-3">Add Field</p>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => addField(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#f0f0f0] rounded-lg hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition">
                <Icon className="w-3.5 h-3.5 text-[#9e9e9e]" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return null;
}
