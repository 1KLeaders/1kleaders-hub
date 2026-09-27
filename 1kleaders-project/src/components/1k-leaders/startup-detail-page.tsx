'use client';
// LinkedIn-style company page for a portfolio startup: cover + logo header, Home / About / Updates / Team tabs.
// Founders of the startup (profiles.founder_startup_ids) and admins can edit the page and post updates.
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, ArrowLeft, Globe, Users, Pencil, Plus, Trash2, Camera, X, Linkedin, MapPin, Calendar,
  Building2, FileText, Image as ImageIcon, Video, Link2, Paperclip, Send, Rocket, TrendingUp, Save,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import {
  StartupLogo, UpdateAttachments, uploadStartupFile, kindForFile, formatBytes,
  type Startup, type TeamMember, type UpdateAttachment,
} from './startup-shared';

interface Update {
  id: string; created_at: string; author_id: string | null; title: string | null; content: string | null;
  image_url: string | null; attachments: UpdateAttachment[] | null;
  profiles: { first_name: string | null; last_name: string | null; profile_photo_url?: string | null } | null;
}
interface Props { startupId: string; navigate?: (page: string) => void; hideBack?: boolean; }

type Tab = 'home' | 'about' | 'updates' | 'team';
type Pending = { id: string; file?: File; link?: string; kind: UpdateAttachment['kind']; preview?: string };

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.key,.numbers,.pages,.txt,.zip';
const withHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function StartupDetailPage({ startupId, navigate, hideBack }: Props) {
  const { profile, role } = useAuth();
  const [startup, setStartup] = useState<Startup | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('home');
  const [error,   setError]   = useState<string | null>(null);

  // Composer
  const [postTitle, setPostTitle] = useState('');
  const [postBody,  setPostBody]  = useState('');
  const [pending,   setPending]   = useState<Pending[]>([]);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [posting,   setPosting]   = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef   = useRef<HTMLInputElement>(null);

  // Editing
  const [editOpen, setEditOpen] = useState(false);
  const [form,     setForm]     = useState<Partial<Startup>>({});
  const [saving,   setSaving]   = useState(false);
  const [uploadingImg, setUploadingImg] = useState<'logo' | 'cover' | null>(null);
  const logoRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<Update | null>(null);

  const isAdmin   = ['admin', 'super-admin', 'developer'].includes(role ?? '');
  const isFounder = ((profile as any)?.founder_startup_ids ?? []).map(String).includes(startupId);
  const canEdit   = isAdmin || isFounder;

  async function loadUpdates() {
    const { data } = await supabase.from('startup_updates')
      .select('*, profiles(first_name, last_name, profile_photo_url)')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false });
    setUpdates((data ?? []) as Update[]);
  }

  useEffect(() => {
    setLoading(true);
    supabase.from('startups').select('*').eq('id', startupId).maybeSingle()
      .then(({ data }) => { setStartup(data as Startup | null); setLoading(false); });
    loadUpdates();
  }, [startupId]);

  // ── Header images ──────────────────────────────────────────────────────
  async function changeImage(kind: 'logo' | 'cover', file: File) {
    if (!startup) return;
    setUploadingImg(kind); setError(null);
    try {
      const url = await uploadStartupFile(startup.id, file, kind);
      const col = kind === 'logo' ? 'logo_url' : 'cover_url';
      const { error } = await supabase.from('startups').update({ [col]: url }).eq('id', startup.id);
      if (error) throw new Error(error.message);
      setStartup(s => s ? { ...s, [col]: url } : s);
    } catch (e: any) {
      setError(`Could not update ${kind}: ${e.message}`);
    }
    setUploadingImg(null);
  }

  // ── Edit page ─────────────────────────────────────────────────────────
  function openEdit() {
    if (!startup) return;
    setForm({ ...startup, team: startup.team ?? [] });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!startup || !form.name?.trim()) return;
    setSaving(true); setError(null);
    const fields: (keyof Startup)[] = [
      'name', 'tagline', 'description', 'website', 'linkedin_url', 'industry', 'stage', 'location',
      'founded_year', 'team_size', 'deck_url', 'problem', 'solution', 'market_size', 'traction',
      'primary_color', 'accent_color', 'team',
    ];
    if (isAdmin) fields.push('status');
    const patch: Record<string, any> = {};
    for (const f of fields) {
      const v = (form as any)[f];
      patch[f] = typeof v === 'string' ? (v.trim() || null) : v ?? null;
    }
    patch.founded_year = form.founded_year ? Number(form.founded_year) || null : null;
    patch.team = (form.team ?? []).filter(m => m.name?.trim());

    const { data, error } = await supabase.from('startups').update(patch).eq('id', startup.id).select().single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    setStartup(data as Startup);
    setEditOpen(false);
  }

  const setTeam = (team: TeamMember[]) => setForm(f => ({ ...f, team }));

  async function uploadTeamPhoto(idx: number, file: File) {
    if (!startup) return;
    try {
      const url = await uploadStartupFile(startup.id, file, 'team');
      const team = [...(form.team ?? [])];
      team[idx] = { ...team[idx], photo: url };
      setTeam(team);
    } catch (e: any) { setError(e.message); }
  }

  // ── Composer ───────────────────────────────────────────────────────────
  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2), file, kind: kindForFile(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setPending(p => [...p, ...next]);
  }

  function addLink() {
    const url = linkDraft?.trim();
    if (!url) return;
    setPending(p => [...p, { id: Math.random().toString(36).slice(2), link: withHttp(url), kind: 'link' }]);
    setLinkDraft(null);
  }

  async function postUpdate() {
    if (!startup || !profile) return;
    if (!postBody.trim() && !postTitle.trim() && pending.length === 0) return;
    setPosting(true); setError(null);
    try {
      const attachments: UpdateAttachment[] = [];
      for (const p of pending) {
        if (p.link) { attachments.push({ kind: 'link', url: p.link }); continue; }
        const url = await uploadStartupFile(startup.id, p.file!, 'updates');
        attachments.push({ kind: p.kind, url, name: p.file!.name, size: p.file!.size, mime: p.file!.type });
      }
      const { data, error } = await supabase.from('startup_updates').insert({
        startup_id:  startup.id,
        author_id:   profile.id,
        title:       postTitle.trim() || null,
        content:     postBody.trim() || null,
        attachments: attachments.length ? attachments : null,
      }).select('*, profiles(first_name, last_name, profile_photo_url)').single();
      if (error) throw new Error(error.message);
      setUpdates(prev => [data as Update, ...prev]);
      pending.forEach(p => p.preview && URL.revokeObjectURL(p.preview));
      setPostTitle(''); setPostBody(''); setPending([]);
    } catch (e: any) {
      setError(`Could not post: ${e.message}`);
    }
    setPosting(false);
  }

  async function deleteUpdate(id: string) {
    await supabase.from('startup_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" /></div>
  );

  if (!startup) return (
    <div className="text-center py-20">
      <p className="text-[#9e9e9e]">Startup not found.</p>
      {!hideBack && <Button variant="outline" className="mt-4" onClick={() => navigate?.('startups')}>← Back</Button>}
    </div>
  );

  const primary  = startup.primary_color ?? '#141414';
  const accent   = startup.accent_color  ?? '#e33b5f';
  const industry = startup.industry ?? startup.sector;
  const team     = startup.team ?? [];
  const metaLine = [industry, startup.location, startup.founded_year ? `Founded ${startup.founded_year}` : null, startup.team_size ? `${startup.team_size} employees` : null].filter(Boolean);

  const aboutDetails = [
    { label: 'Website',   value: startup.website, href: startup.website ? withHttp(startup.website) : null, icon: Globe },
    { label: 'Industry',  value: industry, icon: Building2 },
    { label: 'Stage',     value: startup.stage, icon: TrendingUp },
    { label: 'Company size', value: startup.team_size ? `${startup.team_size} employees` : null, icon: Users },
    { label: 'Headquarters', value: startup.location, icon: MapPin },
    { label: 'Founded',   value: startup.founded_year?.toString() ?? null, icon: Calendar },
  ].filter(d => d.value);

  const pitchSections = [
    { label: 'Problem', value: startup.problem },
    { label: 'Solution', value: startup.solution },
    { label: 'Market size', value: startup.market_size },
    { label: 'Traction', value: startup.traction },
  ].filter(s => s.value);

  // ── Pieces (render functions, not nested components, so inputs keep focus) ──
  const card = 'bg-white border border-[#f0f0f0] rounded-2xl';

  function renderUpdate(u: Update) {
    const author = u.profiles;
    const name = author ? `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() || 'Team member' : startup!.name;
    const attachments: UpdateAttachment[] = [
      ...(u.image_url ? [{ kind: 'image' as const, url: u.image_url }] : []),
      ...(u.attachments ?? []),
    ];
    return (
      <article key={u.id} className={`${card} p-5`}>
        <div className="flex items-start gap-3">
          <StartupLogo startup={startup!} size={44} rounded="rounded-lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#222]">{startup!.name}</p>
            <p className="text-xs text-[#9e9e9e] flex items-center gap-1.5 flex-wrap">
              <Avatar className="w-4 h-4">
                {author?.profile_photo_url && <AvatarImage src={author.profile_photo_url} alt="" />}
                <AvatarFallback className="text-[7px] bg-[#f0f0f0]">{name[0]}</AvatarFallback>
              </Avatar>
              {name} · {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {canEdit && (
            <button onClick={() => setPendingDelete(u)} className="text-[#9e9e9e] hover:text-red-500 transition p-1" title="Delete post">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {u.title && <p className="font-semibold text-[#222] mt-3">{u.title}</p>}
        {u.content && <p className="text-sm text-[#444] mt-2 leading-relaxed whitespace-pre-wrap break-words">{u.content}</p>}
        <UpdateAttachments items={attachments} />
      </article>
    );
  }

  function renderComposer() {
    if (!canEdit) return null;
    return (
      <div className={`${card} p-4 space-y-3`}>
        <div className="flex items-start gap-3">
          <StartupLogo startup={startup!} size={40} rounded="rounded-lg" />
          <div className="flex-1 space-y-2">
            <Input className="border-[#f0f0f0] text-sm font-medium" placeholder="Headline (optional)" value={postTitle} onChange={e => setPostTitle(e.target.value)} />
            <textarea rows={3} value={postBody} onChange={e => setPostBody(e.target.value)} placeholder={`Share an update from ${startup!.name}...`}
              className="w-full border border-[#f0f0f0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#e33b5f]/50" />
          </div>
        </div>

        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-[52px]">
            {pending.map(p => (
              <div key={p.id} className="relative group">
                {p.preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.preview} alt="" className="w-20 h-20 rounded-lg object-cover border border-[#f0f0f0]" />
                  : (
                    <div className="h-20 w-40 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-2 flex flex-col justify-between">
                      {p.kind === 'video' ? <Video className="w-4 h-4 text-[#e33b5f]" /> : p.kind === 'link' ? <Link2 className="w-4 h-4 text-[#e33b5f]" /> : <FileText className="w-4 h-4 text-[#e33b5f]" />}
                      <p className="text-[11px] text-[#555353] truncate">{p.file?.name ?? p.link}</p>
                      {p.file && <p className="text-[10px] text-[#9e9e9e]">{formatBytes(p.file.size)}</p>}
                    </div>
                  )}
                <button onClick={() => { if (p.preview) URL.revokeObjectURL(p.preview); setPending(prev => prev.filter(x => x.id !== p.id)); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#222] text-white flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {linkDraft !== null && (
          <div className="flex gap-2 pl-[52px]">
            <Input autoFocus className="border-[#f0f0f0] text-sm h-9" placeholder="Paste a link (YouTube, Loom, article, Drive…)"
              value={linkDraft} onChange={e => setLinkDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} />
            <Button size="sm" variant="outline" className="h-9" onClick={addLink}>Add</Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => setLinkDraft(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}

        <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={videoRef} type="file" accept="video/*,audio/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={docRef} type="file" accept={DOC_ACCEPT} multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

        <div className="flex items-center gap-1 flex-wrap border-t border-[#f5f5f5] pt-3">
          <Button size="sm" variant="ghost" className="text-[#555353]" onClick={() => imageRef.current?.click()}><ImageIcon className="w-4 h-4 mr-1.5 text-sky-600" />Photos</Button>
          <Button size="sm" variant="ghost" className="text-[#555353]" onClick={() => videoRef.current?.click()}><Video className="w-4 h-4 mr-1.5 text-emerald-600" />Video / Audio</Button>
          <Button size="sm" variant="ghost" className="text-[#555353]" onClick={() => docRef.current?.click()}><Paperclip className="w-4 h-4 mr-1.5 text-amber-600" />Document</Button>
          <Button size="sm" variant="ghost" className="text-[#555353]" onClick={() => setLinkDraft('')}><Link2 className="w-4 h-4 mr-1.5 text-purple-600" />Link</Button>
          <Button size="sm" className="ml-auto text-white" style={{ backgroundColor: accent }} onClick={postUpdate}
            disabled={posting || (!postBody.trim() && !postTitle.trim() && pending.length === 0)}>
            {posting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Posting...</> : <><Send className="w-4 h-4 mr-1.5" />Post</>}
          </Button>
        </div>
      </div>
    );
  }

  function renderTeam(limit?: number) {
    const shown = limit ? team.slice(0, limit) : team;
    if (!team.length) return <p className="text-sm text-[#9e9e9e]">No team members listed yet.</p>;
    return (
      <div className={limit ? 'space-y-3' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
        {shown.map((m, i) => (
          <div key={i} className={limit ? 'flex items-center gap-3' : `${card} p-4 flex flex-col items-center text-center`}>
            <Avatar className={limit ? 'w-10 h-10' : 'w-20 h-20 mb-3'}>
              {m.photo && <AvatarImage src={m.photo} alt={m.name} className="object-cover" />}
              <AvatarFallback className="text-white font-bold" style={{ backgroundColor: accent }}>{m.name?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#222] truncate">{m.name}</p>
              <p className="text-xs text-[#7e7e7e] truncate">{m.role}</p>
              {!limit && m.bio && <p className="text-xs text-[#9e9e9e] mt-2 line-clamp-3">{m.bio}</p>}
              {!limit && m.linkedin && (
                <a href={withHttp(m.linkedin)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0a66c2] mt-2 hover:underline">
                  <Linkedin className="w-3 h-3" />LinkedIn
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-4">
      {!hideBack && (
        <button onClick={() => navigate?.('startups')} className="flex items-center gap-1.5 text-sm text-[#9e9e9e] hover:text-[#222] transition">
          <ArrowLeft className="w-4 h-4" />Back to Startups
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <span className="flex-1">{error}</span><button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Header ── */}
      <section className={`${card} overflow-hidden`}>
        <div className="relative h-36 sm:h-52 w-full" style={startup.cover_url ? undefined : { background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          {startup.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={startup.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {canEdit && (
            <>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) changeImage('cover', f); e.target.value = ''; }} />
              <button onClick={() => coverRef.current?.click()} disabled={!!uploadingImg}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-xs font-medium text-[#222] shadow">
                {uploadingImg === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                {startup.cover_url ? 'Change cover' : 'Add cover'}
              </button>
            </>
          )}
        </div>

        <div className="px-5 sm:px-8 pb-6">
          <div className="relative -mt-12 sm:-mt-16 mb-4 w-fit">
            <StartupLogo startup={startup} size={112} rounded="rounded-2xl" className="border-4 border-white shadow-md sm:!w-[136px] sm:!h-[136px]" />
            {canEdit && (
              <>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) changeImage('logo', f); e.target.value = ''; }} />
                <button onClick={() => logoRef.current?.click()} disabled={!!uploadingImg} title="Change logo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-[#e8e8e8] shadow flex items-center justify-center hover:bg-[#f6f6f6]">
                  {uploadingImg === 'logo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-[#555353]" />}
                </button>
              </>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#222] break-words">{startup.name}</h1>
                {startup.stage && <Badge className="text-white" style={{ backgroundColor: accent }}>{startup.stage}</Badge>}
                {!startup.is_visible && isAdmin && <Badge className="bg-stone-100 text-stone-500">Hidden</Badge>}
              </div>
              {startup.tagline && <p className="text-[#444] mt-1">{startup.tagline}</p>}
              {metaLine.length > 0 && <p className="text-sm text-[#9e9e9e] mt-1">{metaLine.join(' · ')}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {startup.website && (
                <a href={withHttp(startup.website)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="text-white rounded-full" style={{ backgroundColor: accent }}><Globe className="w-3.5 h-3.5 mr-1.5" />Visit website</Button>
                </a>
              )}
              {startup.deck_url && (
                <a href={withHttp(startup.deck_url)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-full"><FileText className="w-3.5 h-3.5 mr-1.5" />Pitch deck</Button>
                </a>
              )}
              {startup.linkedin_url && (
                <a href={withHttp(startup.linkedin_url)} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                  <Button size="sm" variant="outline" className="rounded-full w-9 p-0"><Linkedin className="w-4 h-4 text-[#0a66c2]" /></Button>
                </a>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" className="rounded-full" onClick={openEdit}><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit page</Button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex border-t border-[#f0f0f0] px-3 sm:px-6 overflow-x-auto">
          {([['home', 'Home'], ['about', 'About'], ['updates', `Updates${updates.length ? ` (${updates.length})` : ''}`], ['team', 'Team']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab === t ? 'text-[#222]' : 'border-transparent text-[#7e7e7e] hover:text-[#222]'}`}
              style={tab === t ? { borderColor: accent } : undefined}>
              {label}
            </button>
          ))}
        </nav>
      </section>

      {/* ── Tab content ── */}
      {tab === 'home' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <section className={`${card} p-5`}>
              <h2 className="font-bold text-[#222] mb-2">Overview</h2>
              {startup.description
                ? <p className="text-sm text-[#555353] leading-relaxed whitespace-pre-wrap line-clamp-6">{startup.description}</p>
                : <p className="text-sm text-[#9e9e9e]">{canEdit ? 'Add an overview with “Edit page”.' : 'No overview yet.'}</p>}
              <button onClick={() => setTab('about')} className="text-sm font-semibold mt-3 hover:underline" style={{ color: accent }}>Show all details →</button>
            </section>
            {renderComposer()}
            {updates.length === 0
              ? <div className={`${card} p-8 text-center text-sm text-[#9e9e9e]`}><Rocket className="w-8 h-8 mx-auto mb-2 text-[#d0d0d0]" />No updates yet.</div>
              : updates.slice(0, 3).map(renderUpdate)}
            {updates.length > 3 && (
              <button onClick={() => setTab('updates')} className="w-full text-sm font-semibold py-2 hover:underline" style={{ color: accent }}>See all {updates.length} updates →</button>
            )}
          </div>
          <aside className="space-y-4">
            <section className={`${card} p-5`}>
              <h2 className="font-bold text-[#222] mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Team</h2>
              {renderTeam(5)}
              {team.length > 5 && <button onClick={() => setTab('team')} className="text-sm font-semibold mt-3 hover:underline" style={{ color: accent }}>See all →</button>}
            </section>
            {aboutDetails.length > 0 && (
              <section className={`${card} p-5 space-y-2.5`}>
                {aboutDetails.slice(0, 4).map(d => (
                  <p key={d.label} className="text-sm text-[#555353] flex items-center gap-2 min-w-0">
                    <d.icon className="w-4 h-4 text-[#9e9e9e] shrink-0" />
                    {d.href ? <a href={d.href} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: accent }}>{d.value}</a> : <span className="truncate">{d.value}</span>}
                  </p>
                ))}
              </section>
            )}
          </aside>
        </div>
      )}

      {tab === 'about' && (
        <section className={`${card} p-5 sm:p-7 space-y-6`}>
          <div>
            <h2 className="font-bold text-lg text-[#222] mb-2">Overview</h2>
            <p className="text-sm text-[#555353] leading-relaxed whitespace-pre-wrap">{startup.description || 'No overview yet.'}</p>
          </div>
          {aboutDetails.length > 0 && (
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {aboutDetails.map(d => (
                <div key={d.label}>
                  <dt className="text-sm font-semibold text-[#222]">{d.label}</dt>
                  <dd className="text-sm text-[#555353] break-words">
                    {d.href ? <a href={d.href} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: accent }}>{d.value}</a> : d.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {pitchSections.map(s => (
            <div key={s.label}>
              <h3 className="text-sm font-semibold text-[#222] mb-1">{s.label}</h3>
              <p className="text-sm text-[#555353] leading-relaxed whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </section>
      )}

      {tab === 'updates' && (
        <div className="max-w-2xl space-y-4">
          {renderComposer()}
          {updates.length === 0
            ? <div className={`${card} p-8 text-center text-sm text-[#9e9e9e]`}>No updates yet.</div>
            : updates.map(renderUpdate)}
        </div>
      )}

      {tab === 'team' && renderTeam()}

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {startup.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['name', 'Name *'], ['tagline', 'Tagline'], ['website', 'Website'], ['linkedin_url', 'LinkedIn page'],
                ['industry', 'Industry'], ['stage', 'Stage'], ['location', 'Headquarters'], ['founded_year', 'Founded (year)'],
                ['team_size', 'Company size (e.g. 2-10)'], ['deck_url', 'Pitch deck URL'],
                ['primary_color', 'Primary colour (#hex)'], ['accent_color', 'Accent colour (#hex)'],
                ...(isAdmin ? [['status', 'Status (Active / Stealth / Exited)']] : []),
              ] as [keyof Startup, string][]).map(([key, label]) => (
                <label key={key} className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider space-y-1">
                  <span>{label}</span>
                  <Input className="border-[#e8e8e8] text-sm normal-case tracking-normal font-normal text-[#222]" value={(form as any)[key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </label>
              ))}
            </div>
            {([['description', 'Overview'], ['problem', 'Problem'], ['solution', 'Solution'], ['market_size', 'Market size'], ['traction', 'Traction']] as [keyof Startup, string][]).map(([key, label]) => (
              <label key={key} className="block text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider space-y-1">
                <span>{label}</span>
                <textarea rows={key === 'description' ? 5 : 3} className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm resize-y normal-case tracking-normal font-normal text-[#222]"
                  value={(form as any)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </label>
            ))}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Team</p>
                <Button size="sm" variant="outline" onClick={() => setTeam([...(form.team ?? []), { name: '', role: '' }])}><Plus className="w-3.5 h-3.5 mr-1" />Add member</Button>
              </div>
              <div className="space-y-2">
                {(form.team ?? []).map((m, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 border border-[#f0f0f0] rounded-lg">
                    <label className="cursor-pointer shrink-0" title="Upload photo">
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadTeamPhoto(i, f); e.target.value = ''; }} />
                      <Avatar className="w-10 h-10">
                        {m.photo && <AvatarImage src={m.photo} alt="" className="object-cover" />}
                        <AvatarFallback className="bg-[#f0f0f0]"><Camera className="w-4 h-4 text-[#9e9e9e]" /></AvatarFallback>
                      </Avatar>
                    </label>
                    <div className="flex-1 grid sm:grid-cols-2 gap-2">
                      {(['name', 'role', 'linkedin', 'bio'] as const).map(k => (
                        <Input key={k} className="h-8 text-sm border-[#e8e8e8]" placeholder={k === 'linkedin' ? 'LinkedIn URL' : k[0].toUpperCase() + k.slice(1)}
                          value={m[k] ?? ''} onChange={e => { const t = [...(form.team ?? [])]; t[i] = { ...t[i], [k]: e.target.value }; setTeam(t); }} />
                      ))}
                    </div>
                    <button onClick={() => setTeam((form.team ?? []).filter((_, j) => j !== i))} className="p-1 text-[#9e9e9e] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="bg-[#e33b5f] text-white" onClick={saveEdit} disabled={saving || !form.name?.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>The post and its attachments will be removed from the startup page. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (pendingDelete) deleteUpdate(pendingDelete.id); setPendingDelete(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
