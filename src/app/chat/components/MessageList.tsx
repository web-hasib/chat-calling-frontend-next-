'use client';
import React from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: any[];
  hasMore: boolean;
  loadingMore: boolean;
  isSwitchingThread: boolean;
  isRecipientTyping: boolean;
  recipientTypingName: string;
  activeThemeColor: string;
  prependedMsgIds: Set<string>;
  messageAreaRef: React.RefObject<HTMLDivElement | null>;
  activeBgImage?: string;
  currentUserId: string;
  // MessageItem passthrough props
  reactionUpdatingMsgId: string | null;
  activeReactionPickerId: string | null;
  activeCustomEmojiMsgId: string | null;
  deleteConfirmMsgId: string | null;
  activeThemeGradient?: string;
  theme: 'dark' | 'light';
  reactionPickerRef: React.RefObject<HTMLDivElement | null>;
  customReactionPickerRef: React.RefObject<HTMLDivElement | null>;
  getGroupedReactions: (reactions?: any[]) => { emoji: string; count: number; userReacted: boolean }[];
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onLoadMore: () => void;
  onReply: (msg: any) => void;
  onReactionPickerToggle: (id: string | null) => void;
  onCustomEmojiMsgToggle: (id: string | null) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onDeleteToggle: (id: string | null) => void;
  onConfirmDelete: (id: string, mode?: 'me' | 'everyone') => void;
  onScrollToMessage: (id: string) => void;
  onOpenLightbox: (urls: string[], index: number) => void;
}

export function MessageList({
  messages, hasMore, loadingMore, isSwitchingThread,
  isRecipientTyping, recipientTypingName, activeThemeColor,
  prependedMsgIds, messageAreaRef, activeBgImage, currentUserId,
  reactionUpdatingMsgId, activeReactionPickerId, activeCustomEmojiMsgId, deleteConfirmMsgId,
  activeThemeGradient, theme, reactionPickerRef, customReactionPickerRef,
  getGroupedReactions,
  onScroll, onLoadMore, onReply,
  onReactionPickerToggle, onCustomEmojiMsgToggle, onToggleReaction,
  onDeleteToggle, onConfirmDelete, onScrollToMessage, onOpenLightbox,
}: MessageListProps) {
  return (
    <div
      className={`flex-1 overflow-y-auto p-6 flex flex-col gap-4 ${activeBgImage ? 'bg-cover bg-center bg-no-repeat' : ''}`}
      style={activeBgImage ? { backgroundImage: `url(${activeBgImage})` } : undefined}
      ref={messageAreaRef}
      onScroll={onScroll}
    >
      {/* Feature 3: Pagination Load More Header */}
      {hasMore && (
        <div className="flex justify-center pb-4">
          <button className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="animate-spin inline-block" size={14} /> : 'Load older messages'}
          </button>
        </div>
      )}

      {isSwitchingThread ? (
        <div className="flex flex-col gap-4 py-3 w-full">
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-start rounded-bl-sm" style={{ width: '60%', height: '42px' }} />
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-end rounded-br-sm" style={{ width: '45%', height: '36px' }} />
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-start rounded-bl-sm" style={{ width: '70%', height: '54px' }} />
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-end rounded-br-sm" style={{ width: '35%', height: '36px' }} />
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-start rounded-bl-sm" style={{ width: '50%', height: '42px' }} />
          <div className="rounded-lg bg-[var(--bg-tertiary)] opacity-55 animate-pulse relative overflow-hidden self-end rounded-br-sm" style={{ width: '55%', height: '48px' }} />
        </div>
      ) : (
        messages.map((msg, index) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id || index} className="flex justify-center items-center my-0 w-full">
                <div className="bg-transparent border-none text-[var(--text-secondary)] text-[11px] font-medium p-0 text-center max-w-[85%] opacity-65">{msg.content}</div>
              </div>
            );
          }

          const isSentByMe = msg.senderId === currentUserId;
          const groupedReactions = getGroupedReactions(msg.reactions);
          const isPrepended = prependedMsgIds.has(msg.id);

          return (
            <MessageItem
              key={msg.id || index}
              msg={msg}
              isSentByMe={isSentByMe}
              isPrepended={isPrepended}
              groupedReactions={groupedReactions}
              reactionUpdatingMsgId={reactionUpdatingMsgId}
              activeReactionPickerId={activeReactionPickerId}
              activeCustomEmojiMsgId={activeCustomEmojiMsgId}
              deleteConfirmMsgId={deleteConfirmMsgId}
              activeThemeColor={activeThemeColor}
              activeThemeGradient={activeThemeGradient}
              theme={theme}
              reactionPickerRef={reactionPickerRef}
              customReactionPickerRef={customReactionPickerRef}
              onReply={onReply}
              onReactionPickerToggle={onReactionPickerToggle}
              onCustomEmojiMsgToggle={onCustomEmojiMsgToggle}
              onToggleReaction={onToggleReaction}
              onDeleteToggle={onDeleteToggle}
              onConfirmDelete={onConfirmDelete}
              onScrollToMessage={onScrollToMessage}
              onOpenLightbox={onOpenLightbox}
            />
          );
        })
      )}

      {/* Typing Indicator */}
      {isRecipientTyping && (
        <div className="max-w-full w-fit flex flex-col self-start relative">
          <div className="rounded-[16px] text-sm leading-normal relative px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-1" style={{ borderBottomLeftRadius: '4px' }}>
            <span className="text-xs text-[var(--text-secondary)]">{recipientTypingName} is typing</span>
            <MoreHorizontal className="animate-pulse" size={16} style={{ color: activeThemeColor }} />
          </div>
        </div>
      )}
    </div>
  );
}
