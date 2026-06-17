'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, FileText, Download, CheckCircle, Clock, Shield, FolderOpen, Loader2, RefreshCw, Trash2, X, Eye } from 'lucide-react';
import type { DashboardRole } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role?: DashboardRole; }

type DbDoc = {
  id: string;
  created_at: string;
  name: string;
  category: string;
  status: string;
  file_name: string;
  file_size_bytes: number | null;
  storage_path: string;
  notes: string | null;
  owner_id: string;
};

const CATEGORIES = ['All','KYC','Agreements','Company','Idea','Financial','Shareholder','General'];

const statusColors: Record<string, string> = {
  verified: 'bg-[#e33b5f]/10 text-[#c02d4f]',
  pending:  'bg-[#f07969]/10 text-[#E65F5C]',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-stone-100 text-stone-500',
};

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [docs,        setDocs]        = useState<DbDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeCat,   setActiveCat]   = useState('All');
  const [search,      setSearch]      = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUpload,  setShowUpload]  = useState(false);

  // Upload form state
  const [uploadName,     setUploadName]     = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchDocs() {
    if (!profile) return;
    setLoading(true);
    const query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Non-admins only see their own docs
    if (!isAdmin) query.eq('owner_id', profile.id);

    const { data, error } = await query;
    if (!error) setDocs((data ?? []) as DbDoc[]);
    setLoading(false);
  }

  useEffect(() => { fetchDocs(); }, [profile]);

  async function handleUpload() {
    if (!selectedFile || !profile) return;
    setUploading(true);
    setUploadError(null);

    const ext = selectedFile.name.split('.').pop();
    const path = `${profile.id}/${Date.now()}_${selectedFile.name}`;

    // Upload to Supabase Storage bucket 'documents'
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(path, selectedFile, { upsert: false });

    if (storageError) {
      setUploadError(storageError.message);
      setUploading(false);
      return;
    }

    // Insert document record
    const { error: dbError } = await supabase.from('documents').insert({
      owner_id:        profile.id,
      uploaded_by:     profile.id,
      name:            uploadName.trim() || selectedFile.name,
      category:        uploadCategory,
      storage_path:    path,
      file_name:       selectedFile.name,
      file_size_bytes: selectedFile.size,
      mime_type:       selectedFile.type,
      status:          'pending',
      visible_to:      isAdmin ? ['all'] : ['admin', 'super-admin'],
    });

    if (dbError) {
      setUploadError(dbError.message);
    } else {
      setShowUpload(false);
      setUploadName('');
      setUploadCategory('General');
      setSelectedFile(null);
      fetchDocs();
    }
    setUploading(false);
  }

  async function downloadDoc(doc: DbDoc) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(doc: DbDoc) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('documents').update({ status }).eq('id', id);
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }

  const filtered = docs.filter(d => {
    if (activeCat !== 'All' && d.category !== activeCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Documents</h1>
          <p className="text-[#7e7e7e]">Manage and organize platform documents</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchDocs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => setShowUpload(v => !v)}>
            {showUpload ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Upload className="w-4 h-4 mr-2" />Upload</>}
          </Button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3"><CardTitle className="text-base text-[#e33b5f]">Upload Document</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#222]">Document Name</label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="Optional — defaults to filename" value={uploadName} onChange={e => setUploadName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#222]">Category</label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.filter(c => c !== 'All').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div
              className="border-2 border-dashed border-[#f0f0f0] rounded-lg p-6 text-center hover:border-[#e33b5f]/30 transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-[#9e9e9e] mx-auto mb-2" />
              {selectedFile
                ? <p className="text-sm font-medium text-[#222]">{selectedFile.name} ({formatSize(selectedFile.size)})</p>
                : <><p className="text-sm text-[#555353] font-medium">Click to select a file</p><p className="text-xs text-[#9e9e9e] mt-1">PDF, DOCX, XLSX, JPG, PNG (max 50MB)</p></>
              }
              <input ref={fileRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.ppt,.pptx" />
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload Document</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
        <Input placeholder="Search documents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setActiveCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${activeCat === c ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Docs',     value: docs.length,                                       icon: FolderOpen  },
          { label: 'Verified',       value: docs.filter(d => d.status === 'verified').length,   icon: CheckCircle },
          { label: 'Pending Review', value: docs.filter(d => d.status === 'pending').length,    icon: Clock       },
          { label: 'Secure',         value: docs.filter(d => d.status !== 'expired').length,    icon: Shield      },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="w-5 h-5 text-[#e33b5f]" />
              <div>
                <div className="text-lg font-bold text-[#222]">{loading ? '—' : s.value}</div>
                <div className="text-xs text-[#7e7e7e]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading documents...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9e9e9e] text-sm">No documents found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id} className="border-[#f0f0f0] hover:shadow-sm transition">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#f6f6f6] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#e33b5f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[#222] truncate text-sm">{doc.name}</p>
                    <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                    <Badge className={`text-xs ${statusColors[doc.status] ?? 'bg-stone-100 text-stone-600'}`}>{doc.status}</Badge>
                  </div>
                  <p className="text-xs text-[#7e7e7e] mt-0.5">
                    {doc.file_name} · {formatSize(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => downloadDoc(doc)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                  {isAdmin && (
                    <>
                      {doc.status === 'pending' && (
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(doc.id, 'verified')}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-red-500 hover:bg-red-50" onClick={() => deleteDoc(doc)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
