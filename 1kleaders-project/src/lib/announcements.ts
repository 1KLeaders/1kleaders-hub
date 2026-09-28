// Shared announcement types + helpers (used by the editor, the in-app page, the public page and API routes)

export type Visibility = 'shareholders_only' | 'external_use';
export type Category   = 'Updates' | 'Reports' | 'Podcast' | 'Newsletter' | 'Announcement';

export const CATEGORIES: Category[] = ['Updates', 'Reports', 'Podcast', 'Newsletter', 'Announcement'];

export type MediaSize  = 'sm' | 'md' | 'lg' | 'full';
export type MediaAlign = 'left' | 'center' | 'right';

export type ContentBlock = { id: string; type: 'content'; html: string };
export type MediaBlock   = { id: string; type: 'media'; url: string; caption?: string; size?: MediaSize; align?: MediaAlign };
// Side-by-side layout: 2 or 3 cells, each holding text or media
export type ColumnCell   = { kind: 'content'; html: string } | { kind: 'media'; url: string; caption?: string };
export type ColumnsBlock = { id: string; type: 'columns'; cells: ColumnCell[] };
export type Block = ContentBlock | MediaBlock | ColumnsBlock;

// Max width for media blocks (videos default to medium so they don't fill the whole page)
export const MEDIA_SIZES: { value: MediaSize; label: string; maxWidth: string }[] = [
  { value: 'sm',   label: 'Small',  maxWidth: '360px' },
  { value: 'md',   label: 'Medium', maxWidth: '560px' },
  { value: 'lg',   label: 'Large',  maxWidth: '760px' },
  { value: 'full', label: 'Full',   maxWidth: '100%' },
];

export type EmailMode = 'none' | 'opted_in' | 'all';

export type Attachment = { name: string; url: string; size?: number };

export type Audience = {
  roles: string[];             // e.g. ['shareholder', 'user']
  subroles: string[];          // e.g. ['vep-builder', 'mab-builder']
  include_user_ids: string[];  // always see it
  exclude_user_ids: string[];  // never see it (wins over everything)
};

export type Announcement = {
  id:             string;
  created_at:     string;
  updated_at?:    string;
  title:          string;
  description:    string | null;
  category:       Category;
  visibility:     Visibility;
  content:        string | null;   // legacy single-content field; kept in sync for excerpts
  meta:           string | null;
  cta:            string | null;
  media_url:      string | null;   // legacy single-media field
  attachments:    Attachment[] | null;
  blocks:         Block[] | null;
  audience:       Audience | null;
  allow_comments: boolean | null;
  is_published:   boolean;
  published_at:   string | null;
  notified_at:    string | null;
  publish_at?:    string | null;     // scheduled publish time (migration-039)
  notify_in_app?: boolean | null;
  email_mode?:    EmailMode | null;
  notify_admins?: boolean | null;
};

export const ADMIN_ROLES = ['admin', 'super-admin', 'developer'];

export const DEFAULT_AUDIENCE: Audience = { roles: ['shareholder'], subroles: [], include_user_ids: [], exclude_user_ids: [] };

export const AUDIENCE_ROLE_OPTIONS = [
  { value: 'shareholder', label: 'Shareholders' },
  { value: 'user',        label: 'Members (non-shareholders)' },
];

export const AUDIENCE_SUBROLE_OPTIONS = [
  { value: 'vep-builder', label: 'VEP' },
  { value: 'mab-builder', label: 'MAB' },
  { value: 'idea-owner',  label: 'Idea Owners' },
  { value: 'founder',     label: 'Founders' },
];

export function genId() { return Math.random().toString(36).slice(2, 10); }

export function normalizeAudience(a: Partial<Audience> | null | undefined): Audience {
  return {
    roles:            a?.roles            ?? DEFAULT_AUDIENCE.roles,
    subroles:         a?.subroles         ?? [],
    include_user_ids: a?.include_user_ids ?? [],
    exclude_user_ids: a?.exclude_user_ids ?? [],
  };
}

// Mirrors kl_can_view_announcement() in migration-036 (the database is the real gate)
export function audienceIncludes(
  audience: Audience | null | undefined,
  person: { id: string; role: string | null; subroles: string[] | null },
): boolean {
  if (ADMIN_ROLES.includes(person.role ?? '')) return true;
  const a = normalizeAudience(audience);
  if (a.exclude_user_ids.includes(person.id)) return false;
  if (a.include_user_ids.includes(person.id)) return true;
  if (person.role && a.roles.includes(person.role)) return true;
  return (person.subroles ?? []).some(s => a.subroles.includes(s));
}

