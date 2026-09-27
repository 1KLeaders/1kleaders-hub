// TypeForm API helpers for importing KYC submissions into kyc_documents. Server-only.
// Needs TYPEFORM_TOKEN (a TypeForm personal access token with forms:read + responses:read scopes).

const API = 'https://api.typeform.com';

function token() {
  const t = process.env.TYPEFORM_TOKEN;
  if (!t) throw new Error('TYPEFORM_TOKEN is not set — add it in Vercel → Settings → Environment Variables');
  return t;
}

async function tf<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`TypeForm ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export type TfField = { id: string; ref: string; title: string; type: string };
export type TfAnswer = { field: { id: string; ref: string; type: string }; type: string; [k: string]: any };
export type TfResponse = { token: string; response_id?: string; submitted_at: string; answers?: TfAnswer[]; hidden?: Record<string, string> };

export async function listForms() {
  const data = await tf<{ items: { id: string; title: string; last_updated_at: string }[] }>('/forms?page_size=200');
  return data.items.map(f => ({ id: f.id, title: f.title, last_updated_at: f.last_updated_at }));
}

// Flattens question groups so every answerable field is listed
export async function getFormFields(formId: string): Promise<{ title: string; fields: TfField[]; hiddenFields: string[] }> {
  const form = await tf<any>(`/forms/${encodeURIComponent(formId)}`);
  const out: TfField[] = [];
  const walk = (fields: any[] = []) => fields.forEach(f => {
    if (f.type === 'group' || f.type === 'inline_group') walk(f.properties?.fields);
    else if (!['statement'].includes(f.type)) out.push({ id: f.id, ref: f.ref, title: String(f.title ?? '').replace(/\*|\{\{.*?\}\}/g, '').trim(), type: f.type });
  });
  walk(form.fields);
  return { title: form.title, fields: out, hiddenFields: form.hidden ?? [] };
}

export async function getAllResponses(formId: string): Promise<TfResponse[]> {
  const all: TfResponse[] = [];
  let before: string | undefined;
  // Pages of 1000, newest first; 'before' walks back through older ones
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ page_size: '1000', completed: 'true' });
    if (before) q.set('before', before);
    const page = await tf<{ items: TfResponse[] }>(`/forms/${encodeURIComponent(formId)}/responses?${q}`);
    all.push(...page.items);
    if (page.items.length < 1000) break;
    before = page.items[page.items.length - 1].token;
  }
  return all.reverse(); // oldest first → stable offsets between import batches
}

export async function downloadFile(url: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`File download ${res.status}`);
  return { bytes: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
}

export function answerText(a: TfAnswer): string | string[] | number | boolean | null {
  switch (a.type) {
    case 'text': case 'email': case 'url': case 'phone_number': case 'date': return a[a.type];
    case 'number': return a.number;
    case 'boolean': return a.boolean;
    case 'choice': return a.choice?.label ?? a.choice?.other ?? null;
    case 'choices': return [...(a.choices?.labels ?? []), ...(a.choices?.other ? [a.choices.other] : [])];
    case 'file_url': return a.file_url;
    case 'payment': return a.payment?.amount ?? null;
    default: return a[a.type] ?? null;
  }
}

// Guess which KYC document a TypeForm upload question is, from its title
export function guessDocType(title: string): string {
  const t = title.toLowerCase();
  if (/passport/.test(t)) return 'passport';
  if (/(national|emirates|civil).*id|\bid card\b|identity card|\bid\b/.test(t)) return 'national-id';
  if (/address|utility|bank statement/.test(t)) return 'proof-of-address';
  if (/\bcv\b|resume|résumé|curriculum/.test(t)) return 'cv';
  if (/clara/.test(t)) return 'clara-kyc-form';
  if (/source of (funds|wealth)/.test(t)) return 'source-of-funds';
  if (/payment|receipt|transfer/.test(t)) return 'payment-receipt';
  return 'other';
}
