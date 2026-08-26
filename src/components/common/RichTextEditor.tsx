import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Undo, 
  Redo, 
  CheckSquare, 
  Highlighter, 
  Sparkles,
  AlignLeft,
  AlignCenter,
  Trash2,
  UploadCloud
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write detailed trade analysis, notes, or paste chart screenshots here (Ctrl + V supported)...',
  minHeight = '180px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Sync initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only update if innerHTML is noticeably different (avoid resetting cursor on every keystroke)
      if (value === '' && editorRef.current.innerHTML === '<br>') return;
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
        updateWordCount(value || '');
      }
    }
  }, [value]);

  const updateWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    setWordCount(words);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      updateWordCount(html);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    editorRef.current?.focus();
  };

  // Handle image upload from file picker
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      insertImage(base64Url);
    };
    reader.readAsDataURL(file);
  };

  const insertImage = (src: string) => {
    editorRef.current?.focus();
    const imgHtml = `<div class="editor-img-wrapper" style="margin: 12px 0; max-width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #233148; display: inline-block;"><img src="${src}" alt="Trade screenshot" style="max-width: 100%; height: auto; display: block; border-radius: 6px;" /></div><p><br></p>`;
    document.execCommand('insertHTML', false, imgHtml);
    handleInput();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        handleImageFile(files[i]);
      }
    }
    e.target.value = '';
  };

  // Handle Clipboard Paste (Ctrl + V with screenshot/image)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          hasImage = true;
          handleImageFile(blob);
        }
      }
    }

    if (!hasImage) {
      // Normal text paste
      setTimeout(handleInput, 0);
    }
  };

  // Handle Drag and Drop images
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          handleImageFile(files[i]);
        }
      }
    }
  };

  const insertHighlight = (colorBg: string, colorText: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const selectedText = selection.toString();
    if (selectedText) {
      const spanHtml = `<span style="background-color: ${colorBg}; color: ${colorText}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${selectedText}</span>`;
      document.execCommand('insertHTML', false, spanHtml);
      handleInput();
    }
  };

  return (
    <div style={{
      border: `1px solid ${isFocused ? 'var(--border-focus)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-md)',
      backgroundColor: '#050814',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
    }}>
      {/* Rich Editor Toolbar */}
      <div style={{
        backgroundColor: '#0b1020',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 8px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        userSelect: 'none'
      }}>
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => executeCommand('undo')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Undo (Ctrl+Z)"
          style={{ padding: '5px' }}
        >
          <Undo size={14} color="#94a3b8" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('redo')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Redo (Ctrl+Y)"
          style={{ padding: '5px' }}
        >
          <Redo size={14} color="#94a3b8" />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* Headings */}
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Heading (H3)"
          style={{ padding: '5px', fontWeight: 700, fontSize: '0.75rem', color: '#cbd5e1' }}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h4>')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Subheading (H4)"
          style={{ padding: '5px', fontWeight: 700, fontSize: '0.75rem', color: '#cbd5e1' }}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Paragraph"
          style={{ padding: '5px', fontSize: '0.75rem', color: '#cbd5e1' }}
        >
          P
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* Text Styles */}
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Bold (Ctrl+B)"
          style={{ padding: '5px' }}
        >
          <Bold size={14} color="#cbd5e1" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Italic (Ctrl+I)"
          style={{ padding: '5px' }}
        >
          <Italic size={14} color="#cbd5e1" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Underline (Ctrl+U)"
          style={{ padding: '5px' }}
        >
          <Underline size={14} color="#cbd5e1" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('strikeThrough')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Strikethrough"
          style={{ padding: '5px' }}
        >
          <Strikethrough size={14} color="#cbd5e1" />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* Lists & Blocks */}
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Bullet List"
          style={{ padding: '5px' }}
        >
          <List size={14} color="#cbd5e1" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Numbered List"
          style={{ padding: '5px' }}
        >
          <ListOrdered size={14} color="#cbd5e1" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<blockquote>')}
          className="btn btn-ghost btn-icon btn-sm"
          title="Quote Block"
          style={{ padding: '5px' }}
        >
          <Quote size={14} color="#cbd5e1" />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* Colored Highlight Tags for Trading */}
        <button
          type="button"
          onClick={() => insertHighlight('rgba(16, 185, 129, 0.2)', '#10b981')}
          className="btn btn-ghost btn-sm"
          title="Highlight Bullish Green"
          style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}
        >
          Bullish
        </button>
        <button
          type="button"
          onClick={() => insertHighlight('rgba(239, 68, 68, 0.2)', '#ef4444')}
          className="btn btn-ghost btn-sm"
          title="Highlight Bearish Red"
          style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
        >
          Bearish
        </button>
        <button
          type="button"
          onClick={() => insertHighlight('rgba(59, 130, 246, 0.2)', '#60a5fa')}
          className="btn btn-ghost btn-sm"
          title="Highlight Blue Note"
          style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.12)' }}
        >
          Setup
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* Upload / Insert Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-secondary btn-sm"
          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px', backgroundColor: '#162238', borderColor: '#2b3d5c', color: '#93c5fd' }}
          title="Upload or Paste screenshot (Ctrl+V)"
        >
          <ImageIcon size={14} color="#38bdf8" />
          <span>Upload / Paste Image</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
        />
      </div>

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          handleInput();
        }}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '14px 16px',
          color: '#f8fafc',
          outline: 'none',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          cursor: 'text',
          overflowY: 'auto'
        }}
      />

      {/* Editor Footer / Info Bar */}
      <div style={{
        padding: '6px 14px',
        backgroundColor: '#070b16',
        borderTop: '1px solid #141d2e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.7rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💡 <strong>Tip:</strong> Copy screenshot from TradingView / Windows Snipping Tool and press <strong>Ctrl + V</strong> to paste directly.</span>
        </div>
        <div>
          {wordCount} words
        </div>
      </div>
    </div>
  );
};
