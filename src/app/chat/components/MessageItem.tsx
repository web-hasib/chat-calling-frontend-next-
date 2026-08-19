'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Smile, Reply, Trash2, X, ExternalLink, Check, CheckCheck, Loader2, Plus, Mail, Copy,
} from 'lucide-react';

interface MessageItemProps {
  msg: any;
  isSentByMe: boolean;
  isPrepended: boolean;
  groupedReactions: { emoji: string; count: number; userReacted: boolean }[];
  reactionUpdatingMsgId: string | null;
  activeReactionPickerId: string | null;
  activeCustomEmojiMsgId: string | null;
  deleteConfirmMsgId: string | null;
  activeThemeColor: string;
  activeThemeGradient?: string;
  theme: 'dark' | 'light';
  reactionPickerRef: React.RefObject<HTMLDivElement | null>;
  customReactionPickerRef: React.RefObject<HTMLDivElement | null>;
  onReply: (msg: any) => void;
  onReactionPickerToggle: (id: string | null) => void;
  onCustomEmojiMsgToggle: (id: string | null) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onDeleteToggle: (id: string | null) => void;
  onConfirmDelete: (id: string, mode?: 'me' | 'everyone') => void;
  onScrollToMessage: (id: string) => void;
  onOpenLightbox: (urls: string[], index: number) => void;
}

