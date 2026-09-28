'use client';
import AnnouncementEditor from './announcement-editor';
import AnnouncementView, { MediaEmbedView } from './announcement-view';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Megaphone, Lock, Globe, FileText, Play, Share2, X, ChevronUp, ChevronDown, Loader2, Plus, RefreshCw,
  Link, Check, Trash2, Eye, EyeOff, Save, Upload, Users, Search, UserPlus, UserMinus, Pencil, MessageSquare, Bell,
  Mail, Send, CalendarClock, Columns2, Columns3, AlignLeft, AlignCenter, AlignRight, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-fetch';
import type { DashboardRole } from './types';
import {
  CATEGORIES, DEFAULT_AUDIENCE, AUDIENCE_ROLE_OPTIONS, AUDIENCE_SUBROLE_OPTIONS, ADMIN_ROLES,
  genId, getBlocks, excerpt, normalizeAudience, audienceIncludes, describeAudience, MEDIA_SIZES,
  type Announcement, type Audience, type Block, type Category, type Visibility, type Attachment,
  type EmailMode, type ColumnCell, type MediaSize, type MediaAlign,
} from '@/lib/announcements';

interface Props { role?: DashboardRole; navigate?: (p: string) => void; }

type PublishMode = 'draft' | 'now' | 'schedule';

type Draft = {
  title: string; description: string; category: Category; visibility: Visibility;
  meta: string; cta: string; attachments: Attachment[]; blocks: Block[];
  audience: Audience; allow_comments: boolean;
  publishMode: PublishMode; publishAt: string;               // publishAt: local 'YYYY-MM-DDTHH:mm'
  notify_in_app: boolean; email_mode: EmailMode; notify_admins: boolean;
};

type Person = { id: string; first_name: string | null; last_name: string | null; email: string; role: string; subroles: string[] | null };

const EMPTY_DRAFT = (): Draft => ({
  title: '', description: '', category: 'Announcement', visibility: 'shareholders_only',
  meta: '', cta: 'Read →', attachments: [], blocks: [{ id: genId(), type: 'content', html: '' }],
  audience: { ...DEFAULT_AUDIENCE }, allow_comments: true,
  publishMode: 'draft', publishAt: '', notify_in_app: true, email_mode: 'opted_in', notify_admins: false,
});

// ISO → value for <input type="datetime-local"> in the viewer's timezone
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMAIL_MODES: { value: EmailMode; label: string }[] = [
  { value: 'opted_in', label: 'Only people who turned on announcement emails' },
  { value: 'all',      label: 'Everyone in the audience' },
  { value: 'none',     label: "Don't send email" },
];

function autoMeta(cat: Category): string {
  const fullDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const readTime = cat === 'Podcast' ? 'Listen' : cat === 'Reports' ? '10 min read' : cat === 'Updates' ? '5 min read' : '3 min read';
  return `${fullDate} · ${readTime}`;
}

const personName = (p: Person) => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;

