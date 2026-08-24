'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { DOMParser } from 'prosemirror-model';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Mail, X, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Quote, Link as LinkIcon, Undo, Redo, Eraser, Send, Heading1, Heading2, Heading3,
  Highlighter, Table as TableIcon, CheckSquare, Minus, Type, FileText, AlertCircle
} from 'lucide-react';

interface RichEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (subject: string, htmlContent: string) => void;
  activeThemeColor?: string;
  recipientName?: string;
}

const COLOR_PALETTE = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Crimson', color: '#ef4444' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'White', color: '#ffffff' },
  { name: 'Muted', color: '#9ca3af' },
];

const HIGHLIGHT_PALETTE = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Cyan', color: '#a5f3fc' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Orange', color: '#fed7aa' },
];

const EMAIL_TEMPLATES = [
  {
    title: 'Formal Announcement',
    subject: 'Important Announcement & Updates',
    html: `<h2>Important Announcement</h2><p>Dear Team,</p><p>We are excited to share some major updates regarding our ongoing initiatives.</p><blockquote>"Success is best when shared."</blockquote><p>Please review the details above and feel free to reach out if you have any questions.</p><p>Best regards,</p>`,
  },
  {
    title: 'Meeting Invite',
    subject: 'Project Sync & Discussion',
    html: `<h2>Meeting Invitation</h2><p>Hi team,</p><p>Let's connect for a brief sync session to align on our upcoming milestones.</p><ul><li><strong>Agenda 1:</strong> Progress review</li><li><strong>Agenda 2:</strong> Q&A and next steps</li></ul><p>Looking forward to speaking with you!</p>`,
  },
  {
    title: 'Project Update',
    subject: 'Weekly Status Report',
    html: `<h2>Weekly Status Report</h2><p>Here is a summary of tasks completed this week:</p><ul data-type="taskList"><li data-checked="true">Feature architecture finalized</li><li data-checked="true">Testing and verification complete</li><li data-checked="false">Deployment to production</li></ul>`,
  },
];

export function RichEmailModal({
  isOpen,
  onClose,
  onSend,
  activeThemeColor = '#2563eb',
  recipientName = 'Recipient',
}: RichEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Compose your formatted email message here...' }),
    ],
    content: `<p>Hi ${recipientName},</p><p>Write your formatted message here...</p>`,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[140px] md:min-h-[220px] p-4 md:p-5 text-sm text-[var(--text-primary)]',
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        const isMarkdown = /(^#\s|^\d+\.\s|^\s*[-*+]\s|\*\*|__|\*|_|`|\[.*?\]\(.*?\))/m.test(text);

        if (isMarkdown) {
          event.preventDefault();
          const html = parseMarkdownToHtml(text);
          const parser = DOMParser.fromSchema(view.state.schema);
          const element = document.createElement('div');
          element.innerHTML = html;
          const slice = parser.parseSlice(element);
          const transaction = view.state.tr.replaceSelection(slice);
          view.dispatch(transaction);
          return true;
        }
        return false;
      },
    },
  });

  if (!isOpen || !editor) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrlInput(previousUrl);
    setLinkModalOpen(true);
  };

  const handleConfirmLink = () => {
    if (!linkUrlInput.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrlInput.trim() }).run();
    }
    setLinkModalOpen(false);
  };

  const handleApplyTemplate = (tpl: { subject: string; html: string }) => {
    setSubject(tpl.subject);
    editor.commands.setContent(tpl.html);
    setShowTemplates(false);
  };

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleSendEmail = () => {
    const htmlContent = editor.getHTML();
    if (!subject.trim()) {
      showToast('Please enter a subject or title for your email message.');
      return;
    }
    onSend(subject.trim(), htmlContent);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] md:max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 rounded-xl hidden sm:flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: activeThemeColor }}>
              <Mail size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight truncate">Formatted Email Message</h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-normal hidden sm:block">Create styled messages with Tiptap Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Preset Templates */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-2.5 py-1.5 sm:px-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText size={13} className="shrink-0" />
                <span className="hidden sm:inline">Templates</span>
              </button>

              {showTemplates && (
                <div className="absolute top-10 right-0 z-50 w-64 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 flex flex-col gap-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Select Preset Template</div>
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-3 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors border-none cursor-pointer"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Subject Line Input */}
        <div className="px-4 py-2.5 md:px-6 md:py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-3">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">SUBJECT:</label>
          <input
            type="text"
            placeholder="Type subject or message title..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-sm font-medium placeholder-[var(--text-muted)]"
          />
        </div>

        {/* Tiptap Rich Formatting Toolbar */}
        <div className="px-3 py-1.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex flex-nowrap overflow-x-auto md:flex-wrap items-center gap-1 scrollbar-none shrink-0 [&>button]:shrink-0 [&>div]:shrink-0">

          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Heading 3"
          >
            <Heading3 size={16} />
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />

          {/* Text Styles */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${editor.isActive('subscript') ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Subscript (X₂)"
          >
            X₂
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${editor.isActive('superscript') ? 'bg-indigo-600 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Superscript (X²)"
          >
            X²
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('code') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Inline Code"
          >
            <Code size={16} />
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />

          {/* Color Picker Swatches */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
              }}
              className="p-1.5 rounded hover:bg-[var(--border-color)] flex items-center gap-1 text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Text Color"
            >
              <Type size={15} />
              <div
                className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)]"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute top-9 left-0 z-50 p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl flex gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().setColor(c.color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color Swatches */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
              }}
              className={`p-1.5 rounded hover:bg-[var(--border-color)] flex items-center gap-1 transition-colors cursor-pointer ${editor.isActive('highlight') ? 'bg-amber-500/20 text-amber-300' : 'text-[var(--text-primary)]'}`}
              title="Highlight Text"
            >
              <Highlighter size={15} />
            </button>
            {showHighlightPicker && (
              <div className="absolute top-9 left-0 z-50 p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl flex items-center gap-1.5">
                {HIGHLIGHT_PALETTE.map((h) => (
                  <button
                    key={h.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: h.color }).run();
                      setShowHighlightPicker(false);
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: h.color }}
                    title={h.name}
                  />
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowHighlightPicker(false);
                  }}
                  className="px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Align Justify"
          >
            <AlignJustify size={16} />
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />

          {/* Lists, Tasks & Tables */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Ordered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Task Checklist"
          >
            <CheckSquare size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            title="Horizontal Line Divider"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertTable}
            className={`p-1.5 rounded transition-colors cursor-pointer ${editor.isActive('table') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Insert Table"
          >
            <TableIcon size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSetLink}
            className={`p-1.5 rounded transition-colors cursor-pointer ${editor.isActive('link') ? 'bg-white/20 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
            title="Insert Link"
          >
            <LinkIcon size={16} />
          </button>

          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />

          {/* Undo / Redo & Clear */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            title="Clear Formatting"
          >
            <Eraser size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--border-color)] disabled:opacity-30 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded text-[var(--text-primary)] hover:bg-[var(--border-color)] disabled:opacity-30 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
          </button>
        </div>

        {/* Tiptap Editor Box */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] min-h-[160px] md:min-h-[240px]">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 md:px-6 md:py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] gap-2 md:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendEmail}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
            style={{ backgroundColor: activeThemeColor }}
          >
            <Send size={15} />
            Send Formatted Email
          </button>
        </div>

        {/* Custom Toast Notification */}
        {toastMessage && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 bg-[var(--bg-secondary)] text-red-500 border border-red-500/40 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
            <AlertCircle size={17} className="shrink-0 text-red-500" />
            <span className="text-xs font-medium text-[var(--text-primary)]">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Custom Insert Link Modal */}
        {linkModalOpen && (
          <div className="absolute inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <LinkIcon size={16} className="text-indigo-500" />
                  <span>Insert / Edit Link</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Target URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmLink();
                    }
                  }}
                  autoFocus
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
                >
                  Apply Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Helper to convert Markdown to simple HTML on paste */
function parseMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML characters
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```lang ... ```)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Blockquotes (> text)
  const lines = html.split('\n');
  let inBlockquote = false;
  let inList = false;
  let inOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Headers
    if (line.startsWith('# ')) {
      lines[i] = `<h1>${line.slice(2)}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      lines[i] = `<h2>${line.slice(3)}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      lines[i] = `<h3>${line.slice(4)}</h3>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('&gt; ')) {
      if (!inBlockquote) {
        lines[i] = `<blockquote><p>${line.slice(5)}`;
        inBlockquote = true;
      } else {
        lines[i] = `${line.slice(5)}`;
      }
      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || !nextLine.startsWith('&gt; ')) {
        lines[i] += '</p></blockquote>';
        inBlockquote = false;
      }
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
      let content = line.slice(2);
      if (!inList) {
        lines[i] = `<ul><li>${content}</li>`;
        inList = true;
      } else {
        lines[i] = `<li>${content}</li>`;
      }
      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || (!nextLine.startsWith('- ') && !nextLine.startsWith('* ') && !nextLine.startsWith('+ '))) {
        lines[i] += '</ul>';
        inList = false;
      }
      continue;
    }

    // Ordered List
    if (/^\d+\.\s/.test(line)) {
      let content = line.replace(/^\d+\.\s/, '');
      if (!inOrderedList) {
        lines[i] = `<ol><li>${content}</li>`;
        inOrderedList = true;
      } else {
        lines[i] = `<li>${content}</li>`;
      }
      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || !/^\d+\.\s/.test(nextLine)) {
        lines[i] += '</ol>';
        inOrderedList = false;
      }
      continue;
    }
  }

  html = lines.join('\n');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');

  // Inline code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraph tags for normal lines
  const processedLines = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<p></p>';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<pre') || trimmed.endsWith('</blockquote>') || trimmed.endsWith('</ul>') || trimmed.endsWith('</ol>')) {
      return line;
    }
    return `<p>${line}</p>`;
  });

  return processedLines.join('');
}