export function MessageItem({
  msg, isSentByMe, isPrepended,
  groupedReactions, reactionUpdatingMsgId,
  activeReactionPickerId, activeCustomEmojiMsgId, deleteConfirmMsgId,
  activeThemeColor, activeThemeGradient,
  theme, reactionPickerRef, customReactionPickerRef,
  onReply, onReactionPickerToggle, onCustomEmojiMsgToggle,
  onToggleReaction, onDeleteToggle, onConfirmDelete,
  onScrollToMessage, onOpenLightbox,
}: MessageItemProps) {
  const [showMobileActionBar, setShowMobileActionBar] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const startLongPress = useCallback(() => {
    isLongPressActiveRef.current = false;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setShowMobileActionBar((prev) => !prev);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const cancelLongPress = useCallback((e: React.TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (isLongPressActiveRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActiveRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showMobileActionBar) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const container = document.getElementById(`msg-${msg.id}`);
      if (container && !container.contains(e.target as Node)) {
        setShowMobileActionBar(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMobileActionBar, msg.id]);

  if (msg.isDeleted) {
    return (
      <div
        id={`msg-${msg.id}`}
        className={`flex flex-col max-w-[75%] min-w-[60px] w-fit mb-1 ${isSentByMe ? 'self-end items-end' : 'self-start items-start'}`}
      >
        <div className={`px-4 py-2 rounded-[16px] text-xs italic bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] ${isSentByMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}>
          {msg.content || `${msg.sender?.name || 'User'} removed this message`}
        </div>
      </div>
    );
  }

  const isDeleteOpen = deleteConfirmMsgId === msg.id;
  const isPickerOpen = activeReactionPickerId === msg.id || activeCustomEmojiMsgId === msg.id || isDeleteOpen;

  return (
    <div
      id={`msg-${msg.id}`}
      className={`group relative flex flex-col max-w-[75%] min-w-[60px] w-fit mb-1.5 pt-1 ${isSentByMe ? 'self-end items-end' : 'self-start items-start'} ${isPrepended ? 'animate-in fade-in-0 duration-350 slide-in-from-top-1.5' : ''}`}
    >
      {/* ── Hover Action Bar with invisible hover bridge ── */}
      <div
        className={`
          absolute -top-7 z-20
          flex items-center gap-0.5
          bg-[var(--bg-secondary)] border border-[var(--border-color)]
          rounded-xl px-1.5 py-0.5 shadow-xl
          transition-opacity duration-150
          before:absolute before:-bottom-3 before:left-0 before:right-0 before:h-4 before:content-['']
          ${isPickerOpen || showMobileActionBar
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
          }
          ${isSentByMe ? 'right-0' : 'left-0'}
        `}
      >
        {/* Emoji React */}
        <button
          type="button"
          title="React with Emoji"
          onClick={() => {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(30);
            }
            onReactionPickerToggle(activeReactionPickerId === msg.id ? null : msg.id);
            setShowMobileActionBar(false);
          }}
          className="flex items-center justify-center w-6 h-6 rounded-lg border-none cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Smile size={13} />
        </button>

        {/* Reply */}
        <button
          type="button"
          title="Reply"
          onClick={() => {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(30);
            }
            onReply(msg);
            setShowMobileActionBar(false);
          }}
          className="flex items-center justify-center w-6 h-6 rounded-lg border-none cursor-pointer transition-colors duration-100 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Reply size={13} />
        </button>

        {/* Delete — portal-based confirm that always stays in viewport */}
        <DeleteConfirmPopover
          open={isDeleteOpen}
          isSentByMe={isSentByMe}
          onOpen={() => {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(30);
            }
            onDeleteToggle(msg.id);
          }}
          onClose={() => onDeleteToggle(null)}
          onConfirmEveryone={() => onConfirmDelete(msg.id, 'everyone')}
          onConfirmMe={() => onConfirmDelete(msg.id, 'me')}
        />
      </div>

      {/* Emoji Reaction Picker Bar */}
      {activeReactionPickerId === msg.id && (
        <div className={`absolute -top-11 z-20 flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md p-1 shadow-md ${isSentByMe ? 'right-0' : 'left-0'}`} ref={reactionPickerRef}>
          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
            <button
              key={emoji}
              className="bg-transparent border-none text-base cursor-pointer px-1 rounded-sm hover:bg-[var(--bg-tertiary)] transition-colors"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                  window.navigator.vibrate(35);
                }
                onToggleReaction(msg.id, emoji);
              }}
            >
              {emoji}
            </button>
          ))}
          <button
            className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(30);
              }
              onReactionPickerToggle(null);
              onCustomEmojiMsgToggle(msg.id);
            }}
            title="React with any emoji"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Custom Any Emoji Picker Popover */}
      {activeCustomEmojiMsgId === msg.id && (
        <div 
          className="fixed inset-0 bg-black/60 z-[2000] flex items-end justify-center md:absolute md:inset-auto md:-top-[390px] md:z-50 md:bg-transparent md:flex md:items-stretch md:justify-start"
          onClick={() => onCustomEmojiMsgToggle(null)}
        >
          <div 
            className={`w-full bg-[var(--bg-secondary)] rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 md:w-[320px] md:rounded-lg md:animate-none ${isSentByMe ? 'md:right-0' : 'md:left-0'}`}
            onClick={(e) => e.stopPropagation()}
            ref={customReactionPickerRef}
          >
            {/* Drag indicator bar for mobile drawer */}
            <div className="h-1.5 w-12 bg-[var(--border-color)] rounded-full mx-auto my-3 md:hidden" />
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onToggleReaction(msg.id, emojiData.emoji);
                onCustomEmojiMsgToggle(null);
              }}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              searchDisabled={false}
              width="100%"
              height={380}
            />
          </div>
        </div>
      )}

      {/* Message Bubble Box */}
      <div 
        className="max-w-full w-fit flex flex-col relative no-select-drag"
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchMove}
      >
        {/* Quoted Reply Box inside Message */}
        {msg.replyTo && (
          <div 
            className={`bg-black/15 border-l-3 border-[var(--accent-primary)] rounded-sm p-1.5 mb-1.5 text-xs ${!isSentByMe ? 'bg-[var(--bg-tertiary)]' : ''}`}
            onClick={() => onScrollToMessage(msg.replyTo.id)}
            style={{ cursor: 'pointer' }}
            title="Click to view original message"
          >
            <div className="font-semibold text-[var(--accent-primary)] mb-0.5">
              Replying to {msg.replyTo.sender?.name || 'Message'}
            </div>
            <div className="text-[var(--text-secondary)] truncate">
              {msg.replyTo.content || (msg.replyTo.fileUrl ? 'Attachment File' : '')}
            </div>
          </div>
        )}

        {msg.fileUrl ? (
          (msg.fileType?.split(',')[0] === 'IMAGE') ? (
            <div
              className={`p-1 rounded-[16px] max-w-[300px] overflow-hidden break-words whitespace-pre-wrap ${isSentByMe ? 'bg-[var(--accent-primary)] text-white rounded-br-[4px]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-bl-[4px]'}`}
              style={
                isSentByMe
                  ? activeThemeGradient
                    ? { background: activeThemeGradient }
                    : activeThemeColor
                    ? { background: activeThemeColor }
                    : undefined
                  : undefined
              }
            >
              {(() => {
                const urls = msg.fileUrl.split(',');
                if (urls.length > 1) {
                  const displayUrls = urls.slice(0, 4);
                  const extraCount = urls.length - 3;
                  return (
                    <div className={`grid gap-1 max-w-[320px] w-full rounded-sm overflow-hidden mb-1 ${urls.length >= 4 ? 'grid-cols-2 grid-rows-2' : urls.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                      {displayUrls.map((url: string, i: number) => {
                        const isLast = i === 3 && urls.length > 4;
                        const isFirstOfThree = i === 0 && urls.length === 3;
                        return (
                          <div
                            key={i}
                            className={`relative cursor-pointer overflow-hidden ${isFirstOfThree ? 'col-span-2 aspect-[1.8]' : 'aspect-square'}`}
                            onClick={() => onOpenLightbox(urls, i)}
                          >
                            <img
                              src={url.trim()}
                              alt="Attachment"
                              className="w-full h-full object-cover hover:scale-[1.04] transition-transform duration-200"
                            />
                            {isLast && (
                              <div className="absolute inset-0 bg-black/55 flex items-center justify-center color-white text-xl font-bold backdrop-blur-[2px]">
                                <span>+{extraCount}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return (
                  <img
                    src={msg.fileUrl}
                    alt="Attachment"
                    className="w-full max-w-[292px] max-h-[320px] object-cover rounded-sm block cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onOpenLightbox(urls, 0)}
                  />
                );
              })()}
              {msg.content && <div className="px-2 py-1 text-sm leading-normal">{msg.content}</div>}
            </div>
          ) : (
            <div
              className={`px-4 py-3 rounded-[16px] text-sm leading-normal break-words overflow-wrap-anywhere whitespace-pre-wrap ${isSentByMe ? 'bg-[var(--accent-primary)] text-white rounded-br-[4px]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-[4px]'}`}
              style={
                isSentByMe
                  ? activeThemeGradient
                    ? { background: activeThemeGradient }
                    : activeThemeColor
                    ? { background: activeThemeColor }
                    : undefined
                  : undefined
              }
            >
              {(() => {
                const urls = msg.fileUrl.split(',');
                if (urls.length > 1) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {urls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          View Attachment File {i + 1}
                        </a>
                      ))}
                    </div>
                  );
                }
                return (
                  <a
                    href={msg.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    View Attachment File
                  </a>
                );
              })()}
              {msg.content && <div style={{ marginTop: '6px' }}>{msg.content}</div>}
            </div>
          )
        ) : msg.content?.startsWith('[RICH_EMAIL]') ? (
          (() => {
            let richEmailData: { subject: string; html: string } | null = null;
            try {
              richEmailData = JSON.parse(msg.content.slice(12));
            } catch {
              richEmailData = null;
            }
            if (!richEmailData) {
              return (
                <div className={`px-4 py-3 rounded-[16px] text-sm ${isSentByMe ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)]'}`}>
                  {msg.content}
                </div>
              );
            }
            return (
              <RichEmailCard
                subject={richEmailData.subject}
                html={richEmailData.html}
                isSentByMe={isSentByMe}
              />
            );
          })()
        ) : (() => {
          let content = (msg.content || '').trim();
          let explicitSize: 'small' | 'medium' | 'large' | null = null;
          
          if (content.startsWith('[BIG_EMOJI:')) {
            const closingIdx = content.indexOf(']');
            if (closingIdx !== -1) {
              const tag = content.slice(11, closingIdx);
              if (tag === 'medium' || tag === 'large' || tag === 'small') {
                explicitSize = tag;
                content = content.slice(closingIdx + 1).trim();
              }
            }
          }

          // Regex to check if the message consists ONLY of 1 to 3 emojis
          const emojiOnlyRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D|\u20E3|\s)+$/u;
          const isEmojiOnly = content.length > 0 && emojiOnlyRegex.test(content);
          
          if (isEmojiOnly) {
            // Count approximate emoji count
            const emojiSegments = Array.from(new Intl.Segmenter().segment(content)).filter(s => s.segment.trim().length > 0);
            const isSingleEmoji = emojiSegments.length === 1;
            const isFewEmojis = emojiSegments.length > 1 && emojiSegments.length <= 4;
            
            // If explicitly sized or single emoji
            let sizeClasses = 'text-2xl';
            if (explicitSize === 'large') {
              sizeClasses = 'text-6xl md:text-7xl my-2 scale-110 animate-in zoom-in-50 duration-200';
            } else if (explicitSize === 'medium') {
              sizeClasses = 'text-4xl md:text-5xl my-1 animate-in zoom-in-75 duration-150';
            } else if (explicitSize === 'small') {
              sizeClasses = 'text-2xl my-0.5';
            } else if (isSingleEmoji) {
              sizeClasses = 'text-3xl my-1';
            } else if (isFewEmojis) {
              sizeClasses = 'text-2xl my-1';
            }

            return (
              <div
                className={`py-1 px-1 leading-none select-none hover:scale-105 transition-transform duration-150 origin-bottom ${sizeClasses}`}
              >
                {content}
              </div>
            );
          }

          return (
            <div
              className={`px-4 py-3 rounded-[16px] text-sm leading-normal break-words overflow-wrap-anywhere whitespace-pre-wrap relative ${isSentByMe ? 'bg-[var(--accent-primary)] text-white rounded-br-[4px]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-[4px]'}`}
              style={
                isSentByMe
                  ? activeThemeGradient
                    ? { background: activeThemeGradient }
                    : activeThemeColor
                    ? { background: activeThemeColor }
                    : undefined
                  : undefined
              }
            >
              {msg.content}
              {/* Lej / Tail using Clip Path */}
              {isSentByMe ? (
                <div 
                  className="absolute bottom-0 -right-2 w-3.5 h-[18px] bg-inherit" 
                  style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%, 0 0)' }}
                />
              ) : (
                <div 
                  className="absolute bottom-[-1px] -left-2 w-3.5 h-[18px] bg-inherit border-l border-b border-[var(--border-color)]" 
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 100% 0)' }}
                />
              )}
            </div>
          );
        })()}

        {/* Rich Link Preview Card */}
        {msg.linkPreview && (
          <a
            href={msg.linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-md overflow-hidden bg-black/20 border border-[var(--border-color)] flex flex-col text-inherit no-underline"
          >
            {msg.linkPreview.image && (
              <img
                src={msg.linkPreview.image}
                alt={msg.linkPreview.title || 'Link preview'}
                className="w-full max-h-40 object-cover"
              />
            )}
            <div className="p-3 flex flex-col gap-1">
              {msg.linkPreview.siteName && (
                <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
                  {msg.linkPreview.siteName} <ExternalLink size={10} style={{ display: 'inline', marginLeft: 2 }} />
                </div>
              )}
              {msg.linkPreview.title && (
                <div className="text-sm font-semibold leading-normal text-[var(--text-primary)] line-clamp-2">{msg.linkPreview.title}</div>
              )}
              {msg.linkPreview.description && (
                <div className="text-[11px] text-[var(--text-secondary)] leading-normal line-clamp-2">{msg.linkPreview.description}</div>
              )}
            </div>
          </a>
        )}
      </div>

      {/* Reaction Badges Pill Row */}
      {(groupedReactions.length > 0 || reactionUpdatingMsgId === msg.id) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {groupedReactions.map((r) => (
            <button
              key={r.emoji}
              className={`inline-flex items-center gap-1 text-xs border border-transparent rounded-full px-2 py-0.5 cursor-pointer text-[var(--text-primary)] transition-colors ${r.userReacted ? 'bg-blue-500/15 text-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
              onClick={() => onToggleReaction(msg.id, r.emoji)}
              disabled={reactionUpdatingMsgId === msg.id}
              style={r.userReacted ? { borderColor: activeThemeColor } : undefined}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
          {reactionUpdatingMsgId === msg.id && (
            <div className="flex items-center shrink-0">
              <Loader2 size={13} className="animate-spin inline-block" />
            </div>
          )}
        </div>
      )}

      {/* Timestamp & Read Status Receipts */}
      <div className={`text-[10px] text-[var(--text-muted)] mt-1 ${isSentByMe ? 'self-end' : 'self-start'}`}>
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {isSentByMe && (
          <span className="inline-flex items-center ml-1 text-[var(--text-muted)]">
            {msg.id.startsWith('pending') ? (
              <Check size={12} />
            ) : msg.isRead ? (
              <CheckCheck size={13} style={{ color: activeThemeColor }} />
            ) : (
              <CheckCheck size={13} />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Rich Email Message Card with Copy functionality
───────────────────────────────────────────── */
function RichEmailCard({
  subject,
  html,
  isSentByMe,
}: {
  subject: string;
  html: string;
  isSentByMe: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.opacity = '0';
    tempContainer.style.pointerEvents = 'none';

    tempContainer.innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 8px;">${subject}</h2>
        <div>${html}</div>
      </div>
    `;

    document.body.appendChild(tempContainer);

    const range = document.createRange();
    range.selectNodeContents(tempContainer);
    const selection = window.getSelection();
    let execSuccess = false;

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        execSuccess = document.execCommand('copy');
      } catch {
        execSuccess = false;
      }
      selection.removeAllRanges();
    }

    document.body.removeChild(tempContainer);

    if (execSuccess) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const fullHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;"><h2 style="font-size: 18px; font-weight: bold;">${subject}</h2><div>${html}</div></div>`;
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    const plainText = `Subject: ${subject}\n\n${tmp.innerText || tmp.textContent || ''}`;

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });

        navigator.clipboard.write([item]).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          navigator.clipboard.writeText(plainText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        });
      } else {
        navigator.clipboard.writeText(plainText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    } catch {
      navigator.clipboard.writeText(plainText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      className={`p-4 max-w-sm w-full border shadow-md flex flex-col gap-2.5 ${
        isSentByMe
          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/35 text-[var(--text-primary)] rounded-2xl rounded-br-sm'
          : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl rounded-bl-sm'
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border-color)]/30 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-500/20 text-purple-400 flex items-center justify-center rounded-md">
            <Mail size={12} />
          </div>
          <span className="font-semibold text-[10px] text-purple-400 uppercase tracking-wider">Email Message</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] font-semibold px-2 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer transition-colors rounded-md"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="text-xs font-semibold text-[var(--text-primary)] truncate" title={subject}>
        Subject: {subject}
      </div>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full py-2 bg-[var(--accent-primary)] hover:opacity-95 text-white border-none text-xs font-bold cursor-pointer transition-colors rounded-lg shadow-sm"
      >
        View Full Email
      </button>

      {/* Full Email Modal Overlay */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col max-h-[85vh] overflow-hidden rounded-none shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-500/20 text-purple-400 flex items-center justify-center rounded-none shadow-none">
                  <Mail size={13} />
                </div>
                <span className="font-bold text-xs text-purple-400 uppercase tracking-wider">Email Content</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent cursor-pointer rounded-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 md:p-6 overflow-y-auto bg-[var(--bg-primary)] no-select-drag">
              <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)] mb-3">Subject: {subject}</h2>
              <div 
                className="tiptap-rendered-content text-xs md:text-sm leading-relaxed text-[var(--text-primary)] border-t border-[var(--border-color)]/30 pt-3"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold cursor-pointer transition-colors rounded-none shadow-none"
              >
                {copied ? 'Copied!' : 'Copy Content'}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[var(--accent-primary)] hover:opacity-90 text-white border-none text-xs font-semibold cursor-pointer transition-colors rounded-none shadow-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Zero-dependency portal popover for delete confirm.
   Renders into document.body via ReactDOM.createPortal
   so it's never clipped by scroll containers or the
   viewport top edge. Auto-flips top↔bottom and clamps horizontally.
───────────────────────────────────────────── */
interface DeleteConfirmPopoverProps {
  open: boolean;
  isSentByMe: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfirmEveryone: () => void;
  onConfirmMe: () => void;
}

function DeleteConfirmPopover({
  open, isSentByMe, onOpen, onClose, onConfirmEveryone, onConfirmMe,
}: DeleteConfirmPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [flipToBottom, setFlipToBottom] = useState(false);

  // Recalculate position whenever open state changes
  const recalc = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverH = 48;
    const popoverW = isSentByMe ? 250 : 190;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

    const spaceAbove = rect.top;
    const shouldFlip = spaceAbove < popoverH + 12;
    setFlipToBottom(shouldFlip);

    let rawLeft = rect.left + rect.width / 2;
    const minLeft = popoverW / 2 + 16;
    const maxLeft = screenWidth - popoverW / 2 - 16;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));

    setCoords({
      top: shouldFlip ? rect.bottom + 8 : rect.top - popoverH - 8,
      left: clampedLeft,
    });
  }, [isSentByMe]);

  useEffect(() => {
    if (open) {
      recalc();
    } else {
      setCoords(null);
    }
  }, [open, recalc]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        title="Delete Message"
        onClick={() => open ? onClose() : onOpen()}
        className={`flex items-center justify-center w-6 h-6 rounded-lg border-none cursor-pointer transition-colors duration-100 bg-transparent ${open ? 'bg-red-500/20 text-red-500' : 'text-[var(--text-secondary)] hover:bg-red-500/15 hover:text-red-500'}`}
      >
        <Trash2 size={13} />
      </button>

      {/* Portal — renders outside any scroll container */}
      {open && coords && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            zIndex: 99999,
          }}
          className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        >
          <span className="text-[11px] font-bold text-[var(--text-secondary)] whitespace-nowrap">
            Delete:
          </span>

          {isSentByMe && (
            <button
              type="button"
              className="text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors bg-red-600 hover:bg-red-700 text-white border-none whitespace-nowrap shadow-sm"
              onClick={(e) => { e.stopPropagation(); onConfirmEveryone(); }}
            >
              Everyone
            </button>
          )}

          <button
            type="button"
            className="text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] whitespace-nowrap shadow-sm"
            onClick={(e) => { e.stopPropagation(); onConfirmMe(); }}
          >
            {isSentByMe ? 'Just Me' : 'Delete'}
          </button>

          <button
            type="button"
            className="ml-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-transparent border-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Cancel"
          >
            <X size={11} />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
