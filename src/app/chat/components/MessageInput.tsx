'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Smile, Paperclip, Send, X, Image as ImageIcon, Camera, Mail } from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { RichEmailModal } from './RichEmailModal';
import { formatMessageSnippet } from '../../../utils/formatSnippet';

interface MessageInputProps {
  inputText: string;
  uploading: boolean;
  sendingMedia: boolean;
  replyingTo: any | null;
  activeDefaultEmoji: string;
  activeThemeColor: string;
  activeThemeGradient?: string;
  theme: 'dark' | 'light';
  showEmojiPicker: boolean;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  textInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onSendDefaultEmoji: (size?: 'small' | 'medium' | 'large') => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => void;
  onEmojiClick: (data: { emoji: string }) => void;
  onToggleEmojiPicker: () => void;
  onCancelReply: () => void;
  onSendRichEmail?: (subject: string, htmlContent: string) => void;
  participants?: any[];
  recipientName?: string;
  recipientTypingText?: string;
}

export function MessageInput({
  inputText, uploading, sendingMedia, replyingTo,
  activeDefaultEmoji, activeThemeColor, activeThemeGradient,
  theme, showEmojiPicker, emojiPickerRef, textInputRef,
  onInputChange, onKeyDown, onSend, onSendDefaultEmoji,
  onFileSelect, onEmojiClick, onToggleEmojiPicker, onCancelReply,
  onSendRichEmail,
  participants = [],
  recipientName = 'Recipient',
  recipientTypingText = '',
}: MessageInputProps) {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showRichEmailModal, setShowRichEmailModal] = useState(false);

  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close attachment menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!participants || participants.length === 0) {
      setShowMentionList(false);
      return;
    }
    const words = inputText.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.startsWith('@')) {
      setShowMentionList(true);
      setMentionSearch(lastWord.slice(1).toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentionList(false);
    }
  }, [inputText, participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const name = (p.user?.name || p.user?.username || '').toLowerCase();
      const username = (p.user?.username || '').toLowerCase();
      return name.includes(mentionSearch) || username.includes(mentionSearch);
    });
  }, [participants, mentionSearch]);

  const selectMention = (targetUser: any) => {
    const words = inputText.split(/\s+/);
    words[words.length - 1] = `@${targetUser.username || targetUser.name} `;
    onInputChange(words.join(' '));
    setShowMentionList(false);
    textInputRef.current?.focus();
  };

  const handleLocalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionList && filteredParticipants.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredParticipants.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredParticipants.length) % filteredParticipants.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(filteredParticipants[mentionIndex].user);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionList(false);
        return;
      }
    }
    onKeyDown(e);
  };

  const handleCameraCapture = (file: File) => {
    onFileSelect({ target: { files: [file] } } as any);
  };

  // ─── Press & Hold Emoji Growing Logic (Messenger style) ───
  const [holdingEmoji, setHoldingEmoji] = useState(false);
  const [emojiScale, setEmojiScale] = useState(1);
  const [isPopping, setIsPopping] = useState(false);
  const holdStartTimeRef = useRef<number>(0);
  const scaleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startEmojiHold = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    
    holdStartTimeRef.current = Date.now();
    setIsPopping(false);
    setHoldingEmoji(true);
    setEmojiScale(1);

    if (scaleIntervalRef.current) clearInterval(scaleIntervalRef.current);
    scaleIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      // Start scaling after 150ms of hold
      if (elapsed > 150) {
        // Growth curve from 1 to 2.8x max (reaches max at 1500ms growth, i.e., 1650ms elapsed)
        const progress = Math.min((elapsed - 150) / 1500, 1);
        const currentScale = 1 + progress * 1.8;
        setEmojiScale(currentScale);

        // Auto-cancel 1 second after reaching max size (1650ms + 1000ms = 2650ms)
        if (elapsed >= 2650) {
          if (scaleIntervalRef.current) {
            clearInterval(scaleIntervalRef.current);
            scaleIntervalRef.current = null;
          }
          setIsPopping(true);
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([40, 40, 40]);
          }
          setTimeout(() => {
            setHoldingEmoji(false);
            setIsPopping(false);
            setEmojiScale(1);
          }, 200); // Animation duration
        }
      }
    }, 25);
  };

  const endEmojiHold = (e: React.PointerEvent) => {
    if (!holdingEmoji || isPopping) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    if (scaleIntervalRef.current) {
      clearInterval(scaleIntervalRef.current);
      scaleIntervalRef.current = null;
    }

    const elapsed = Date.now() - holdStartTimeRef.current;
    setHoldingEmoji(false);
    setEmojiScale(1);

    // Determine size level based on duration held
    if (elapsed < 350) {
      onSendDefaultEmoji('small');
    } else if (elapsed < 1100) {
      onSendDefaultEmoji('medium');
    } else {
      onSendDefaultEmoji('large');
    }
  };

  const cancelEmojiHold = (e: React.PointerEvent) => {
    if (!holdingEmoji) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    if (scaleIntervalRef.current) {
      clearInterval(scaleIntervalRef.current);
      scaleIntervalRef.current = null;
    }
    setHoldingEmoji(false);
    setIsPopping(false);
    setEmojiScale(1);
  };

  useEffect(() => {
    return () => {
      if (scaleIntervalRef.current) clearInterval(scaleIntervalRef.current);
    };
  }, []);

  return (
    <>
      {/* Reply Drawer Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] border-l-3 flex items-center justify-between text-xs" style={{ borderLeftColor: activeThemeColor }}>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold" style={{ color: activeThemeColor }}>
              Replying to {replyingTo.sender?.name || 'Message'}
            </span>
            <span className="text-[var(--text-secondary)] truncate">
              {formatMessageSnippet(replyingTo) || (replyingTo.fileUrl ? 'Attachment File' : '')}
            </span>
          </div>
          <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-0.5" onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Remote Typing Draft Preview (Above Input Box) */}
      {recipientTypingText && recipientTypingText.trim().length > 0 && (
        <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex items-center justify-between text-xs animate-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping shrink-0" />
            <span className="font-semibold text-purple-500 shrink-0">
              {recipientName} is typing:
            </span>
            <span className="text-[var(--text-primary)] italic truncate font-normal">
              "{recipientTypingText}"
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] shrink-0 uppercase tracking-wider ml-2 bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
            Live Preview
          </span>
        </div>
      )}

      {/* Chat Input Panel */}
      <div className="relative p-4 md:px-5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center gap-3">

        {/* Mention Suggestions Dropdown */}
        {showMentionList && filteredParticipants.length > 0 && (
          <div className="absolute bottom-[72px] left-[54px] z-[1000] w-[240px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[200px] overflow-y-auto">
            {filteredParticipants.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectMention(p.user)}
                className={`flex items-center gap-2 px-3 py-2 w-full text-left text-xs border-none bg-transparent hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors ${mentionIndex === idx ? 'bg-[var(--bg-tertiary)]' : 'text-[var(--text-primary)]'
                  }`}
              >
                <img src={p.user?.avatarUrl} alt={p.user?.name} className="w-5 h-5 rounded-full object-cover" />
                <div className="flex flex-col">
                  <span className="font-semibold">{p.user?.name || p.user?.username}</span>
                  <span className="text-[var(--text-secondary)] text-[10px]">@{p.user?.username}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div 
            className="fixed inset-0 bg-black/60 z-[1000] flex items-end justify-center md:absolute md:inset-auto md:bottom-[76px] md:right-[70px] md:bg-transparent md:flex md:items-stretch md:justify-start"
            onClick={onToggleEmojiPicker}
          >
            <div 
              className="w-full bg-[var(--bg-secondary)] rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 md:w-[340px] md:rounded-lg md:animate-none"
              onClick={(e) => e.stopPropagation()}
              ref={emojiPickerRef}
            >
              {/* Drag indicator bar for mobile drawer */}
              <div className="h-1.5 w-12 bg-[var(--border-color)] rounded-full mx-auto my-3 md:hidden" />
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  onEmojiClick(emojiData);
                  onToggleEmojiPicker(); // Automatically close picker after selection on mobile
                }}
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                searchDisabled={false}
                width="100%"
                height={380}
              />
            </div>
          </div>
        )}

        {/* Attachment Action Popover Menu */}
        <div className="relative" ref={attachmentMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="flex items-center justify-center cursor-pointer text-[var(--text-secondary)] w-10 h-10 rounded-full hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent"
            title="Attachment Options"
          >
            <Paperclip size={18} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileSelect}
            className="hidden"
            disabled={sendingMedia}
            multiple
          />

          {showAttachmentMenu && (
            <div className="absolute bottom-12 left-0 z-[2000] w-60 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">

              {/* Option 1: Upload File / Image */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border-none text-left w-full cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                  <ImageIcon size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[var(--text-primary)]">Upload Image / File</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Choose photos or files</span>
                </div>
              </button>

              {/* Option 2: Capture Image */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  setShowCameraModal(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border-none text-left w-full cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <Camera size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[var(--text-primary)]">Capture Photo</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Take snap with camera</span>
                </div>
              </button>

              {/* Option 3: Formatted Email Message */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  setShowRichEmailModal(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border-none text-left w-full cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[var(--text-primary)]">Formatted Email</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Rich Tiptap message editor</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex-grow relative flex items-center">
          <input
            ref={textInputRef}
            type="text"
            placeholder={
              uploading
                ? 'Uploading attachment...'
                : replyingTo
                  ? `Replying to ${replyingTo.sender?.name || 'message'}...`
                  : 'Type a message...'
            }
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleLocalKeyDown}
            className="w-full pl-[18px] pr-11 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
            disabled={uploading}
          />
          <button
            type="button"
            className="absolute right-3 bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 flex items-center justify-center rounded-full hover:text-[var(--accent-primary)] hover:scale-110 transition-all"
            onClick={onToggleEmojiPicker}
            title="Choose an Emoji"
          >
            <Smile size={20} />
          </button>
        </div>

        {inputText.trim() ? (
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer hover:opacity-95 transition-opacity bg-[var(--accent-primary)] shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
            onClick={onSend}
            disabled={uploading}
            style={
              activeThemeGradient
                ? { background: activeThemeGradient }
                : activeThemeColor
                  ? { background: activeThemeColor }
                  : undefined
            }
          >
            <Send size={16} />
          </button>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Growing Emoji Bubble Preview while holding */}
            {holdingEmoji && (
              <div
                className={`absolute bottom-12 right-0 pointer-events-none z-50 flex items-center justify-center origin-bottom select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200 ${
                  isPopping ? 'scale-0 opacity-0 ease-in' : 'duration-75 ease-out'
                }`}
                style={{
                  transform: isPopping ? 'scale(0)' : `scale(${emojiScale})`,
                }}
              >
                <div className={`text-4xl ${isPopping ? 'animate-none' : 'animate-pulse'}`}>
                  {activeDefaultEmoji}
                </div>
              </div>
            )}
            
            <button
              type="button"
              className={`bg-transparent border-none text-xl cursor-pointer flex items-center justify-center w-[38px] h-[38px] rounded-md transition-all select-none touch-none ${
                holdingEmoji ? 'scale-90 bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              onPointerDown={startEmojiHold}
              onPointerUp={endEmojiHold}
              onPointerCancel={cancelEmojiHold}
              onContextMenu={(e) => e.preventDefault()}
              title={`Send Quick Emoji (${activeDefaultEmoji}) — Press and hold to grow!`}
            >
              <span className={holdingEmoji ? 'opacity-30 transition-opacity' : 'transition-opacity'}>
                {activeDefaultEmoji}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        activeThemeColor={activeThemeColor}
      />

      {/* Rich Email Message Modal */}
      <RichEmailModal
        isOpen={showRichEmailModal}
        onClose={() => setShowRichEmailModal(false)}
        onSend={(subj, html) => {
          if (onSendRichEmail) {
            onSendRichEmail(subj, html);
          }
        }}
        activeThemeColor={activeThemeColor}
        recipientName={recipientName}
      />
    </>
  );
}

