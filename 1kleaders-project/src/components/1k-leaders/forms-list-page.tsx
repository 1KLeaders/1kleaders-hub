'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Form = {
  id: string; title: string; description: string | null;
  fields: any[]; accent_color: string; created_at: string;
};

export default function FormsListPage({ navigate }: { navigate?: (p: string) => void }) {
  const [forms,   setForms]   = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('forms').select('id, title, description, fields, accent_color, created_at')
      .eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setForms((data ?? []) as Form[]); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="space-y-3 max-w-2xl">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-[#f0f0f0] rounded-xl p-5 animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f0f0f0]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f0f0f0] rounded w-40" />
            <div className="h-3 bg-[#f0f0f0] rounded w-64" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Forms</h1>
        <p className="text-[#7e7e7e] mt-1">Complete forms from 1K Leaders</p>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#e8e8e8] rounded-2xl">
          <FileText className="w-10 h-10 text-[#9e9e9e]" />
          <p className="text-sm text-[#9e9e9e]">No forms available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(form => (
            <Card key={form.id} className="border-[#f0f0f0] hover:border-[#e33b5f]/20 transition cursor-pointer"
              onClick={() => navigate?.(`form-${form.id}`)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (form.accent_color ?? '#e33b5f') + '15' }}>
                  <FileText className="w-5 h-5" style={{ color: form.accent_color ?? '#e33b5f' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#222]">{form.title}</p>
                  {form.description && <p className="text-sm text-[#9e9e9e] truncate">{form.description}</p>}
                  <p className="text-xs text-[#9e9e9e] mt-0.5">{form.fields?.length ?? 0} questions</p>
                </div>
                <Button size="sm" className="text-white flex-shrink-0" style={{ backgroundColor: form.accent_color ?? '#e33b5f' }}>
                  Open <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
