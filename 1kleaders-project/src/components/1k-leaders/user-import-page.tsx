'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Mail, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ImportUser = {
  email: string; first_name: string; last_name: string;
  temp_password: string; role: string;
};

export default function UserImportPage() {
  const [step,     setStep]     = useState<'idle'|'ready'|'importing'|'emailing'|'done'>('idle');
  const [mode,     setMode]     = useState<'import'|'email-only'>('import');
  const [users,    setUsers]    = useState<ImportUser[]>([]);
  const [results,  setResults]  = useState<{ imported: number; skipped: number; emailsSent: number; errors: string[] } | null>(null);
  const [log,      setLog]      = useState<string[]>([]);

  function addLog(msg: string) { setLog(prev => [...prev, msg]); }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n');
    // Skip first meta-header, use second row as headers
    const headers = lines[1].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const parsed: ImportUser[] = [];

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV properly handling quoted fields
      const values: string[] = [];
      let current = ''; let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

      const email = row['Email Address']?.toLowerCase().trim();
      if (!email || !email.includes('@')) continue;

      parsed.push({
        email,
        first_name:    row['First Name']?.trim() || '',
        last_name:     row['Last Name']?.trim() || '',
        temp_password: generatePassword(),
        role:          'shareholder',
      });
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = parsed.filter(u => { if (seen.has(u.email)) return false; seen.add(u.email); return true; });
    setUsers(unique);
    setStep('ready');
    e.target.value = '';
  }

  function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  async function importUsers() {
    setStep('importing');
    let imported = 0; let skipped = 0; const errors: string[] = [];

    for (const user of users) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('email', user.email).maybeSingle();
        
        if (existing) { skipped++; addLog(`⏭ Skipped (exists): ${user.email}`); continue; }

        // Create via invite API
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            temp_password: user.temp_password,
          }),
        });

        if (res.ok) { imported++; addLog(`✓ Imported: ${user.first_name} ${user.last_name} <${user.email}>`); }
        else {
          const err = await res.json();
          if (err.error?.includes('already') || err.error?.includes('exists')) {
            skipped++; addLog(`⏭ Skipped (exists): ${user.email}`);
          } else {
            errors.push(`${user.email}: ${err.error}`);
            addLog(`✗ Error: ${user.email} — ${err.error}`);
          }
        }
      } catch (e: any) {
        errors.push(`${user.email}: ${e.message}`);
        addLog(`✗ Error: ${user.email}`);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    setResults({ imported, skipped, emailsSent: 0, errors });
    setStep('emailing');

    // Send welcome emails
    addLog('\n📧 Sending welcome emails...');
    const toEmail = users.filter(u => !u.email.includes('already'));
    const emailRes = await fetch('/api/admin/send-welcome-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: toEmail }),
    });
    const emailData = await emailRes.json();
    addLog(`✓ Emails sent: ${emailData.sent}/${toEmail.length}`);
    if (emailData.errors?.length) emailData.errors.forEach((e: string) => addLog(`✗ Email error: ${e}`));

    setResults(prev => ({ ...prev!, emailsSent: emailData.sent }));
    setStep('done');
  }

  function downloadPasswords() {
    const rows = [['First Name','Last Name','Email','Temporary Password']];
    users.forEach(u => rows.push([u.first_name, u.last_name, u.email, u.temp_password]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'temp-passwords.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#e33b5f]" />User Import
        </h1>
        <p className="text-[#7e7e7e] mt-1">Import users from the Join Us form CSV export</p>
      </div>

      {/* Step 1: Upload */}
      <Card className="border-[#f0f0f0]">
        <CardHeader className="pb-3"><CardTitle className="text-base">Step 1 — Upload CSV</CardTitle></CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e8e8e8] rounded-xl p-8 cursor-pointer hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/2 transition">
            <Upload className="w-8 h-8 text-[#9e9e9e] mb-2" />
            <p className="text-sm font-medium text-[#555353]">Click to upload CSV</p>
            <p className="text-xs text-[#9e9e9e] mt-1">Join Us Form export format</p>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </label>
        </CardContent>
      </Card>

      {/* OR: Email only mode */}
      <Card className="border-[#f0f0f0]">
        <CardHeader className="pb-3"><CardTitle className="text-base">Or — Send Emails Only</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[#7e7e7e] mb-3">
            If you already imported users via SQL, upload the <code className="text-xs bg-[#f6f6f6] px-1 py-0.5 rounded">user-temp-passwords.csv</code> to send branded welcome emails only.
          </p>
          <label className="flex items-center gap-3 border border-[#e8e8e8] rounded-xl p-4 cursor-pointer hover:border-[#e33b5f]/40 transition">
            <Mail className="w-5 h-5 text-[#e33b5f] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#222]">Upload passwords CSV → Send welcome emails</p>
              <p className="text-xs text-[#9e9e9e] mt-0.5">Accepts the user-temp-passwords.csv format</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const text = await file.text();
              const lines = text.trim().split('\n').slice(1); // skip header
              const parsed: ImportUser[] = lines.map(line => {
                const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                return { first_name: cols[0], last_name: cols[1], email: cols[2], temp_password: cols[3], role: 'shareholder' };
              }).filter(u => u.email?.includes('@'));
              setUsers(parsed);
              setMode('email-only');
              setStep('ready');
              e.target.value = '';
            }} />
          </label>
          {mode === 'email-only' && users.length > 0 && step === 'ready' && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-[#555353]">{users.length} users loaded from CSV</p>
              <Button className="bg-[#e33b5f] text-white" size="sm" onClick={async () => {
                setStep('emailing');
                const res = await fetch('/api/admin/send-welcome-emails', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ users }),
                });
                const data = await res.json();
                setResults({ imported: 0, skipped: 0, emailsSent: data.sent, errors: data.errors ?? [] });
                setStep('done');
              }}>
                {step === 'emailing' ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-1" />Send {users.length} Emails</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Preview */}
      {step !== 'idle' && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Step 2 — Preview ({users.length} users)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadPasswords}>
                  <Download className="w-4 h-4 mr-1" />Save Passwords
                </Button>
                <Button size="sm" className="bg-[#e33b5f] text-white"
                  onClick={importUsers} disabled={step !== 'ready'}>
                  {step === 'importing' ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Importing...</>
                  : step === 'emailing' ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Sending emails...</>
                  : step === 'done' ? <><CheckCircle2 className="w-4 h-4 mr-1" />Done</>
                  : <><Upload className="w-4 h-4 mr-1" />Import & Send Emails</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {users.slice(0, 20).map((u, i) => (
                <div key={u.email} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i < users.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}>
                  <span className="text-[#9e9e9e] w-5 text-xs">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#222]">{u.first_name} {u.last_name}</span>
                    <span className="text-[#9e9e9e] ml-2 text-xs">{u.email}</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{u.role}</Badge>
                  <code className="text-xs text-[#9e9e9e] font-mono">{u.temp_password}</code>
                </div>
              ))}
              {users.length > 20 && (
                <div className="px-4 py-3 text-xs text-[#9e9e9e] text-center border-t border-[#f0f0f0]">
                  +{users.length - 20} more users not shown
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3"><CardTitle className="text-base">Results</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-600">{results.imported}</p>
                <p className="text-xs text-emerald-600 mt-1">Imported</p>
              </div>
              <div className="bg-[#f6f6f6] rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#9e9e9e]">{results.skipped}</p>
                <p className="text-xs text-[#9e9e9e] mt-1">Already Existed</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-blue-600">{results.emailsSent}</p>
                <p className="text-xs text-blue-600 mt-1">Emails Sent</p>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{results.errors.length} errors</p>
                {results.errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log */}
      {log.length > 0 && (
        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3"><CardTitle className="text-base">Import Log</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-[#111] rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-0.5">
              {log.map((l, i) => (
                <p key={i} className={l.startsWith('✓') ? 'text-emerald-400' : l.startsWith('✗') ? 'text-red-400' : l.startsWith('⏭') ? 'text-amber-400' : 'text-[#9e9e9e]'}>{l}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
