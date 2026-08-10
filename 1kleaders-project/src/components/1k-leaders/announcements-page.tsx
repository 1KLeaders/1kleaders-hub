'use client';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Megaphone, Lock, Globe, FileText, Play, Pause,
  Share2, X, ChevronUp, Loader2, Plus, RefreshCw,
  Link, Check, Trash2, Eye, EyeOff, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; }

type Visibility = 'shareholders_only' | 'external_use';
type Category   = 'Updates' | 'Reports' | 'Podcast' | 'Newsletter' | 'Announcement';

type Announcement = {
  id:           string;
  created_at:   string;
  title:        string;
  category:     Category;
  visibility:   Visibility;
  content:      string | null;
  meta:         string | null;
  cta:          string | null;
  media_url:    string | null;
  attachments:  { name: string; url: string; size?: number }[] | null;
  is_published: boolean;
};

type NewAnn = Omit<Announcement, 'id' | 'created_at'>;

const CATEGORIES: Category[] = ['Updates', 'Reports', 'Podcast', 'Newsletter', 'Announcement'];

const EMPTY_ANN: NewAnn = {
  title: '', category: 'Announcement', visibility: 'shareholders_only',
  content: '', meta: '', cta: 'Read →', media_url: null, attachments: null, is_published: false,
};

