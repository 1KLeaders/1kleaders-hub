'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Globe, Users, Edit2, Plus, Trash2, Camera, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface TeamMember { name: string; role: string; photo?: string; }
interface Startup {
  id: string; name: string; tagline: string | null; description: string | null;
  logo_url: string | null; website: string | null; industry: string | null;
  stage: string | null; location: string | null; deck_url: string | null;
  team: TeamMember[] | null; primary_color: string | null; accent_color: string | null;
}
interface Update {
  id: string; created_at: string; title: string; content: string | null;
  image_url: string | null; profiles: { first_name: string; last_name: string } | null;
}
interface Props { startupId: string; navigate?: (page: string) => void; }

export default function StartupDetailPage({ startupId, navigate }: Props) {
  const { profile, role } = useAuth();
  const [startup,   setStartup]   = useState<Startup | null>(null);
  const [updates,   setUpdates]   = useState<Update[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [posting,   setPosting]   = useState(false);
  const [showPost,  setShowPost]  = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody,  setPostBody]  = useState('');
  const [postImg,   setPostImg]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin    = ['admin','super-admin','developer'].includes(role ?? '');
  const isFounder  = profile?.founder_startup_ids?.includes(startupId);
  const canPost    = isAdmin || isFounder;

  useEffect(() => {
    supabase.from('startups').select('*').eq('id', startupId).single()
      .then(({ data }) => { setStartup(data as Startup); setLoading(false); });
    supabase.from('startup_updates')
      .select('*, profiles(first_name, last_name)')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUpdates((data ?? []) as Update[]));
  }, [startupId]);

  async function uploadImage(file: File): Promise<string | null> {
    const path = `startup-updates/${startupId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
    return publicUrl;
  }

  async function postUpdate() {
    if (!postTitle.trim()) return;
    setPosting(true);
    const { data } = await supabase.from('startup_updates').insert({
      startup_id: startupId,
      author_id:  profile!.id,
      title:      postTitle.trim(),
      content:    postBody.trim() || null,
      image_url:  postImg || null,
    }).select('*, profiles(first_name, last_name)').single();
    if (data) setUpdates(prev => [data as Update, ...prev]);
    setPostTitle(''); setPostBody(''); setPostImg(''); setShowPost(false);
    setPosting(false);
  }

  async function deleteUpdate(id: string) {
    await supabase.from('startup_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" />
    </div>
  );

  if (!startup) return (
    <div className="text-center py-20">
      <p className="text-[#9e9e9e]">Startup not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate?.('startups')}>← Back</Button>
    </div>
  );

  const primary = startup.primary_color ?? '#141414';
  const accent  = startup.accent_color  ?? '#e33b5f';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <button onClick={() => navigate?.('startups')}
        className="flex items-center gap-1.5 text-sm text-[#9e9e9e] hover:text-[#222] transition">
        <ArrowLeft className="w-4 h-4" />Back to Startups
      </button>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-[#f0f0f0]">
        <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
        <div className="px-8 pb-8 bg-white">
          <div className="flex items-end gap-5 -mt-10 mb-5">
            {startup.logo_url
              ? <img src={startup.logo_url} alt={startup.name} className="w-20 h-20 rounded-2xl border-4 border-white shadow-md object-contain bg-white" />
              : <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-2xl font-black text-white" style={{ background: accent }}>{startup.name[0]}</div>
            }
            <div className="pb-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-[#222]">{startup.name}</h1>
                {startup.stage && <Badge className="bg-[#f0f0f0] text-[#555353]">{startup.stage}</Badge>}
                {startup.industry && <Badge className="bg-[#f0f0f0] text-[#555353]">{startup.industry}</Badge>}
              </div>
              {startup.tagline && <p className="text-[#7e7e7e] mt-1">{startup.tagline}</p>}
            </div>
            {startup.website && (
              <a href={startup.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Globe className="w-3.5 h-3.5 mr-1" />Website</Button>
              </a>
            )}
          </div>
          {startup.description && <p className="text-[#555353] leading-relaxed">{startup.description}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          {/* Pitch Deck */}
          {startup.deck_url && (
            <Card className="border-[#f0f0f0]">
              <CardHeader className="pb-3"><CardTitle className="text-base">Pitch Deck</CardTitle></CardHeader>
              <CardContent>
                <a href={startup.deck_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full" style={{ backgroundColor: accent, color: '#fff' }}>
                    View Pitch Deck →
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Updates */}
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Startup Updates</CardTitle>
                {canPost && (
                  <Button size="sm" className="text-white" style={{ backgroundColor: accent }}
                    onClick={() => setShowPost(v => !v)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Post Update
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPost && canPost && (
                <div className="border border-[#f0f0f0] rounded-xl p-4 space-y-3 bg-[#fafafa]">
                  <input className="w-full border border-[#f0f0f0] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#e33b5f]/50"
                    placeholder="Update title..." value={postTitle} onChange={e => setPostTitle(e.target.value)} />
                  <textarea className="w-full border border-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e33b5f]/50 resize-none"
                    rows={3} placeholder="What's new? (optional)" value={postBody} onChange={e => setPostBody(e.target.value)} />
                  {postImg && <img src={postImg} alt="preview" className="w-full rounded-lg max-h-48 object-cover" />}
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (f) { const url = await uploadImage(f); if (url) setPostImg(url); }
                        e.target.value = '';
                      }} />
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5 mr-1" />Add Image
                    </Button>
                    <Button size="sm" className="text-white ml-auto" style={{ backgroundColor: accent }}
                      onClick={postUpdate} disabled={posting || !postTitle.trim()}>
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPost(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {updates.length === 0 && !showPost && (
                <p className="text-sm text-[#9e9e9e] text-center py-4">No updates yet.</p>
              )}
              {updates.map(u => (
                <div key={u.id} className="border-b border-[#f0f0f0] last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-[#222]">{u.title}</p>
                      <p className="text-xs text-[#9e9e9e]">
                        {u.profiles ? `${u.profiles.first_name} ${u.profiles.last_name}` : 'Team'} · {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {(isAdmin || isFounder) && (
                      <button onClick={() => deleteUpdate(u.id)} className="text-[#9e9e9e] hover:text-red-400 transition flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {u.image_url && <img src={u.image_url} alt="" className="mt-2 rounded-lg w-full max-h-48 object-cover" />}
                  {u.content && <p className="text-sm text-[#555353] mt-2 leading-relaxed">{u.content}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Team sidebar */}
        {startup.team && startup.team.length > 0 && (
          <div>
            <Card className="border-[#f0f0f0]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {startup.team.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {m.photo
                      ? <img src={m.photo} alt={m.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: accent }}>
                          {m.name[0]}
                        </div>
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#222] truncate">{m.name}</p>
                      <p className="text-xs text-[#9e9e9e] truncate">{m.role}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
