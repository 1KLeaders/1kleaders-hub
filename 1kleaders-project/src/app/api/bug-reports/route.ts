// /api/bug-reports
// POST  (any signed-in user)  { title, description, severity, page?, screenshot_path? } → file a report
// GET   (admins/developers)   → all reports, with short-lived screenshot links
// PATCH (admins/developers)   { id, status } → update status
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES   = ['open', 'in-progress', 'fixed', 'wont-fix'];

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req);
  if ('response' in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const title       = String(body.title ?? '').trim().slice(0, 200);
  const description = String(body.description ?? '').trim().slice(0, 10000);
  const severity    = SEVERITIES.includes(body.severity) ? body.severity : 'medium';
  const page        = String(body.page ?? '').trim().slice(0, 200) || null;
  // Screenshots are uploaded by the user into their own folder of 'form-uploads'
  const screenshot  = typeof body.screenshot_path === 'string' && body.screenshot_path.startsWith(`${auth.caller.id}/`)
    ? body.screenshot_path : null;

  if (!title || !description) return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });

  const { data: me } = await supabaseAdmin.from('profiles').select('first_name, last_name').eq('id', auth.caller.id).maybeSingle();
  const reporterName = `${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim() || auth.caller.email;

  const { data, error } = await supabaseAdmin.from('bug_reports').insert({
    title, description, severity, page, status: 'open',
    reporter_id: auth.caller.id, reporter_email: auth.caller.email, reporter_name: reporterName,
    screenshot_path: screenshot, user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Let developers know
  const { data: devs } = await supabaseAdmin.from('profiles').select('id').eq('role', 'developer');
  if (devs?.length) {
    await supabaseAdmin.from('notifications').insert(devs.map(d => ({
      user_id: d.id, title: `🐛 ${severity.toUpperCase()} bug: ${title}`, message: `Reported by ${reporterName}${page ? ` on ${page}` : ''}.`,
      notification_type: severity === 'critical' || severity === 'high' ? 'warning' : 'info',
      action_url: 'page:bug-report', is_read: false,
    })));
  }

  return NextResponse.json({ success: true, id: data.id });
}

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabaseAdmin.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reports = await Promise.all((data ?? []).map(async r => {
    if (!r.screenshot_path) return r;
    const { data: signed } = await supabaseAdmin.storage.from('form-uploads').createSignedUrl(r.screenshot_path, 60 * 60);
    return { ...r, screenshot_url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { id, status } = await req.json();
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: 'id and a valid status required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('bug_reports')
    .update({ status, resolved_at: status === 'fixed' || status === 'wont-fix' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