export default function AnnouncementsPage({ role, navigate }: Props) {
  const isAdmin = ADMIN_ROLES.includes(role ?? '');

  const [items,     setItems]     = useState<Announcement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [cat,       setCat]       = useState<string>('All');
  const [shareId,   setShareId]   = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);
  const [view,      setView]      = useState<'list' | 'edit'>('list');
  const [mode,      setMode]      = useState<'write' | 'preview'>('write');
  const [draft,     setDraft]     = useState<Draft>(EMPTY_DRAFT);
  const [editing,   setEditing]   = useState<Announcement | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [people,    setPeople]    = useState<Person[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [notice,    setNotice]    = useState<{ ok: boolean; text: string } | null>(null);
  const [testing,   setTesting]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchAnnouncements() {
    setLoading(true);
    // Admins: publish anything whose scheduled time has passed (the cron job also does this)
    if (isAdmin) await apiFetch('/api/announcements/publish-due', { method: 'POST' }).catch(() => {});
    // RLS returns only announcements this user's audience allows (admins see all)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as Announcement[]);
    setLoading(false);
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  // People list for audience targeting (admins only)
  useEffect(() => {
    if (!isAdmin || view !== 'edit' || people.length) return;
    supabase.from('profiles').select('id, first_name, last_name, email, role, subroles').order('first_name')
      .then(({ data }) => setPeople((data ?? []) as Person[]));
  }, [isAdmin, view]);

  function flash(text: string, ok = true) { setNotice({ ok, text }); if (ok) setTimeout(() => setNotice(null), 8000); }

  // Images inserted in the text editor and attachments go to the public 'announcement-attachments' bucket
  async function uploadPublic(file: File, folder: string): Promise<string> {
    const path = `${folder}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await supabase.storage.from('announcement-attachments').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return supabase.storage.from('announcement-attachments').getPublicUrl(path).data.publicUrl;
  }
  const uploadEditorImage = (file: File) => uploadPublic(file, 'images');

  function openNew() {
    setDraft({ ...EMPTY_DRAFT(), meta: autoMeta('Announcement') });
    setEditing(null); setPendingFiles([]); setMode('write'); setView('edit');
  }

  function openEdit(ann: Announcement) {
    setDraft({
      title: ann.title, description: ann.description ?? '', category: ann.category, visibility: ann.visibility,
      meta: ann.meta ?? '', cta: ann.cta ?? 'Read →', attachments: ann.attachments ?? [],
      blocks: getBlocks(ann).map(b => ({ ...b, id: b.id.startsWith('legacy') ? genId() : b.id })),
      audience: normalizeAudience(ann.audience), allow_comments: ann.allow_comments ?? true,
      publishMode: ann.is_published ? 'now' : ann.publish_at ? 'schedule' : 'draft',
      publishAt: ann.publish_at ? toLocalInput(ann.publish_at) : '',
      notify_in_app: ann.notify_in_app ?? true, email_mode: ann.email_mode ?? 'opted_in', notify_admins: ann.notify_admins ?? false,
    });
    setEditing(ann); setPendingFiles([]); setMode('write'); setView('edit');
  }

  function closeEditor() { setView('list'); setEditing(null); setPendingFiles([]); }

  // ── Blocks ──────────────────────────────────────────────────────────────
  const updateBlock = (id: string, patch: Partial<Block>) =>
    setDraft(d => ({ ...d, blocks: d.blocks.map(b => b.id === id ? { ...b, ...patch } as Block : b) }));
  const addBlock = (type: Block['type'], columns = 2) =>
    setDraft(d => ({ ...d, blocks: [...d.blocks,
      type === 'content' ? { id: genId(), type, html: '' }
      : type === 'media' ? { id: genId(), type, url: '', caption: '', size: 'md', align: 'center' }
      : { id: genId(), type, cells: Array.from({ length: columns }, () => ({ kind: 'content', html: '' }) as ColumnCell) },
    ] }));
  const updateCell = (blockId: string, idx: number, cell: ColumnCell) =>
    setDraft(d => ({ ...d, blocks: d.blocks.map(b => b.id === blockId && b.type === 'columns'
      ? { ...b, cells: b.cells.map((c, i) => i === idx ? cell : c) } : b) }));
  const removeBlock = (id: string) => setDraft(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) }));
  const moveBlock = (id: string, dir: -1 | 1) => setDraft(d => {
    const idx = d.blocks.findIndex(b => b.id === id);
    if (idx + dir < 0 || idx + dir >= d.blocks.length) return d;
    const next = [...d.blocks];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    return { ...d, blocks: next };
  });

  // ── Audience ────────────────────────────────────────────────────────────
  const setAudience = (patch: Partial<Audience>) => setDraft(d => ({ ...d, audience: { ...d.audience, ...patch } }));
  const toggleIn = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const audienceCount = useMemo(() => people.filter(p =>
    !ADMIN_ROLES.includes(p.role) && audienceIncludes(draft.audience, p)).length, [people, draft.audience]);

  const personMatches = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return [];
    return people.filter(p => `${personName(p)} ${p.email}`.toLowerCase().includes(q)).slice(0, 8);
  }, [people, personQuery]);

  const peopleById = useMemo(() => Object.fromEntries(people.map(p => [p.id, p])), [people]);

  // ── Save ────────────────────────────────────────────────────────────────
  // Uploads pending attachment files; throws (and keeps the editor open) if any upload fails
  async function uploadAttachments(): Promise<Attachment[]> {
    const results: Attachment[] = [];
    for (const file of pendingFiles) {
      try { results.push({ name: file.name, url: await uploadPublic(file, 'attachments'), size: file.size }); }
      catch (e: any) { throw new Error(`Attachment “${file.name}” failed to upload: ${e.message}`); }
    }
    return results;
  }

  function describeNotify(data: any, verb = 'Published') {
    if (data.skipped) return { ok: true, text: `${verb}. (${data.reason})` };
    const parts = [`${verb} — ${data.in_app} in-app notification${data.in_app === 1 ? '' : 's'}`];
    parts.push(data.emailed ? `${data.emailed} email${data.emailed === 1 ? '' : 's'}` : 'no emails');
    let text = parts.join(', ') + '.';
    if (data.audience === 0) text += ' Nobody is in this audience yet (admins are only notified when "Also notify admins" is on).';
    if (data.errors?.length) text += ` Problems: ${data.errors.join('; ')}`;
    return { ok: !data.errors?.length, text };
  }

  async function notifyAudience(id: string) {
    const res = await apiFetch('/api/announcements/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement_id: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`Published, but notifications failed: ${data.error ?? res.status}`, false); return; }
    const d = describeNotify(data);
    flash(d.text, d.ok);
  }

  // Sends this announcement's notification + email to the current admin only
  async function sendTest() {
    if (!editing) { flash('Save the announcement first, then send yourself a test.', false); return; }
    setTesting(true);
    const res = await apiFetch('/api/announcements/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement_id: editing.id, test: true }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) flash(`Test failed: ${data.error ?? res.status}`, false);
    else flash(data.errors?.length ? `Test sent with problems: ${data.errors.join('; ')}` : `Test sent to you: ${data.in_app} in-app notification, ${data.emailed} email.`, !data.errors?.length);
  }

  async function save() {
    if (!draft.title.trim()) return;
    if (draft.publishMode === 'schedule') {
      if (!draft.publishAt) { flash('Pick a date and time to schedule the announcement.', false); return; }
      if (new Date(draft.publishAt).getTime() <= Date.now()) { flash('The scheduled time is in the past — choose "Publish now" instead.', false); return; }
    }
    setSaving(true);
    let uploaded: Attachment[] = [];
    try { uploaded = await uploadAttachments(); }
    catch (e: any) { setSaving(false); flash(e.message, false); return; }
    setPendingFiles([]);

    const blocks = draft.blocks.filter(b =>
      b.type === 'content' ? b.html.replace(/<br\s*\/?>/g, '').trim()
      : b.type === 'media' ? b.url.trim()
      : b.cells.some(c => c.kind === 'media' ? c.url.trim() : c.html.replace(/<br\s*\/?>/g, '').trim()));
    const publishNow = draft.publishMode === 'now';
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category,
      visibility: draft.visibility,
      meta: draft.meta || autoMeta(draft.category),
      cta: draft.cta || 'Read →',
      attachments: [...draft.attachments, ...uploaded],
      blocks,
      // Legacy columns kept in sync for anything that still reads them
      content: blocks.filter(b => b.type === 'content').map(b => (b as any).html).join('\n') || null,
      media_url: (blocks.find(b => b.type === 'media') as any)?.url ?? null,
      audience: draft.audience,
      allow_comments: draft.allow_comments,
      is_published: publishNow,
      published_at: publishNow ? (editing?.published_at ?? new Date().toISOString()) : editing?.published_at ?? null,
      publish_at: draft.publishMode === 'schedule' ? new Date(draft.publishAt).toISOString() : null,
      notify_in_app: draft.notify_in_app,
      email_mode: draft.email_mode,
      notify_admins: draft.notify_admins,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = editing
      ? await supabase.from('announcements').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('announcements').insert(payload).select().single();

    setSaving(false);
    if (error || !data) { flash(`Save failed: ${error?.message ?? 'unknown error'}`, false); return; }

    const saved = data as Announcement;
    setItems(prev => editing ? prev.map(i => i.id === saved.id ? saved : i) : [saved, ...prev]);
    closeEditor();
    if (saved.is_published && !saved.notified_at && (saved.notify_in_app !== false || saved.email_mode !== 'none')) await notifyAudience(saved.id);
    else if (saved.publish_at) flash(`Scheduled — it will publish (and notify) on ${new Date(saved.publish_at).toLocaleString()}.`);
    else flash(saved.is_published ? 'Changes saved.' : 'Saved as draft.');
  }

  async function togglePublish(ann: Announcement) {
    const is_published = !ann.is_published;
    const { data } = await supabase.from('announcements')
      .update({ is_published, publish_at: null, published_at: is_published ? (ann.published_at ?? new Date().toISOString()) : ann.published_at })
      .eq('id', ann.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === ann.id ? data as Announcement : i));
    if (is_published && !ann.notified_at) await notifyAudience(ann.id);
  }

  async function deleteAnn(id: string) {
    await supabase.from('announcements').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function shareUrl(id: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : 'https://app.1kleaders.com'}/announcements/${id}`;
  }

  function copyShareLink(id: string) {
    navigator.clipboard?.writeText(shareUrl(id)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const open = (ann: Announcement) => navigate?.(`announcement-${ann.id}`);

  const filtered = items.filter(i => cat === 'All' || i.category === cat);
  const featured = filtered[0];
  const rest     = filtered.slice(1);

  function VisiBadge({ vis }: { vis: Visibility }) {
    return vis === 'external_use'
      ? <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-0 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />External Use</Badge>
      : <Badge className="bg-[#f0f0f0] text-[#555353] border border-[#e0e0e0] text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Members Only</Badge>;
  }

  function DraftBadge({ ann }: { ann: Announcement }) {
    return ann.publish_at
      ? <Badge className="bg-sky-100 text-sky-700 text-xs flex items-center gap-1"><CalendarClock className="w-3 h-3" />Scheduled · {new Date(ann.publish_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Badge>
      : <Badge className="bg-amber-100 text-amber-700 text-xs">Draft</Badge>;
  }

  function AdminActions({ ann }: { ann: Announcement }) {
    return (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button title="Edit" className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-[#e33b5f]/40" onClick={() => openEdit(ann)}>
          <Pencil className="w-3 h-3 text-[#9e9e9e]" />
        </button>
        <button title={ann.is_published ? 'Unpublish' : 'Publish'} className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-[#e33b5f]/40" onClick={() => togglePublish(ann)}>
          {ann.is_published ? <EyeOff className="w-3 h-3 text-[#9e9e9e]" /> : <Eye className="w-3 h-3 text-[#9e9e9e]" />}
        </button>
        <button title="Delete" className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-red-300" onClick={() => setPendingDelete(ann)}>
          <Trash2 className="w-3 h-3 text-[#9e9e9e]" />
        </button>
      </div>
    );
  }

  // ── Editor ──────────────────────────────────────────────────────────────
  function renderEditor() {
    const isExternal = draft.visibility === 'external_use';
    return (
      <div className="max-w-4xl space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap sticky top-14 z-20 bg-[#f6f6f6] py-2">
          <Button variant="outline" size="sm" onClick={closeEditor}>← Back</Button>
          <div className="flex items-center gap-1 bg-white border border-[#f0f0f0] rounded-lg p-0.5">
            {(['write', 'preview'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${mode === m ? 'bg-[#222] text-white' : 'text-[#555353] hover:bg-[#f6f6f6]'}`}>
                {m === 'write' ? <><Pencil className="w-3.5 h-3.5" />Edit</> : <><Eye className="w-3.5 h-3.5" />Preview</>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="h-9 border border-[#e8e8e8] rounded-lg px-2 text-sm bg-white"
              value={draft.publishMode} onChange={e => setDraft(d => ({ ...d, publishMode: e.target.value as PublishMode }))}>
              <option value="draft">Draft</option>
              <option value="now">{editing?.is_published ? 'Published' : 'Publish now'}</option>
              <option value="schedule">Schedule…</option>
            </select>
            {draft.publishMode === 'schedule' && (
              <input type="datetime-local" className="h-9 border border-[#e8e8e8] rounded-lg px-2 text-sm bg-white"
                min={toLocalInput(new Date().toISOString())}
                value={draft.publishAt} onChange={e => setDraft(d => ({ ...d, publishAt: e.target.value }))} />
            )}
            <Button className="bg-[#e33b5f] text-white" onClick={save} disabled={saving || !draft.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : draft.publishMode === 'schedule' ? <CalendarClock className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {draft.publishMode === 'now' ? (editing?.is_published ? 'Save' : 'Publish') : draft.publishMode === 'schedule' ? 'Schedule' : 'Save Draft'}
            </Button>
          </div>
        </div>

        {draft.publishMode !== 'draft' && !editing?.notified_at && (
          <p className="text-xs text-[#7e7e7e] flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-[#e33b5f]" />
            {draft.publishMode === 'schedule' ? 'When it publishes' : 'On publish'}:{' '}
            {draft.notify_in_app ? `${audienceCount} ${audienceCount === 1 ? 'person' : 'people'} get an in-app notification` : 'no in-app notifications'}
            {draft.email_mode === 'none' ? ', no email.' : draft.email_mode === 'all' ? ', and everyone in the audience is emailed.' : ', plus email for people who opted in.'}
          </p>
        )}

        {mode === 'preview' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#7e7e7e] bg-white border border-[#f0f0f0] rounded-lg px-3 py-2 flex-wrap">
              <Eye className="w-3.5 h-3.5 text-[#e33b5f]" />
              Preview — this is exactly what readers will see.
              <span className="text-[#9e9e9e]">Audience: {describeAudience(draft.audience)} ({audienceCount})</span>
            </div>
            <AnnouncementView
              ann={{ ...draft, attachments: [...draft.attachments, ...pendingFiles.map(f => ({ name: f.name, url: '#', size: f.size }))], content: null, media_url: null }}
              headerActions={isExternal ? <Button size="sm" variant="outline" className="h-8 text-xs" disabled><Share2 className="w-3.5 h-3.5 mr-1" />Share</Button> : undefined}
              footerNote={isExternal
                ? '🌐 External Use — anyone with the link can read this. Comments and reactions are disabled.'
                : draft.allow_comments ? '💬 Members will see reactions and comments here.' : '🔒 Comments are turned off for this announcement.'}
            />
          </div>
        ) : (
          <>
            {/* Basics */}
            <Card className="border-[#f0f0f0]">
              <CardContent className="p-5 space-y-3">
                <Input className="text-xl font-bold border-0 border-b border-[#f0f0f0] rounded-none px-0 focus-visible:ring-0"
                  placeholder="Announcement title" value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
                <Input className="border-0 border-b border-[#f0f0f0] rounded-none px-0 focus-visible:ring-0 text-[#7e7e7e]"
                  placeholder="Short description (optional — shown on cards and in notifications)" value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
                <div className="grid sm:grid-cols-3 gap-3 pt-1">
                  <label className="text-xs text-[#9e9e9e] space-y-1">
                    <span>Category</span>
                    <select className="w-full border border-[#f0f0f0] rounded-lg px-2 py-1.5 text-sm text-[#222] bg-transparent focus:outline-none"
                      value={draft.category} onChange={e => { const c = e.target.value as Category; setDraft(d => ({ ...d, category: c, meta: autoMeta(c) })); }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-[#9e9e9e] space-y-1">
                    <span>Byline</span>
                    <Input className="h-9 border-[#f0f0f0] text-sm text-[#222]" value={draft.meta} onChange={e => setDraft(d => ({ ...d, meta: e.target.value }))} />
                  </label>
                  <label className="text-xs text-[#9e9e9e] space-y-1">
                    <span>Button label</span>
                    <Input className="h-9 border-[#f0f0f0] text-sm text-[#222]" value={draft.cta} onChange={e => setDraft(d => ({ ...d, cta: e.target.value }))} />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Audience */}
            <Card className="border-[#f0f0f0]">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#222] flex items-center gap-2"><Users className="w-4 h-4 text-[#e33b5f]" />Who can see this</p>
                  <span className="text-xs text-[#7e7e7e]">{audienceCount} {audienceCount === 1 ? 'person' : 'people'} (admins always see everything)</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {([
                    ['shareholders_only', Lock, 'Members only', 'Only the audience below, inside 1KL Hub. Comments allowed.'],
                    ['external_use', Globe, 'External Use', 'Public share link anyone can open. No comments or reactions.'],
                  ] as const).map(([v, Icon, label, hint]) => (
                    <button key={v} onClick={() => setDraft(d => ({ ...d, visibility: v }))}
                      className={`text-left p-3 rounded-xl border transition ${draft.visibility === v ? 'border-[#e33b5f] bg-[#e33b5f]/5' : 'border-[#f0f0f0] hover:border-[#e33b5f]/30'}`}>
                      <p className="text-sm font-semibold text-[#222] flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</p>
                      <p className="text-xs text-[#7e7e7e] mt-0.5">{hint}</p>
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCE_ROLE_OPTIONS.map(o => {
                      const on = draft.audience.roles.includes(o.value);
                      return (
                        <button key={o.value} onClick={() => setAudience({ roles: toggleIn(draft.audience.roles, o.value) })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                          {on && <Check className="w-3 h-3" />}{o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Groups (anyone with this badge)</p>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCE_SUBROLE_OPTIONS.map(o => {
                      const on = draft.audience.subroles.includes(o.value);
                      return (
                        <button key={o.value} onClick={() => setAudience({ subroles: toggleIn(draft.audience.subroles, o.value) })}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                          {on && <Check className="w-3 h-3" />}{o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Specific people</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
                    <Input className="pl-9 border-[#f0f0f0]" placeholder="Search by name or email to include or exclude someone..."
                      value={personQuery} onChange={e => setPersonQuery(e.target.value)} />
                    {personMatches.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#f0f0f0] rounded-xl shadow-lg overflow-hidden">
                        {personMatches.map(p => {
                          const inc = draft.audience.include_user_ids.includes(p.id);
                          const exc = draft.audience.exclude_user_ids.includes(p.id);
                          return (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#fafafa]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#222] truncate">{personName(p)}</p>
                                <p className="text-xs text-[#9e9e9e] truncate">{p.email} · {p.role}</p>
                              </div>
                              <Button size="sm" variant={inc ? 'default' : 'outline'} className={`h-7 text-xs ${inc ? 'bg-emerald-600 text-white' : ''}`}
                                onClick={() => setAudience({ include_user_ids: toggleIn(draft.audience.include_user_ids, p.id), exclude_user_ids: draft.audience.exclude_user_ids.filter(x => x !== p.id) })}>
                                <UserPlus className="w-3 h-3 mr-1" />{inc ? 'Included' : 'Include'}
                              </Button>
                              <Button size="sm" variant={exc ? 'default' : 'outline'} className={`h-7 text-xs ${exc ? 'bg-red-600 text-white' : ''}`}
                                onClick={() => setAudience({ exclude_user_ids: toggleIn(draft.audience.exclude_user_ids, p.id), include_user_ids: draft.audience.include_user_ids.filter(x => x !== p.id) })}>
                                <UserMinus className="w-3 h-3 mr-1" />{exc ? 'Excluded' : 'Exclude'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {(draft.audience.include_user_ids.length > 0 || draft.audience.exclude_user_ids.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {draft.audience.include_user_ids.map(id => (
                        <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserPlus className="w-3 h-3" />{peopleById[id] ? personName(peopleById[id]) : 'Loading…'}
                          <button onClick={() => setAudience({ include_user_ids: draft.audience.include_user_ids.filter(x => x !== id) })}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {draft.audience.exclude_user_ids.map(id => (
                        <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                          <UserMinus className="w-3 h-3" />{peopleById[id] ? personName(peopleById[id]) : 'Loading…'}
                          <button onClick={() => setAudience({ exclude_user_ids: draft.audience.exclude_user_ids.filter(x => x !== id) })}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <label className={`flex items-center gap-2 text-sm ${isExternal ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input type="checkbox" className="accent-[#e33b5f]" disabled={isExternal}
                    checked={!isExternal && draft.allow_comments}
                    onChange={e => setDraft(d => ({ ...d, allow_comments: e.target.checked }))} />
                  <MessageSquare className="w-3.5 h-3.5 text-[#9e9e9e]" />
                  Allow comments, replies and reactions
                  {isExternal && <span className="text-xs text-[#9e9e9e]">(always off for External Use)</span>}
                </label>
              </CardContent>
            </Card>

            {/* Content blocks */}
            <div className="space-y-3">
              {draft.blocks.map((block, idx) => (
                <Card key={block.id} className="border-[#f0f0f0]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {block.type === 'content' ? <FileText className="w-4 h-4 text-[#e33b5f]" /> : block.type === 'media' ? <Play className="w-4 h-4 text-[#e33b5f]" /> : <Columns3 className="w-4 h-4 text-[#e33b5f]" />}
                      <span className="flex-1 font-medium text-sm">
                        {block.type === 'content' ? 'Text' : block.type === 'media' ? 'Media' : `${block.cells.length} columns`}
                      </span>
                      {block.type === 'columns' && (
                        <select className="h-7 text-xs border border-[#e8e8e8] rounded px-1.5 bg-white" value={block.cells.length}
                          onChange={e => {
                            const n = Number(e.target.value);
                            const cells = [...block.cells.slice(0, n)];
                            while (cells.length < n) cells.push({ kind: 'content', html: '' });
                            updateBlock(block.id, { cells } as Partial<Block>);
                          }}>
                          <option value={2}>2 columns</option>
                          <option value={3}>3 columns</option>
                        </select>
                      )}
                      <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={idx === draft.blocks.length - 1} className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {block.type === 'content' ? (
                      <AnnouncementEditor value={block.html} onChange={html => updateBlock(block.id, { html })} placeholder="Write here..." uploadImage={uploadEditorImage} />
                    ) : block.type === 'media' ? (
                      <div className="space-y-2">
                        <Input className="border-[#f0f0f0]" placeholder="Paste a YouTube, Vimeo, Loom, Spotify, Apple Podcasts, SoundCloud, Google Drive, image, video or audio URL"
                          value={block.url} onChange={e => updateBlock(block.id, { url: e.target.value })} />
                        <div className="flex gap-2 flex-wrap items-center">
                          <Input className="border-[#f0f0f0] text-sm flex-1 min-w-48" placeholder="Caption (optional)"
                            value={block.caption ?? ''} onChange={e => updateBlock(block.id, { caption: e.target.value })} />
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-[#9e9e9e]">Size</span>
                            {MEDIA_SIZES.map(s => (
                              <button key={s.value} onClick={() => updateBlock(block.id, { size: s.value as MediaSize })}
                                className={`px-2 py-1 rounded border ${(block.size ?? 'md') === s.value ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'border-[#e8e8e8] text-[#555353]'}`}>{s.label}</button>
                            ))}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                              <button key={a} title={`Align ${a}`} onClick={() => updateBlock(block.id, { align: a as MediaAlign })}
                                className={`p-1.5 rounded border ${(block.align ?? 'center') === a ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'border-[#e8e8e8] text-[#555353]'}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                        {block.url.trim() && <MediaEmbedView url={block.url} caption={block.caption} size={block.size ?? 'md'} align={block.align ?? 'center'} />}
                      </div>
                    ) : (
                      <div className={`grid gap-3 ${block.cells.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
                        {block.cells.map((cell, ci) => (
                          <div key={ci} className="border border-dashed border-[#e8e8e8] rounded-lg p-2 space-y-2 min-w-0">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-[#9e9e9e] mr-auto">Column {ci + 1}</span>
                              {(['content', 'media'] as const).map(k => (
                                <button key={k} onClick={() => cell.kind !== k && updateCell(block.id, ci, k === 'content' ? { kind: 'content', html: '' } : { kind: 'media', url: '', caption: '' })}
                                  className={`px-2 py-0.5 rounded border ${cell.kind === k ? 'bg-[#222] text-white border-[#222]' : 'border-[#e8e8e8] text-[#555353]'}`}>
                                  {k === 'content' ? 'Text' : 'Media'}
                                </button>
                              ))}
                            </div>
                            {cell.kind === 'content' ? (
                              <AnnouncementEditor key={`${block.id}-${ci}-content`} compact value={cell.html}
                                onChange={html => updateCell(block.id, ci, { kind: 'content', html })} placeholder="Column text..." uploadImage={uploadEditorImage} />
                            ) : (
                              <div className="space-y-2">
                                <Input className="border-[#f0f0f0] text-sm" placeholder="Media URL" value={cell.url}
                                  onChange={e => updateCell(block.id, ci, { ...cell, url: e.target.value })} />
                                <Input className="border-[#f0f0f0] text-xs" placeholder="Caption (optional)" value={cell.caption ?? ''}
                                  onChange={e => updateCell(block.id, ci, { ...cell, caption: e.target.value })} />
                                {cell.url.trim() && <MediaEmbedView url={cell.url} caption={cell.caption} size="full" />}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => addBlock('content')}><FileText className="w-3.5 h-3.5 mr-1" />Add text</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('media')}><Play className="w-3.5 h-3.5 mr-1" />Add media</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('columns', 2)}><Columns2 className="w-3.5 h-3.5 mr-1" />2 columns</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('columns', 3)}><Columns3 className="w-3.5 h-3.5 mr-1" />3 columns</Button>
            </div>

            {/* Notifications */}
            <Card className="border-[#f0f0f0]">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-[#222] flex items-center gap-2"><Bell className="w-4 h-4 text-[#e33b5f]" />Notifications when published</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-[#e33b5f]" checked={draft.notify_in_app}
                    onChange={e => setDraft(d => ({ ...d, notify_in_app: e.target.checked }))} />
                  Send an in-app (bell) notification to everyone in the audience
                </label>
                <label className="flex items-center gap-2 text-sm flex-wrap">
                  <Mail className="w-3.5 h-3.5 text-[#9e9e9e]" />Email:
                  <select className="h-8 border border-[#e8e8e8] rounded-lg px-2 text-sm bg-white"
                    value={draft.email_mode} onChange={e => setDraft(d => ({ ...d, email_mode: e.target.value as EmailMode }))}>
                    {EMAIL_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-[#e33b5f]" checked={draft.notify_admins}
                    onChange={e => setDraft(d => ({ ...d, notify_admins: e.target.checked }))} />
                  Also notify admins
                </label>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="outline" onClick={sendTest} disabled={testing || !editing}>
                    {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}Send a test to me
                  </Button>
                  <span className="text-xs text-[#9e9e9e]">
                    {editing ? 'Sends the bell notification and the email to you only.' : 'Save as a draft first to send yourself a test.'}
                    {editing?.notified_at && ` Audience already notified ${new Date(editing.notified_at).toLocaleString()}.`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="border-[#f0f0f0]">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4 text-[#e33b5f]" />Attachments</p>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={e => { setPendingFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
                {draft.attachments.map(a => (
                  <div key={a.url} className="flex items-center gap-2 bg-[#f6f6f6] rounded-lg px-3 py-2 text-xs">
                    <span className="flex-1 truncate">{a.name}</span>
                    {a.size ? <span className="text-[#9e9e9e]">{(a.size / 1024).toFixed(1)} KB</span> : null}
                    <button onClick={() => setDraft(d => ({ ...d, attachments: d.attachments.filter(x => x.url !== a.url) }))} className="text-[#9e9e9e] hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {pendingFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 text-xs">
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-amber-600">uploads on save</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-[#9e9e9e] hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-[#e33b5f] hover:underline">+ Add file</button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="py-8 sm:py-12 max-w-5xl">
        <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-3">1KL Hub / Announcements</p>
        <div className="h-px w-full bg-[#e33b5f] mb-5" />
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#222] mb-2">Announcements</h1>
            <p className="text-base text-[#7e7e7e] max-w-xl">Stay up to date with the latest updates, reports, insights, and content from 1K Leaders.</p>
          </div>
          {isAdmin && view === 'list' && (
            <Button className="bg-[#e33b5f] text-white" onClick={openNew}><Plus className="w-4 h-4 mr-1" />New Announcement</Button>
          )}
        </div>
      </div>

      {notice && (
        <div className={`max-w-5xl mb-4 flex items-start gap-2 px-4 py-2.5 rounded-lg border text-sm ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {notice.ok ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {isAdmin && view === 'edit' && renderEditor()}

      {view === 'list' && <>
        <div className="pb-6 max-w-5xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${cat === c ? 'bg-[#222] text-white' : 'text-[#7e7e7e] hover:bg-[#f0f0f0]'}`}>
                  {c}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchAnnouncements} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="max-w-5xl space-y-4">
            <div className="border border-[#f0f0f0] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-[380px_1fr] animate-pulse">
              <div className="bg-[#f0f0f0] min-h-[200px]" />
              <div className="p-7 space-y-3">
                <div className="h-3 bg-[#f0f0f0] rounded w-24" /><div className="h-5 bg-[#f0f0f0] rounded w-48" />
                <div className="h-3 bg-[#f0f0f0] rounded w-full" /><div className="h-3 bg-[#f0f0f0] rounded w-3/4" />
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Megaphone className="w-10 h-10 text-[#9e9e9e]" />
            <p className="text-sm text-[#9e9e9e]">No announcements yet.</p>
          </div>
        ) : (
          <div className="pb-12 max-w-5xl space-y-5">
            {featured && (
              <div className="border border-[#e8e8e8] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-[320px_1fr] cursor-pointer hover:border-[#e33b5f]/30 transition bg-white"
                onClick={() => open(featured)}>
                <div className="bg-[#141414] flex items-center justify-center min-h-[180px] relative">
                  <p className="absolute top-4 left-5 text-xs font-bold tracking-widest text-white/40 uppercase">{featured.category}</p>
                  {getBlocks(featured).some(b => b.type === 'media')
                    ? <div className="w-16 h-16 rounded-full bg-[#e33b5f] flex items-center justify-center shadow-lg"><Play className="w-7 h-7 text-white" /></div>
                    : <Megaphone className="w-10 h-10 text-white/20" />}
                </div>
                <div className="p-6 sm:p-7 flex flex-col">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <VisiBadge vis={featured.visibility} />
                      {!featured.is_published && isAdmin && <DraftBadge ann={featured} />}
                    </div>
                    <span className="text-xs text-[#9e9e9e]">{featured.meta}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#222] mb-2">{featured.title}</h2>
                  <p className="text-sm text-[#7e7e7e] flex-1 line-clamp-3">{excerpt(featured)}</p>
                  {isAdmin && <p className="text-[11px] text-[#9e9e9e] mt-2 flex items-center gap-1"><Users className="w-3 h-3" />{describeAudience(normalizeAudience(featured.audience))}</p>}
                  <div className="flex items-center gap-3 mt-5 flex-wrap">
                    <Button className="bg-[#e33b5f] text-white text-sm" onClick={e => { e.stopPropagation(); open(featured); }}>
                      {featured.cta ?? 'Read →'}
                    </Button>
                    {featured.visibility === 'external_use' && featured.is_published && (
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setShareId(featured.id); }}>
                        <Share2 className="w-3.5 h-3.5 mr-1" />Share
                      </Button>
                    )}
                    {isAdmin && <div className="ml-auto"><AdminActions ann={featured} /></div>}
                  </div>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {rest.map(ann => (
                <div key={ann.id} className="border border-[#e8e8e8] rounded-xl p-6 flex flex-col cursor-pointer hover:border-[#e33b5f]/30 transition h-full bg-white"
                  onClick={() => open(ann)}>
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <span className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">{ann.category}</span>
                    <div className="flex items-center gap-1.5">
                      {!ann.is_published && isAdmin && <DraftBadge ann={ann} />}
                      <VisiBadge vis={ann.visibility} />
                    </div>
                  </div>
                  <h3 className="font-bold text-[#222] text-base mb-2">{ann.title}</h3>
                  <p className="text-sm text-[#7e7e7e] flex-1 line-clamp-3">{excerpt(ann, 180)}</p>
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f0f0f0] flex-wrap gap-2">
                    <span className="text-xs text-[#9e9e9e]">{ann.meta}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#e33b5f]">{ann.cta ?? 'Read →'}</span>
                      {ann.visibility === 'external_use' && ann.is_published && (
                        <button onClick={e => { e.stopPropagation(); setShareId(ann.id); }}
                          className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-[#e33b5f]/40 transition">
                          <Share2 className="w-3.5 h-3.5 text-[#9e9e9e]" />
                        </button>
                      )}
                      {isAdmin && <AdminActions ann={ann} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share dialog */}
        {shareId && (() => {
          const ann = items.find(i => i.id === shareId);
          if (!ann) return null;
          const url = shareUrl(shareId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShareId(null); setCopied(false); }} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-0.5">External Use</p>
                    <h3 className="font-bold text-[#222]">Share this announcement</h3>
                  </div>
                  <button onClick={() => { setShareId(null); setCopied(false); }} className="w-8 h-8 rounded-full hover:bg-[#f0f0f0] flex items-center justify-center">
                    <X className="w-4 h-4 text-[#9e9e9e]" />
                  </button>
                </div>
                <p className="text-sm text-[#7e7e7e]">Anyone with the link can read “{ann.title}” without signing in.</p>
                <div className="flex items-center gap-2 bg-[#f6f6f6] rounded-lg px-3 py-2">
                  <Link className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
                  <span className="text-xs text-[#555353] flex-1 truncate">{url}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button className="bg-[#e33b5f] text-white" onClick={() => copyShareLink(shareId)}>
                    {copied ? <><Check className="w-4 h-4 mr-1" />Copied!</> : <><Link className="w-4 h-4 mr-1" />Copy Link</>}
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank')}>WhatsApp</Button>
                  <Button variant="outline" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(ann.title)}&body=${encodeURIComponent(url)}`, '_blank')}>Email</Button>
                </div>
                <p className="text-xs text-[#9e9e9e] pt-2 border-t border-[#f0f0f0]">
                  The recipient sees only this announcement — not the Hub, not other content, and no comments.
                </p>
              </div>
            </div>
          );
        })()}
      </>}

      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the announcement and all of its comments and reactions. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (pendingDelete) deleteAnn(pendingDelete.id); setPendingDelete(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
