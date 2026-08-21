'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, List, ListOrdered, Quote, Image, Video,
  Link, Minus, Undo, Redo, Type, X
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function AnnouncementEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const savedRange = useRef<Range | null>(null);

  // Set initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    editorRef.current?.focus();
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const insertHTML = (html: string) => {
    restoreRange();
    document.execCommand('insertHTML', false, html);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    insertHTML(`<figure style="margin:16px 0;text-align:center"><img src="${imageUrl}" style="max-width:100%;border-radius:8px;" alt="Image" /><figcaption style="font-size:0.75rem;color:#9e9e9e;margin-top:4px">Image</figcaption></figure>`);
    setImageUrl(''); setShowImageDialog(false);
  };

  const insertVideo = () => {
    if (!videoUrl.trim()) return;
    // Support YouTube, Vimeo, and direct video URLs
    let embed = '';
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (ytMatch) {
      embed = `<figure style="margin:16px 0"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div></figure>`;
    } else if (vimeoMatch) {
      embed = `<figure style="margin:16px 0"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div></figure>`;
    } else {
      embed = `<figure style="margin:16px 0"><video src="${videoUrl}" controls style="max-width:100%;border-radius:8px;"></video></figure>`;
    }
    insertHTML(embed);
    setVideoUrl(''); setShowVideoDialog(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    exec('createLink', linkUrl);
    setLinkUrl(''); setShowLinkDialog(false);
  };

  const ToolBtn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); saveRange(); onClick(); }}
      className={`p-1.5 rounded hover:bg-[#f0f0f0] transition ${active ? 'bg-[#e33b5f]/10 text-[#e33b5f]' : 'text-[#555353]'}`}>
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-[#e8e8e8] mx-1 self-center" />;

  return (
    <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[#e8e8e8] bg-[#fafafa]">
        <ToolBtn onClick={() => exec('undo')} title="Undo"><Undo className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('redo')} title="Redo"><Redo className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph"><Type className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline"><Underline className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'blockquote')} title="Quote"><Quote className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => exec('insertHorizontalRule')} title="Divider"><Minus className="w-4 h-4" /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => { saveRange(); setShowImageDialog(true); }} title="Insert Image"><Image className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => { saveRange(); setShowVideoDialog(true); }} title="Insert Video"><Video className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => { saveRange(); setShowLinkDialog(true); }} title="Insert Link"><Link className="w-4 h-4" /></ToolBtn>
      </div>

      {/* Dialogs */}
      {showImageDialog && (
        <div className="p-3 border-b border-[#e8e8e8] bg-[#f6f6f6] flex items-center gap-2">
          <Image className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
          <Input className="flex-1 h-8 text-sm border-[#e8e8e8]" placeholder="Image URL (https://...)" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insertImage()} autoFocus />
          <Button size="sm" className="bg-[#e33b5f] text-white h-8" onClick={insertImage}>Insert</Button>
          <button onClick={() => setShowImageDialog(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
        </div>
      )}
      {showVideoDialog && (
        <div className="p-3 border-b border-[#e8e8e8] bg-[#f6f6f6] flex items-center gap-2">
          <Video className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
          <Input className="flex-1 h-8 text-sm border-[#e8e8e8]" placeholder="YouTube, Vimeo, or direct video URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insertVideo()} autoFocus />
          <Button size="sm" className="bg-[#e33b5f] text-white h-8" onClick={insertVideo}>Embed</Button>
          <button onClick={() => setShowVideoDialog(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
        </div>
      )}
      {showLinkDialog && (
        <div className="p-3 border-b border-[#e8e8e8] bg-[#f6f6f6] flex items-center gap-2">
          <Link className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
          <Input className="flex-1 h-8 text-sm border-[#e8e8e8]" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insertLink()} autoFocus />
          <Button size="sm" className="bg-[#e33b5f] text-white h-8" onClick={insertLink}>Add</Button>
          <button onClick={() => setShowLinkDialog(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder ?? 'Write your announcement here...'}
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        className="min-h-64 p-5 focus:outline-none text-sm text-[#333] leading-relaxed"
        style={{
          fontFamily: 'Manrope, sans-serif',
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9e9e9e;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 2rem; font-weight: 800; color: #222; margin: 1rem 0 0.5rem; line-height: 1.2; }
        [contenteditable] h2 { font-size: 1.5rem; font-weight: 700; color: #222; margin: 0.75rem 0 0.4rem; }
        [contenteditable] h3 { font-size: 1.25rem; font-weight: 600; color: #222; margin: 0.5rem 0 0.3rem; }
        [contenteditable] p  { margin: 0.4rem 0; }
        [contenteditable] blockquote { border-left: 3px solid #e33b5f; margin: 1rem 0; padding: 0.5rem 1rem; color: #555; font-style: italic; background: #fafafa; border-radius: 0 8px 8px 0; }
        [contenteditable] ul, [contenteditable] ol { margin: 0.5rem 0 0.5rem 1.5rem; }
        [contenteditable] li { margin: 0.25rem 0; }
        [contenteditable] a  { color: #e33b5f; text-decoration: underline; }
        [contenteditable] hr { border: none; border-top: 1px solid #f0f0f0; margin: 1rem 0; }
        [contenteditable] img { max-width: 100%; border-radius: 8px; }
        [contenteditable] figure { margin: 1rem 0; }
        [contenteditable] figcaption { font-size: 0.75rem; color: #9e9e9e; text-align: center; margin-top: 4px; }
      `}</style>
    </div>
  );
}
