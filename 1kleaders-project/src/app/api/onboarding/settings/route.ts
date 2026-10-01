// /api/onboarding/settings
// GET  (any signed-in user) → { payment_instructions, clara_kyc_template_url, clara_kyc_template_name }
// POST (admin, multipart form-data with `file`) → uploads the Clara KYC Form template (PDF/DOC/DOCX)
// Done server-side so storage/RLS policies can't silently block the upload or the read.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { getPlatformSettings, setPlatformSetting } from '@/lib/platform-settings';

const BUCKET = 'public-assets';
const KEYS = ['payment_instructions', 'clara_kyc_template_url', 'clara_kyc_template_name'];
const ALLOWED = ['pdf', 'doc', 'docx'];

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req);
  if ('response' in auth) return auth.response;
  const s = await getPlatformSettings(KEYS);
  return NextResponse.json({
    payment_instructions:    s.payment_instructions ?? '',
    clara_kyc_template_url:  s.clara_kyc_template_url ?? '',
    clara_kyc_template_name: s.clara_kyc_template_name ?? '',
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file received' }, { status: 400 });

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED.includes(ext)) return NextResponse.json({ error: 'Upload a PDF, DOC or DOCX file' }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File is larger than 20 MB' }, { status: 400 });

  // Make sure the public bucket exists (migration-039 creates it, but don't depend on that)
  const { error: bucketErr } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (bucketErr) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    if (createErr && !/exists/i.test(createErr.message)) {
      return NextResponse.json({ error: `Storage bucket problem: ${createErr.message}` }, { status: 500 });
    }
  }

  const contentType = file.type || (
    ext === 'pdf' ? 'application/pdf'
    : ext === 'doc' ? 'application/msword'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const path = `templates/Clara-KYC-Form.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType, upsert: true, cacheControl: '60' });
  if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });

  // Version query so a replaced template isn't served from cache
  const url = `${supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const err1 = await setPlatformSetting('clara_kyc_template_url', url);
  const err2 = await setPlatformSetting('clara_kyc_template_name', file.name);
  if (err1 || err2) return NextResponse.json({ error: `Uploaded, but saving the link failed: ${err1 ?? err2}` }, { status: 500 });

  return NextResponse.json({ success: true, url, name: file.name });
}