export function describeAudience(a: Audience): string {
  const parts = [
    ...a.roles.map(r => AUDIENCE_ROLE_OPTIONS.find(o => o.value === r)?.label ?? r),
    ...a.subroles.map(s => AUDIENCE_SUBROLE_OPTIONS.find(o => o.value === s)?.label ?? s),
  ];
  let text = parts.length ? parts.join(', ') : 'Nobody by role';
  if (a.include_user_ids.length) text += ` + ${a.include_user_ids.length} specific ${a.include_user_ids.length === 1 ? 'person' : 'people'}`;
  if (a.exclude_user_ids.length) text += `, excluding ${a.exclude_user_ids.length}`;
  return text;
}

// Older announcements only have `content` + `media_url`; turn them into blocks
export function getBlocks(ann: Pick<Announcement, 'blocks' | 'content' | 'media_url'>): Block[] {
  if (ann.blocks && ann.blocks.length) return ann.blocks;
  const blocks: Block[] = [];
  if (ann.media_url) blocks.push({ id: 'legacy-media', type: 'media', url: ann.media_url });
  if (ann.content)   blocks.push({ id: 'legacy-content', type: 'content', html: ann.content });
  return blocks;
}

export function stripHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(ann: Pick<Announcement, 'description' | 'blocks' | 'content' | 'media_url'>, max = 200): string {
  if (ann.description?.trim()) return ann.description.trim();
  const text = getBlocks(ann).flatMap(b =>
    b.type === 'content' ? [stripHtml(b.html)]
    : b.type === 'columns' ? b.cells.filter(c => c.kind === 'content').map(c => stripHtml((c as { html: string }).html))
    : []).join(' ');
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// ── Media embeds ───────────────────────────────────────────────────────
export type MediaEmbed =
  | { kind: 'iframe'; src: string; aspect: 'video' | 'audio' | 'tall'; provider: string }
  | { kind: 'video'; src: string }
  | { kind: 'audio'; src: string }
  | { kind: 'image'; src: string }
  | { kind: 'link'; href: string; host: string };

export function parseMediaUrl(raw: string): MediaEmbed | null {
  const input = raw.trim();
  if (!input) return null;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;

  const host = url.hostname.replace(/^www\.|^m\./, '');
  const path = url.pathname;
  const ext  = path.split('.').pop()?.toLowerCase() ?? '';

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    const id = host === 'youtu.be'
      ? path.slice(1).split('/')[0]
      : url.searchParams.get('v') ?? path.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1];
    if (id) {
      const start = url.searchParams.get('t') ?? url.searchParams.get('start');
      const secs = start ? parseInt(start.replace(/s$/, ''), 10) : 0;
      return { kind: 'iframe', provider: 'YouTube', aspect: 'video', src: `https://www.youtube-nocookie.com/embed/${id}${secs ? `?start=${secs}` : ''}` };
    }
  }

  // Vimeo
  if (host.endsWith('vimeo.com')) {
    const id = path.match(/(\d{6,})/)?.[1];
    if (id) return { kind: 'iframe', provider: 'Vimeo', aspect: 'video', src: `https://player.vimeo.com/video/${id}` };
  }

  // Loom
  if (host.endsWith('loom.com')) {
    const id = path.match(/\/(?:share|embed)\/([a-z0-9]+)/i)?.[1];
    if (id) return { kind: 'iframe', provider: 'Loom', aspect: 'video', src: `https://www.loom.com/embed/${id}` };
  }

  // Spotify (episode / show / track / album / playlist)
  if (host === 'open.spotify.com') {
    const m = path.match(/\/(?:intl-[a-z]+\/)?(episode|show|track|album|playlist)\/([A-Za-z0-9]+)/);
    if (m) return { kind: 'iframe', provider: 'Spotify', aspect: m[1] === 'track' || m[1] === 'episode' ? 'audio' : 'tall', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
  }

  // Apple Podcasts
  if (host === 'podcasts.apple.com') {
    return { kind: 'iframe', provider: 'Apple Podcasts', aspect: url.searchParams.get('i') ? 'audio' : 'tall', src: `https://embed.podcasts.apple.com${path}${url.search}` };
  }

  // SoundCloud
  if (host === 'soundcloud.com') {
    return { kind: 'iframe', provider: 'SoundCloud', aspect: 'audio', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%23e33b5f` };
  }

  // Google Drive file → preview
  if (host === 'drive.google.com') {
    const id = path.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (id) return { kind: 'iframe', provider: 'Google Drive', aspect: 'video', src: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Direct files
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext)) return { kind: 'video', src: url.toString() };
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return { kind: 'audio', src: url.toString() };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext)) return { kind: 'image', src: url.toString() };
  if (ext === 'pdf') return { kind: 'iframe', provider: 'PDF', aspect: 'tall', src: url.toString() };

  return { kind: 'link', href: url.toString(), host };
}
