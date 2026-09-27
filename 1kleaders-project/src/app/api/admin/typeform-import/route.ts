// /api/admin/typeform-import — admin-only migration of KYC submissions from TypeForm into Documents → KYC
// GET  ?action=forms                          → list TypeForm forms
// GET  ?action=preview&form_id=…&email_ref=…  → fields, suggested doc types, matched/unmatched members
// POST { form_id, email_ref, mapping, offset } → import the next batch of responses (call until next_offset is null)
//   email_ref: field ref of the email question, or "hidden:<name>" for a hidden field
//   mapping:   { [fileFieldRef]: docType | 'skip' }
// Re-running is safe: responses already imported (same TypeForm token) are skipped.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import {
  listForms, getFormFields, getAllResponses, downloadFile, answerText, guessDocType,
  type TfResponse,
} from '@/lib/typeform';

export const maxDuration = 60;
const BATCH = 4;

function emailOf(r: TfResponse, emailRef: string): string | null {
  if (emailRef.startsWith('hidden:')) return r.hidden?.[emailRef.slice(7)]?.trim().toLowerCase() || null;
  const a = r.answers?.find(x => x.field.ref === emailRef || x.field.id === emailRef);
  const v = a ? answerText(a) : null;
  return typeof v === 'string' ? v.trim().toLowerCase() : null;
}

async function profilesByEmail() {
  // Page through — Supabase returns at most 1000 rows per request
  const all: { id: string; email: string | null; first_name: string | null; last_name: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin.from('profiles').select('id, email, first_name, last_name').range(from, from + 999);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return new Map(all.filter(p => p.email).map(p => [String(p.email).toLowerCase(), p]));
}

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const action = req.nextUrl.searchParams.get('action');
  try {
    if (action === 'forms') return NextResponse.json({ forms: await listForms() });

    if (action === 'preview') {
      const formId = req.nextUrl.searchParams.get('form_id') ?? '';
      const { title, fields, hiddenFields } = await getFormFields(formId);
      const responses = await getAllResponses(formId);

      const emailFields = [
        ...fields.filter(f => f.type === 'email').map(f => ({ ref: f.ref, title: f.title })),
        ...hiddenFields.map(h => ({ ref: `hidden:${h}`, title: `Hidden field: ${h}` })),
      ];
      const emailRef = req.nextUrl.searchParams.get('email_ref') || emailFields[0]?.ref || '';
      const people = await profilesByEmail();

      const matched: string[] = [], unmatched: string[] = [];
      for (const r of responses) {
        const e = emailRef ? emailOf(r, emailRef) : null;
        if (e && people.has(e)) matched.push(e); else unmatched.push(e ?? `(no email) response ${r.token.slice(0, 8)}`);
      }

      return NextResponse.json({
        title,
        total: responses.length,
        email_fields: emailFields,
        email_ref: emailRef,
        file_fields: fields.filter(f => f.type === 'file_upload').map(f => ({ ref: f.ref, title: f.title, suggested: guessDocType(f.title) })),
        other_fields: fields.filter(f => f.type !== 'file_upload').length,
        matched: [...new Set(matched)],
        unmatched: [...new Set(unmatched)],
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { form_id, email_ref, mapping = {}, offset = 0 } = await req.json();
  if (!form_id || !email_ref) return NextResponse.json({ error: 'form_id and email_ref required' }, { status: 400 });

  try {
    const { fields } = await getFormFields(form_id);
    const titleByRef = new Map(fields.map(f => [f.ref, f.title]));
    const responses = await getAllResponses(form_id);
    const people = await profilesByEmail();
    const batch = responses.slice(offset, offset + BATCH);

    let files = 0, rows = 0, skipped = 0;
    const unmatched: string[] = [];
    const errors: string[] = [];

    for (const r of batch) {
      const email = emailOf(r, email_ref);
      const person = email ? people.get(email) : undefined;
      if (!person) { unmatched.push(email ?? `(no email) ${r.token.slice(0, 8)}`); continue; }

      // Already imported this exact response?
      const { count } = await supabaseAdmin.from('kyc_documents')
        .select('id', { count: 'exact', head: true }).eq('user_id', person.id).eq('external_id', r.token);
      if (count) { skipped++; continue; }

      const written: Record<string, any> = {};
      const used = new Set<string>();
      const submittedAt = r.submitted_at ?? new Date().toISOString();

      for (const a of r.answers ?? []) {
        const ref = a.field.ref;
        const title = titleByRef.get(ref) ?? ref;
        if (a.type !== 'file_url') { written[title] = answerText(a); continue; }

        let docType: string = mapping[ref] ?? guessDocType(title);
        if (docType === 'skip') continue;
        if (used.has(docType)) docType = `${docType}-${ref.slice(0, 8)}`;
        used.add(docType);

        try {
          const { bytes, contentType } = await downloadFile(a.file_url);
          const name = decodeURIComponent(String(a.file_url).split('/').pop() ?? 'file').replace(/[^\w.\-]+/g, '_');
          const path = `${person.id}/${docType}/typeform_${Date.now()}_${name}`;
          const { error: upErr } = await supabaseAdmin.storage.from('kyc-documents')
            .upload(path, bytes, { contentType, upsert: true });
          if (upErr) throw new Error(upErr.message);

          const { error: dbErr } = await supabaseAdmin.from('kyc_documents').upsert({
            user_id: person.id, doc_type: docType, storage_path: path, file_name: name,
            file_size_bytes: bytes.byteLength, status: 'submitted', uploaded_at: submittedAt,
            source: 'typeform', external_id: r.token,
          }, { onConflict: 'user_id,doc_type' });
          if (dbErr) throw new Error(dbErr.message);
          files++; rows++;
        } catch (e: any) {
          errors.push(`${email} · ${title}: ${e.message}`);
        }
      }

      // One entry holding the written answers (shown under Documents → KYC and in the tracker)
      const { error: ansErr } = await supabaseAdmin.from('kyc_documents').upsert({
        user_id: person.id, doc_type: 'typeform-kyc', storage_path: null, file_name: 'TypeForm KYC answers',
        status: 'submitted', uploaded_at: submittedAt, source: 'typeform', external_id: r.token, answers: written,
      }, { onConflict: 'user_id,doc_type' });
      if (ansErr) errors.push(`${email} · answers: ${ansErr.message}`); else rows++;
    }

    const nextOffset = offset + BATCH < responses.length ? offset + BATCH : null;
    return NextResponse.json({ processed: batch.length, total: responses.length, files, rows, skipped, unmatched, errors, next_offset: nextOffset });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
