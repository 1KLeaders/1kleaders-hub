'use client';
// Reactions, comments and replies for an announcement.
// Never rendered for External Use announcements (also enforced in the database — see migration-036).
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, MessageSquare, Reply, Trash2, Send, SmilePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { ADMIN_ROLES } from '@/lib/announcements';

const EMOJIS = ['👍', '❤️', '🎉', '👏', '💡', '🔥'] as const;

type Person = { first_name: string | null; last_name: string | null; profile_photo_url: string | null; role: string | null };
type Comment = {
  id: string; created_at: string; announcement_id: string; parent_id: string | null;
  user_id: string; body: string; author: Person | null;
};
type Reaction = { id: string; comment_id: string | null; user_id: string; emoji: string };

function personName(p: Person | null) {
  return p ? (`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Member') : 'Member';
}
function initials(p: Person | null) {
  return `${p?.first_name?.[0] ?? ''}${p?.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}
function timeAgo(date: string) {
  const mins = (Date.now() - new Date(date).getTime()) / 60000;
  if (mins < 1) return 'just now';
  if (mins < 60) return `${Math.floor(mins)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d`;
  return new Date(date).toLocaleDateString();
}

function ReactionBar({ reactions, commentId, myId, onToggle, compact }: {
  reactions: Reaction[]; commentId: string | null; myId: string | undefined;
  onToggle: (emoji: string, commentId: string | null) => void; compact?: boolean;
}) {
  const [picker, setPicker] = useState(false);
  const mine = reactions.filter(r => r.comment_id === commentId);
  const counts = EMOJIS.map(e => ({
    emoji: e,
    count: mine.filter(r => r.emoji === e).length,
    reacted: mine.some(r => r.emoji === e && r.user_id === myId),
  })).filter(c => c.count > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap relative">
      {counts.map(c => (
        <button key={c.emoji} onClick={() => onToggle(c.emoji, commentId)}
          className={`flex items-center gap-1 rounded-full border transition ${compact ? 'px-1.5 py-0 text-[11px]' : 'px-2.5 py-1 text-sm'} ${c.reacted ? 'bg-[#e33b5f]/10 border-[#e33b5f]/40 text-[#c02d4f]' : 'bg-white border-[#e8e8e8] text-[#555353] hover:border-[#e33b5f]/30'}`}>
          <span>{c.emoji}</span><span className="font-medium">{c.count}</span>
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setPicker(v => !v)} title="Add reaction"
          className={`flex items-center justify-center rounded-full border border-dashed border-[#d8d8d8] text-[#9e9e9e] hover:text-[#e33b5f] hover:border-[#e33b5f]/40 transition ${compact ? 'w-6 h-5' : 'w-8 h-7'}`}>
          <SmilePlus className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
        {picker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPicker(false)} />
            <div className="absolute bottom-full left-0 mb-1 z-50 flex gap-0.5 bg-white border border-[#e8e8e8] rounded-full shadow-lg px-1.5 py-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { onToggle(e, commentId); setPicker(false); }}
                  className="w-8 h-8 rounded-full hover:bg-[#f6f6f6] text-lg leading-none transition hover:scale-110">{e}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementEngagement({ announcementId }: { announcementId: string }) {
  const { profile } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(profile?.role ?? '');

  const [comments,  setComments]  = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [body,      setBody]      = useState('');
  const [posting,   setPosting]   = useState(false);
  const [replyTo,   setReplyTo]   = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: c, error: ce }, { data: r }] = await Promise.all([
      supabase.from('announcement_comments')
        .select('id, created_at, announcement_id, parent_id, user_id, body, author:profiles!announcement_comments_user_id_fkey(first_name, last_name, profile_photo_url, role)')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true }),
      supabase.from('announcement_reactions')
        .select('id, comment_id, user_id, emoji')
        .eq('announcement_id', announcementId),
    ]);
    if (ce) setError(ce.message);
    setComments((c ?? []) as unknown as Comment[]);
    setReactions((r ?? []) as Reaction[]);
    setLoading(false);
  }, [announcementId]);

  useEffect(() => {
    load();
    // Live updates when anyone comments or reacts
    const channel = supabase.channel(`ann-${announcementId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_comments', filter: `announcement_id=eq.${announcementId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reactions', filter: `announcement_id=eq.${announcementId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [announcementId, load]);

  async function toggleReaction(emoji: string, commentId: string | null) {
    if (!profile) return;
    const existing = reactions.find(r => r.emoji === emoji && r.comment_id === commentId && r.user_id === profile.id);
    if (existing) {
      setReactions(prev => prev.filter(r => r.id !== existing.id));
      await supabase.from('announcement_reactions').delete().eq('id', existing.id);
    } else {
      const temp: Reaction = { id: `temp-${Date.now()}`, comment_id: commentId, user_id: profile.id, emoji };
      setReactions(prev => [...prev, temp]);
      const { data, error } = await supabase.from('announcement_reactions')
        .insert({ announcement_id: announcementId, comment_id: commentId, user_id: profile.id, emoji })
        .select('id, comment_id, user_id, emoji').single();
      if (error) { setReactions(prev => prev.filter(r => r.id !== temp.id)); setError(error.message); }
      else setReactions(prev => prev.map(r => r.id === temp.id ? data as Reaction : r));
    }
  }

  async function post(text: string, parentId: string | null) {
    if (!profile || !text.trim()) return;
    setPosting(true); setError(null);
    const { error } = await supabase.from('announcement_comments')
      .insert({ announcement_id: announcementId, parent_id: parentId, user_id: profile.id, body: text.trim() });
    setPosting(false);
    if (error) { setError(error.message); return; }
    if (parentId) { setReplyBody(''); setReplyTo(null); } else setBody('');
    load();
  }

  async function deleteComment(c: Comment) {
    setComments(prev => prev.filter(x => x.id !== c.id && x.parent_id !== c.id));
    const { error } = await supabase.from('announcement_comments').delete().eq('id', c.id);
    if (error) { setError(error.message); load(); }
  }

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesOf = (id: string) => comments.filter(c => c.parent_id === id);

  // Plain render function (not a nested component) so the reply textarea keeps focus while typing
  function renderComment(c: Comment, isReply = false): React.ReactNode {
    const canDelete = c.user_id === profile?.id || isAdmin;
    return (
      <div key={c.id} className="flex gap-3">
        <Avatar className={isReply ? 'w-7 h-7' : 'w-9 h-9'}>
          {c.author?.profile_photo_url && <AvatarImage src={c.author.profile_photo_url} alt="" />}
          <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs font-semibold">{initials(c.author)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-[#f6f6f6] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#222]">{personName(c.author)}</span>
              {ADMIN_ROLES.includes(c.author?.role ?? '') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#141414]/10 text-[#141414] font-medium">1KL Team</span>}
              <span className="text-[11px] text-[#9e9e9e]">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm text-[#444] whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1 flex-wrap">
            <ReactionBar reactions={reactions} commentId={c.id} myId={profile?.id} onToggle={toggleReaction} compact />
            {!isReply && (
              <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(''); }}
                className="text-xs font-medium text-[#7e7e7e] hover:text-[#e33b5f] flex items-center gap-1">
                <Reply className="w-3 h-3" />Reply
              </button>
            )}
            {canDelete && (
              <button onClick={() => setPendingDelete(c)} className="text-xs text-[#9e9e9e] hover:text-red-500 flex items-center gap-1">
                <Trash2 className="w-3 h-3" />Delete
              </button>
            )}
          </div>

          {!isReply && (
            <div className="mt-3 space-y-3">
              {repliesOf(c.id).map(r => renderComment(r, true))}
              {replyTo === c.id && (
                <div className="flex gap-2">
                  <textarea autoFocus rows={1} value={replyBody} onChange={e => setReplyBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post(replyBody, c.id); } }}
                    placeholder={`Reply to ${personName(c.author)}...`}
                    className="flex-1 border border-[#e8e8e8] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#e33b5f]/50" />
                  <Button size="sm" className="bg-[#e33b5f] text-white self-end" disabled={posting || !replyBody.trim()} onClick={() => post(replyBody, c.id)}>
                    {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="px-5 sm:px-8 py-6 border-t border-[#f0f0f0] space-y-6">
      <ReactionBar reactions={reactions} commentId={null} myId={profile?.id} onToggle={toggleReaction} />

      <div>
        <h3 className="text-sm font-bold text-[#222] flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-[#e33b5f]" />Comments{comments.length > 0 && <span className="text-[#9e9e9e] font-normal">({comments.length})</span>}
        </h3>

        <div className="flex gap-3 mb-6">
          <Avatar className="w-9 h-9">
            {profile?.profile_photo_url && <AvatarImage src={profile.profile_photo_url} alt="" />}
            <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs font-semibold">
              {`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <textarea rows={2} value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment..."
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(body, null); }}
              className="w-full border border-[#e8e8e8] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#e33b5f]/50" />
            <div className="flex justify-end">
              <Button size="sm" className="bg-[#e33b5f] text-white" disabled={posting || !body.trim()} onClick={() => post(body, null)}>
                {posting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}Comment
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#9e9e9e]"><Loader2 className="w-4 h-4 animate-spin" />Loading comments...</div>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-[#9e9e9e]">No comments yet. Be the first to share your thoughts.</p>
        ) : (
          <div className="space-y-5">{topLevel.map(c => renderComment(c))}</div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && !pendingDelete.parent_id && repliesOf(pendingDelete.id).length > 0
                ? `Its ${repliesOf(pendingDelete.id).length} repl${repliesOf(pendingDelete.id).length === 1 ? 'y' : 'ies'} will be deleted too. This cannot be undone.`
                : 'This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (pendingDelete) deleteComment(pendingDelete); setPendingDelete(null); }}>
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