export default function AnnouncementsPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(role ?? '');

  const [items,       setItems]       = useState<Announcement[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cat,         setCat]         = useState<string>('All');
  const [openId,      setOpenId]      = useState<string | null>(null);
  const [shareId,     setShareId]     = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState<NewAnn>(EMPTY_ANN);
  const [saving,      setSaving]      = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  async function fetchAnnouncements() {
    setLoading(true);
    let q = supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (!isAdmin) q = q.eq('is_published', true);
    const { data } = await q;
    setItems((data ?? []) as Announcement[]);
    setLoading(false);
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  // Scroll to expanded doc
  useEffect(() => {
    if (openId && docRef.current && mainRef.current) {
      setTimeout(() => {
        docRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [openId]);

  function autoMeta(title: string, cat: Category): string {
    const now = new Date();
    const month = now.toLocaleString('en-GB', { month: 'long' });
    const year = now.getFullYear();
    const readTime = cat === 'Podcast' ? '35 min' : cat === 'Updates' ? '8 min read' : cat === 'Reports' ? '12 min read' : '3 min read';
    return `${month} ${year} · ${readTime}`;
  }

  async function uploadAttachments(): Promise<{ name: string; url: string; size: number }[]> {
    const results: { name: string; url: string; size: number }[] = [];
    for (const file of pendingFiles) {
      const path = `announcements/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('announcement-attachments').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('announcement-attachments').getPublicUrl(path);
        results.push({ name: file.name, url: publicUrl, size: file.size });
      }
    }
    return results;
  }

  async function saveAnn() {
    if (!form.title.trim()) return;
    setSaving(true);
    setUploading(true);
    const uploadedFiles = await uploadAttachments();
    setUploading(false);
    setPendingFiles([]);
    const existingAtts = form.attachments ?? [];
    const allAttachments = [...existingAtts, ...uploadedFiles];
    const formWithAtts = { ...form, attachments: allAttachments.length > 0 ? allAttachments : null };
    if (editId) {
      const { data } = await supabase.from('announcements').update({ ...formWithAtts, updated_at: new Date().toISOString() }).eq('id', editId).select().single();
      if (data) setItems(prev => prev.map(i => i.id === editId ? data as Announcement : i));
    } else {
      const { data } = await supabase.from('announcements').insert(formWithAtts).select().single();
      if (data) setItems(prev => [data as Announcement, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_ANN);
  }

  async function togglePublish(ann: Announcement) {
    await supabase.from('announcements').update({ is_published: !ann.is_published }).eq('id', ann.id);
    setItems(prev => prev.map(i => i.id === ann.id ? { ...i, is_published: !i.is_published } : i));
  }

  async function deleteAnn(id: string) {
    await supabase.from('announcements').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (openId === id) setOpenId(null);
  }

  function copyShareLink(id: string) {
    const url = `${window.location.origin}/announcements/${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const filtered = items.filter(i => cat === 'All' || i.category === cat);
  const featured  = filtered[0];
  const rest      = filtered.slice(1);
  const openAnn   = items.find(i => i.id === openId) ?? null;

  // Shared visibility component
  function VisiBadge({ vis }: { vis: Visibility }) {
    return vis === 'external_use'
      ? <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-0 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />External Use</Badge>
      : <Badge className="bg-[#f0f0f0] text-[#555353] border border-[#e0e0e0] text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Shareholders Only</Badge>;
  }

  return (
    <div className="min-h-full" ref={mainRef}>
      {/* Header */}
      <div className="px-8 py-12 max-w-5xl">
        <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-3">1KL Hub / Announcements</p>
        <div className="h-px w-full bg-[#e33b5f] mb-5" />
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#222] mb-2">Announcements</h1>
            <p className="text-base text-[#7e7e7e] max-w-xl">Stay up to date with the latest updates, reports, insights, and content from 1K Leaders.</p>
          </div>
          {isAdmin && (
            <Button className="bg-[#e33b5f] text-white" onClick={() => { setForm(EMPTY_ANN); setEditId(null); setShowForm(v => !v); }}>
              {showForm ? <><X className="w-4 h-4 mr-1" />Cancel</> : <><Plus className="w-4 h-4 mr-1" />New Announcement</>}
            </Button>
          )}
        </div>
      </div>

      {/* Admin create/edit form */}
      {isAdmin && showForm && (
        <div className="mx-8 mb-8 max-w-5xl bg-[#f6f6f6] border border-[#e8e8e8] rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-[#222]">{editId ? 'Edit Announcement' : 'New Announcement'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Title *</label>
              <Input className="border-[#e8e8e8]" value={form.title} onChange={e => {
                const t = e.target.value;
                setForm(f => ({ ...f, title: t, meta: f.meta || autoMeta(t, f.category) }));
              }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Meta</label>
              <Input className="border-[#e8e8e8]" placeholder="e.g. August 2026 · 5 min read" value={form.meta ?? ''} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Category</label>
              <select className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => {
                const cat = e.target.value as Category;
                setForm(f => ({ ...f, category: cat, meta: autoMeta(f.title, cat) }));
              }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Visibility</label>
              <select className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as Visibility }))}>
                <option value="shareholders_only">Shareholders Only</option>
                <option value="external_use">External Use</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Description</label>
            <textarea className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm resize-none" rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Full Content</label>
            <textarea className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm resize-none font-mono text-xs" rows={8}
              placeholder="Markdown or plain text body of the announcement..."
              value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">CTA Label</label>
              <Input className="border-[#e8e8e8]" value={form.cta ?? ''} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">Media URL (Podcast/Video)</label>
              <Input className="border-[#e8e8e8]" placeholder="https://..." value={form.media_url ?? ''} onChange={e => setForm(f => ({ ...f, media_url: e.target.value || null }))} />
            </div>
          </div>
          {/* Attachments */}
          <div>
            <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-2">Attachments</label>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => { setPendingFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
            <div className="border-2 border-dashed border-[#e8e8e8] rounded-lg p-4 space-y-2">
              {[...(form.attachments ?? []), ...pendingFiles.map(f => ({ name: f.name, url: null, size: f.size }))].map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#f6f6f6] rounded px-3 py-1.5 text-xs">
                  <span className="flex-1 truncate">{a.name}</span>
                  {a.size && <span className="text-[#9e9e9e]">{(a.size / 1024).toFixed(1)} KB</span>}
                  <button onClick={() => {
                    if ((a as any).url) setForm(f => ({ ...f, attachments: (f.attachments ?? []).filter(x => x.url !== (a as any).url) }));
                    else setPendingFiles(prev => prev.filter(f => f.name !== a.name));
                  }} className="text-[#9e9e9e] hover:text-red-500">×</button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#e33b5f] font-medium hover:underline">
                + Add attachment
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-[#e33b5f]" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
              <span className="text-sm font-medium text-[#222]">Published</span>
            </label>
            <Button className="bg-[#e33b5f] text-white ml-auto" onClick={saveAnn} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editId ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="px-8 pb-6 max-w-5xl">
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
        <div className="flex items-center justify-center py-20 gap-2 text-[#9e9e9e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading announcements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Megaphone className="w-10 h-10 text-[#9e9e9e]" />
          <p className="text-sm text-[#9e9e9e]">No announcements yet.</p>
        </div>
      ) : (
        <div className="px-8 pb-12 max-w-5xl space-y-5">
          {/* Featured card */}
          {featured && (
            <div className="border border-[#e8e8e8] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-[380px_1fr] cursor-pointer hover:border-[#e33b5f]/30 transition"
              onClick={() => setOpenId(openId === featured.id ? null : featured.id)}>
              {/* Media/icon panel */}
              <div className="bg-[#141414] flex items-center justify-center min-h-[200px] relative">
                <p className="absolute top-4 left-5 text-xs font-bold tracking-widest text-white/40 uppercase">{featured.category}</p>
                {featured.category === 'Podcast' && featured.media_url
                  ? <div className="w-16 h-16 rounded-full bg-[#e33b5f] flex items-center justify-center shadow-lg"><Play className="w-7 h-7 text-white" /></div>
                  : <Megaphone className="w-10 h-10 text-white/20" />
                }
              </div>
              {/* Content panel */}
              <div className="p-7 flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <VisiBadge vis={featured.visibility} />
                  </div>
                  <span className="text-xs text-[#9e9e9e]">{featured.meta}</span>
                </div>
                <h2 className="text-xl font-bold text-[#222] mb-2">{featured.title}</h2>
<p className="text-sm text-[#7e7e7e] flex-1 line-clamp-3">{featured.content?.slice(0, 200)?.replace(/#+\s/g, '').replace(/\*\*/g, '')}</p>
                <div className="flex items-center gap-3 mt-5 flex-wrap">
                  <Button className="bg-[#e33b5f] text-white text-sm"
                    onClick={e => { e.stopPropagation(); setOpenId(openId === featured.id ? null : featured.id); }}>
                    {featured.cta ?? 'Read →'}
                  </Button>
                  {featured.visibility === 'external_use' && (
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setShareId(featured.id); }}>
                      <Share2 className="w-3.5 h-3.5 mr-1" />Share
                    </Button>
                  )}
                  {isAdmin && (
                    <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setForm({ ...featured }); setEditId(featured.id); setShowForm(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => togglePublish(featured)}>
                        {featured.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-50" onClick={() => deleteAnn(featured.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Expanded content inline */}
          {openAnn && openAnn.id === featured?.id && (
            <div ref={docRef} className="border border-[#e8e8e8] rounded-2xl overflow-hidden shadow-sm">
              <AnnouncementDetail ann={openAnn} onClose={() => setOpenId(null)} onShare={() => setShareId(openAnn.id)} />
            </div>
          )}

          {/* Grid of remaining cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {rest.map(ann => (
              <div key={ann.id}>
                <div className="border border-[#e8e8e8] rounded-xl p-6 flex flex-col cursor-pointer hover:border-[#e33b5f]/30 transition h-full"
                  onClick={() => setOpenId(openId === ann.id ? null : ann.id)}>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">{ann.category}</span>
                    <VisiBadge vis={ann.visibility} />
                  </div>
                  <h3 className="font-bold text-[#222] text-base mb-2">{ann.title}</h3>
<p className="text-sm text-[#7e7e7e] flex-1 line-clamp-3">{ann.content?.slice(0, 180)?.replace(/#+\s/g, '').replace(/\*\*/g, '')}</p>
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f0f0f0] flex-wrap gap-2">
                    <span className="text-xs text-[#9e9e9e]">{ann.meta}</span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold text-[#e33b5f] hover:underline">{ann.cta ?? 'Read →'}</button>
                      {ann.visibility === 'external_use' && (
                        <button onClick={e => { e.stopPropagation(); setShareId(ann.id); }}
                          className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-[#e33b5f]/40 transition">
                          <Share2 className="w-3.5 h-3.5 text-[#9e9e9e]" />
                        </button>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-[#e33b5f]/40"
                            onClick={() => { setForm({ ...ann }); setEditId(ann.id); setShowForm(true); }}>
                            <Eye className="w-3 h-3 text-[#9e9e9e]" />
                          </button>
                          <button className="w-7 h-7 rounded border border-[#e8e8e8] flex items-center justify-center hover:border-red-300"
                            onClick={() => deleteAnn(ann.id)}>
                            <Trash2 className="w-3 h-3 text-[#9e9e9e]" />
                          </button>
                        </div>
                      )}
                      {!ann.is_published && isAdmin && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Draft</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Inline expanded content */}
                {openId === ann.id && (
                  <div ref={docRef} className="mt-3 border border-[#e8e8e8] rounded-xl overflow-hidden shadow-sm">
                    <AnnouncementDetail ann={ann} onClose={() => setOpenId(null)} onShare={() => setShareId(ann.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Visibility explainer */}
          <div className="mt-10 pt-8 border-t border-[#f0f0f0]">
            <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-4">How Visibility Works</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-[#f6f6f6] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4" /><span className="text-sm font-bold">Shareholders Only</span>
                </div>
                <ul className="text-sm text-[#7e7e7e] space-y-1.5 list-disc pl-4">
                  <li>Authenticated shareholders only</li>
                  <li>No share button in the UI</li>
                  <li>No public link is ever generated</li>
                  <li>Direct URL returns access-restricted state</li>
                </ul>
              </div>
              <div className="bg-[#e33b5f]/5 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-[#e33b5f]" /><span className="text-sm font-bold text-[#e33b5f]">External Use</span>
                </div>
                <ul className="text-sm text-[#7e7e7e] space-y-1.5 list-disc pl-4">
                  <li>Shareholders get early access</li>
                  <li>Share button visible on card</li>
                  <li>Public link works without an account</li>
                  <li>Shared page shows only that announcement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share dialog */}
      {shareId && (() => {
        const ann = items.find(i => i.id === shareId);
        if (!ann) return null;
        const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.1kleaders.com'}/announcements/${shareId}`;
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
              <p className="text-sm text-[#7e7e7e]">{ann.title} can be shared externally. Anyone with the link can view this without signing in.</p>
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
                The recipient sees only this announcement — not the Hub, not other content.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Expanded announcement content
function AnnouncementDetail({ ann, onClose, onShare }: { ann: Announcement; onClose: () => void; onShare: () => void }) {
  return (
    <div className="p-7">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {ann.visibility === 'external_use'
            ? <span className="text-xs font-bold tracking-widest text-[#e33b5f] uppercase flex items-center gap-1"><Globe className="w-3 h-3" />External Use</span>
            : <span className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Shareholders Only</span>
          }
        </div>
        <span className="text-xs text-[#9e9e9e]">{ann.meta}</span>
      </div>

      <h2 className="text-2xl font-bold text-[#222] mb-3">{ann.title}</h2>
      <p className="text-base text-[#7e7e7e] mb-6 max-w-2xl">{ann.description}</p>

      {/* Podcast player if media */}
      {ann.category === 'Podcast' && ann.media_url && (
        <div className="mb-6 bg-[#141414] rounded-xl p-6 flex items-center gap-4">
          <a href={ann.media_url} target="_blank" rel="noopener noreferrer"
            className="w-14 h-14 rounded-full bg-[#e33b5f] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition">
            <Play className="w-6 h-6 text-white" />
          </a>
          <div>
            <p className="text-sm font-semibold text-white">{ann.title}</p>
            <p className="text-xs text-white/60 mt-0.5">{ann.meta}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {ann.content && (
        <div className="flex flex-wrap gap-10">
          <article className="flex-1 min-w-0 prose prose-sm max-w-none text-[#555353]">
            {ann.content.split('\n').map((para, i) => {
              if (para.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-[#222] mt-10 mb-3 first:mt-0">{para.slice(3)}</h2>;
              if (para.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-[#222] mt-6 mb-2">{para.slice(4)}</h3>;
              if (para.startsWith('- ')) return (
                <div key={i} className="flex gap-3 mb-3">
                  <span className="w-5 h-0.5 bg-[#e33b5f] mt-3 flex-shrink-0" />
                  <p className="text-sm text-[#555353] leading-relaxed" dangerouslySetInnerHTML={{ __html: para.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#222]">$1</strong>') }} />
                </div>
              );
              if (!para.trim()) return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm text-[#555353] leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#222]">$1</strong>') }} />;
            })}
          </article>

          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 space-y-4">
            {ann.visibility === 'shareholders_only' ? (
              <div className="bg-[#f6f6f6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-bold">Shareholders Only</span>
                </div>
                <p className="text-xs text-[#7e7e7e]">This update is private to 1KL Hub. There is no share button and no public link.</p>
              </div>
            ) : (
              <div className="bg-[#e33b5f]/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-[#e33b5f]" />
                  <span className="text-sm font-bold text-[#e33b5f]">Shareable</span>
                </div>
                <p className="text-xs text-[#7e7e7e] mb-3">You can send this to anyone. They open it without an account.</p>
                <Button size="sm" variant="outline" className="w-full border-[#e33b5f]/30 text-[#e33b5f]" onClick={onShare}>
                  <Share2 className="w-3.5 h-3.5 mr-1" />Share ↗
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Attachments */}
      {ann.attachments && ann.attachments.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#f0f0f0]">
          <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-3">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {ann.attachments.map((att, i) => (
              <a key={i} href={att.url} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-[#f6f6f6] border border-[#e8e8e8] rounded-lg text-sm hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition group">
                <FileText className="w-4 h-4 text-[#9e9e9e] group-hover:text-[#e33b5f]" />
                <span className="text-[#555353] font-medium">{att.name}</span>
                {att.size && <span className="text-xs text-[#9e9e9e]">({(att.size / 1024).toFixed(1)} KB)</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#f0f0f0] flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#9e9e9e]" />
          <span className="text-xs text-[#9e9e9e]">Read inside 1KL Hub · {ann.meta}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronUp className="w-4 h-4 mr-1" />Close
        </Button>
      </div>
    </div>
  );
}
