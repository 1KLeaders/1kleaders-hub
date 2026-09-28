'use client';
// Rich text editor for announcement Text blocks (contentEditable + execCommand).
// Images/videos are wrapped in <figure data-media> so they can be clicked and resized/aligned.
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Image, Video, Link, Unlink, Minus, Undo, Redo, X, Table,
  Indent, Outdent, Eraser, Highlighter, Baseline, Upload, Loader2, Trash2, Code,
} from 'lucide-react';
import { parseMediaUrl } from '@/lib/announcements';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  uploadImage?: (file: File) => Promise<string>;   // returns a public URL
  compact?: boolean;                                // smaller min-height (used inside columns)
}

type Dialog = null | 'link' | 'image' | 'video' | 'table';
const WIDTHS = [{ v: '25%', l: '25%' }, { v: '50%', l: '50%' }, { v: '75%', l: '75%' }, { v: '100%', l: 'Full' }];
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function figure(inner: string, width: string, align: 'left' | 'center' | 'right' = 'center') {
  const margin = align === 'left' ? '16px auto 16px 0' : align === 'right' ? '16px 0 16px auto' : '16px auto';
  return `<figure data-media="1" style="width:${width};max-width:100%;margin:${margin}">${inner}</figure><p><br></p>`;
}

export default function AnnouncementEditor({ value, onChange, placeholder, uploadImage, compact }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState('75%');
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || '';
  }, []);

  const emit = () => onChange(editorRef.current?.innerHTML ?? '');

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreRange = () => {
    editorRef.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
  };

  const exec = (cmd: string, arg?: string) => {
    restoreRange();
    if (['foreColor', 'hiliteColor', 'fontSize'].includes(cmd)) document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, arg);
    saveRange();
    emit();
  };

  const insertHTML = (html: string) => {
    restoreRange();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  const closeDialog = () => { setDialog(null); setUrl(''); };

  function insertImageUrl(src: string) {
    insertHTML(figure(`<img src="${attr(src)}" alt="" style="width:100%;border-radius:8px;display:block" />`, width));
  }

  function insertEmbed() {
    const media = parseMediaUrl(url);
    if (!media) return;
    let inner = '';
    if (media.kind === 'iframe') {
      inner = media.aspect === 'audio'
        ? `<iframe src="${attr(media.src)}" style="width:100%;height:160px;border:0;border-radius:8px" allow="encrypted-media"></iframe>`
        : `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px"><iframe src="${attr(media.src)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    } else if (media.kind === 'video') inner = `<video src="${attr(media.src)}" controls style="width:100%;border-radius:8px"></video>`;
    else if (media.kind === 'audio') inner = `<audio src="${attr(media.src)}" controls style="width:100%"></audio>`;
    else if (media.kind === 'image') inner = `<img src="${attr(media.src)}" alt="" style="width:100%;border-radius:8px;display:block" />`;
    else { insertHTML(`<a href="${attr(media.href)}" target="_blank" rel="noopener noreferrer">${attr(media.href)}</a>`); closeDialog(); return; }
    insertHTML(figure(inner, width));
    closeDialog();
  }

  function insertTable() {
    const cell = '<td style="border:1px solid #e8e8e8;padding:6px 10px;min-width:60px"><br></td>';
    const head = `<tr>${Array.from({ length: cols }, () => '<th style="border:1px solid #e8e8e8;padding:6px 10px;background:#fafafa;text-align:left"><br></th>').join('')}</tr>`;
    const body = Array.from({ length: Math.max(1, rows - 1) }, () => `<tr>${cell.repeat(cols)}</tr>`).join('');
    insertHTML(`<table style="border-collapse:collapse;width:100%;margin:12px 0"><tbody>${head}${body}</tbody></table><p><br></p>`);
    closeDialog();
  }

  async function uploadAndInsert(file: File) {
    if (!uploadImage) return;
    setUploading(true);
    try { insertImageUrl(await uploadImage(file)); closeDialog(); }
    catch (e: any) { alert(`Image upload failed: ${e.message}`); }
    setUploading(false);
  }

  // Click an image/video to resize or realign it
  function onEditorClick(e: React.MouseEvent) {
    const fig = (e.target as HTMLElement).closest('figure') as HTMLElement | null;
    setSelectedMedia(fig && editorRef.current?.contains(fig) ? fig : null);
  }
  function styleMedia(patch: { width?: string; align?: 'left' | 'center' | 'right' }) {
    if (!selectedMedia) return;
    if (patch.width) { selectedMedia.style.width = patch.width; selectedMedia.style.maxWidth = '100%'; }
    if (patch.align) selectedMedia.style.margin = patch.align === 'left' ? '16px auto 16px 0' : patch.align === 'right' ? '16px 0 16px auto' : '16px auto';
    emit();
  }
  function removeMedia() { selectedMedia?.remove(); setSelectedMedia(null); emit(); }

  const Btn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); saveRange(); onClick(); }}
      className={`p-1.5 rounded hover:bg-[#f0f0f0] transition ${active ? 'bg-[#e33b5f]/10 text-[#e33b5f]' : 'text-[#555353]'}`}>
      {children}
    </button>
  );
  const Sep = () => <div className="w-px h-5 bg-[#e8e8e8] mx-1 self-center" />;
  const selectCls = 'h-7 text-xs border border-[#e8e8e8] rounded px-1.5 bg-white text-[#555353] focus:outline-none';

  return (
    <div className="border border-[#e8e8e8] rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[#e8e8e8] bg-[#fafafa]">
        <Btn onClick={() => exec('undo')} title="Undo"><Undo className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('redo')} title="Redo"><Redo className="w-4 h-4" /></Btn>
        <Sep />
        <select className={selectCls} title="Text style" defaultValue=""
          onMouseDown={saveRange} onChange={e => { const v = e.target.value; e.target.value = ''; if (v) exec('formatBlock', v); }}>
          <option value="" disabled>Style</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code</option>
        </select>
        <select className={`${selectCls} ml-1`} title="Font size" defaultValue=""
          onMouseDown={saveRange} onChange={e => { const v = e.target.value; e.target.value = ''; if (v) exec('fontSize', v); }}>
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="6">Extra large</option>
        </select>
        <Sep />
        <Btn onClick={() => exec('bold')} title="Bold"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('italic')} title="Italic"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('underline')} title="Underline"><Underline className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough className="w-4 h-4" /></Btn>
        <label title="Text colour" className="p-1.5 rounded hover:bg-[#f0f0f0] cursor-pointer text-[#555353] relative" onMouseDown={saveRange}>
          <Baseline className="w-4 h-4" />
          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" defaultValue="#e33b5f" onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <label title="Highlight" className="p-1.5 rounded hover:bg-[#f0f0f0] cursor-pointer text-[#555353] relative" onMouseDown={saveRange}>
          <Highlighter className="w-4 h-4" />
          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" defaultValue="#fff3a3" onChange={e => exec('hiliteColor', e.target.value)} />
        </label>
        <Btn onClick={() => exec('removeFormat')} title="Clear formatting"><Eraser className="w-4 h-4" /></Btn>
        <Sep />
        <Btn onClick={() => exec('justifyLeft')} title="Align left"><AlignLeft className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('justifyCenter')} title="Align center"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('justifyRight')} title="Align right"><AlignRight className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('justifyFull')} title="Justify"><AlignJustify className="w-4 h-4" /></Btn>
        <Sep />
        <Btn onClick={() => exec('insertUnorderedList')} title="Bullet list"><List className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('outdent')} title="Decrease indent"><Outdent className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('indent')} title="Increase indent"><Indent className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('formatBlock', 'blockquote')} title="Quote"><Quote className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('formatBlock', 'pre')} title="Code block"><Code className="w-4 h-4" /></Btn>
        <Sep />
        <Btn onClick={() => setDialog('link')} title="Insert link"><Link className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('unlink')} title="Remove link"><Unlink className="w-4 h-4" /></Btn>
        <Btn onClick={() => setDialog('image')} title="Insert image"><Image className="w-4 h-4" /></Btn>
        <Btn onClick={() => setDialog('video')} title="Embed video / audio / link"><Video className="w-4 h-4" /></Btn>
        <Btn onClick={() => setDialog('table')} title="Insert table"><Table className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec('insertHorizontalRule')} title="Divider"><Minus className="w-4 h-4" /></Btn>
      </div>

      {/* Insert dialogs */}
      {dialog && (
        <div className="p-3 border-b border-[#e8e8e8] bg-[#f6f6f6] flex items-center gap-2 flex-wrap">
          {dialog === 'table' ? (
            <>
              <Table className="w-4 h-4 text-[#9e9e9e]" />
              <span className="text-xs text-[#555353]">Rows</span>
              <Input type="number" min={2} max={20} className="w-16 h-8 text-sm" value={rows} onChange={e => setRows(Math.max(2, Math.min(20, Number(e.target.value) || 2)))} />
              <span className="text-xs text-[#555353]">Columns</span>
              <Input type="number" min={1} max={8} className="w-16 h-8 text-sm" value={cols} onChange={e => setCols(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
              <Button size="sm" className="bg-[#e33b5f] text-white h-8" onClick={insertTable}>Insert table</Button>
            </>
          ) : (
            <>
              {dialog === 'link' ? <Link className="w-4 h-4 text-[#9e9e9e]" /> : dialog === 'image' ? <Image className="w-4 h-4 text-[#9e9e9e]" /> : <Video className="w-4 h-4 text-[#9e9e9e]" />}
              <Input autoFocus className="flex-1 min-w-48 h-8 text-sm border-[#e8e8e8]" value={url} onChange={e => setUrl(e.target.value)}
                placeholder={dialog === 'link' ? 'https://...' : dialog === 'image' ? 'Image URL (https://...)' : 'YouTube, Vimeo, Loom, Spotify, Drive, or a direct video/audio URL'}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  if (dialog === 'link' && url.trim()) { exec('createLink', url.trim()); closeDialog(); }
                  if (dialog === 'image' && url.trim()) { insertImageUrl(url.trim()); closeDialog(); }
                  if (dialog === 'video') insertEmbed();
                }} />
              {dialog !== 'link' && (
                <select className={selectCls} value={width} onChange={e => setWidth(e.target.value)} title="Width">
                  {WIDTHS.map(w => <option key={w.v} value={w.v}>{w.l} width</option>)}
                </select>
              )}
              <Button size="sm" className="bg-[#e33b5f] text-white h-8" onClick={() => {
                if (dialog === 'link' && url.trim()) { exec('createLink', url.trim()); closeDialog(); }
                if (dialog === 'image' && url.trim()) { insertImageUrl(url.trim()); closeDialog(); }
                if (dialog === 'video') insertEmbed();
              }}>Insert</Button>
              {dialog === 'image' && uploadImage && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndInsert(f); e.target.value = ''; }} />
                  <Button size="sm" variant="outline" className="h-8" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Upload className="w-3.5 h-3.5 mr-1" />Upload</>}
                  </Button>
                </>
              )}
            </>
          )}
          <button onClick={closeDialog}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
        </div>
      )}

      {/* Selected image/video controls */}
      {selectedMedia && (
        <div className="px-3 py-2 border-b border-[#e8e8e8] bg-[#e33b5f]/5 flex items-center gap-1 flex-wrap text-xs">
          <span className="text-[#555353] font-medium mr-1">Media:</span>
          {WIDTHS.map(w => (
            <button key={w.v} onMouseDown={e => { e.preventDefault(); styleMedia({ width: w.v }); }}
              className={`px-2 py-1 rounded border ${selectedMedia.style.width === w.v ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white border-[#e8e8e8] text-[#555353]'}`}>{w.l}</button>
          ))}
          <span className="w-px h-4 bg-[#e8e8e8] mx-1" />
          <button onMouseDown={e => { e.preventDefault(); styleMedia({ align: 'left' }); }} className="p-1 rounded hover:bg-white" title="Align left"><AlignLeft className="w-3.5 h-3.5" /></button>
          <button onMouseDown={e => { e.preventDefault(); styleMedia({ align: 'center' }); }} className="p-1 rounded hover:bg-white" title="Center"><AlignCenter className="w-3.5 h-3.5" /></button>
          <button onMouseDown={e => { e.preventDefault(); styleMedia({ align: 'right' }); }} className="p-1 rounded hover:bg-white" title="Align right"><AlignRight className="w-3.5 h-3.5" /></button>
          <span className="w-px h-4 bg-[#e8e8e8] mx-1" />
          <button onMouseDown={e => { e.preventDefault(); removeMedia(); }} className="p-1 rounded hover:bg-white text-red-500" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
          <button onMouseDown={e => { e.preventDefault(); setSelectedMedia(null); }} className="ml-auto p-1 text-[#9e9e9e]"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder ?? 'Write your announcement here...'}
        onInput={emit}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
        onClick={onEditorClick}
        onBlur={() => { saveRange(); emit(); }}
        className={`${compact ? 'min-h-32' : 'min-h-64'} p-5 focus:outline-none text-sm text-[#333] leading-relaxed ann-editor`}
        style={{ fontFamily: 'Manrope, sans-serif' }}
      />

      <style>{`
        .ann-editor:empty:before { content: attr(data-placeholder); color: #9e9e9e; pointer-events: none; }
        .ann-editor h1 { font-size: 2rem; font-weight: 800; color: #222; margin: 1rem 0 0.5rem; line-height: 1.2; }
        .ann-editor h2 { font-size: 1.5rem; font-weight: 700; color: #222; margin: 0.75rem 0 0.4rem; }
        .ann-editor h3 { font-size: 1.25rem; font-weight: 600; color: #222; margin: 0.5rem 0 0.3rem; }
        .ann-editor p  { margin: 0.4rem 0; }
        .ann-editor blockquote { border-left: 3px solid #e33b5f; margin: 1rem 0; padding: 0.5rem 1rem; color: #555; font-style: italic; background: #fafafa; border-radius: 0 8px 8px 0; }
        .ann-editor pre { background: #141414; color: #f0f0f0; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.8rem; white-space: pre-wrap; }
        .ann-editor ul, .ann-editor ol { margin: 0.5rem 0 0.5rem 1.5rem; }
        .ann-editor ul { list-style: disc; }
        .ann-editor ol { list-style: decimal; }
        .ann-editor li { margin: 0.25rem 0; }
        .ann-editor a  { color: #e33b5f; text-decoration: underline; }
        .ann-editor hr { border: none; border-top: 1px solid #f0f0f0; margin: 1rem 0; }
        .ann-editor figure { cursor: pointer; outline: 2px dashed transparent; outline-offset: 4px; border-radius: 8px; }
        .ann-editor figure:hover { outline-color: #e33b5f55; }
        .ann-editor img, .ann-editor video, .ann-editor iframe { max-width: 100%; border-radius: 8px; }
        .ann-editor iframe { pointer-events: none; }
        .ann-editor table { border-collapse: collapse; width: 100%; }
        .ann-editor td, .ann-editor th { border: 1px solid #e8e8e8; padding: 6px 10px; }
      `}</style>
    </div>
  );
}
