'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useCall } from '../../../context/CallContext';
import { useChatContext } from '../../../context/ChatContext';

import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { ChatDetails } from '../components/ChatDetails';
import { Lightbox } from '../components/Lightbox';

export default function ActiveChatPage() {
  const { user, token } = useAuth();
  const { onlineUsers } = useSocket();
  const { startCall, startGroupCall, setCurrentConvoId, groupCallStatus, joinGroupCall } = useCall();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Chat context state
  const chat = useChatContext();
  const {
    messages, activeConvo,
    hasMore, loadingMore, prependedMsgIds, isSwitchingThread,
    autoScrollBottomRef,
    replyingTo, setReplyingTo,
    activeReactionPickerId, setActiveReactionPickerId,
    activeCustomEmojiMsgId, setActiveCustomEmojiMsgId,
    deleteConfirmMsgId, setDeleteConfirmMsgId,
    reactionUpdatingMsgId,
    loadMoreMessages,
    handleSend, handleSendDefaultEmoji,
    handleToggleReaction, confirmDeleteMessage,
    updateChatSettings, scrollToMessage,
    getGroupedReactions, getRecipientInfo, getRecipientDisplayName,
    isRecipientTyping, recipientTypingText, handleInputChange, stopTyping,
    mediaEditor
  } = chat;

  // Local UI state
  const [showDetails, setShowDetails] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading] = useState(false);

  // Chat details sub-state
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [showDefaultEmojiPickerPopover, setShowDefaultEmojiPickerPopover] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [customUploadedBgs, setCustomUploadedBgs] = useState<string[]>([]);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Theme local sync from body class or localstorage
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Refs
  const messageAreaRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);
  const customReactionPickerRef = useRef<HTMLDivElement | null>(null);
  const deleteTooltipRef = useRef<HTMLDivElement | null>(null);
  const defaultEmojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom
  useEffect(() => {
    if (autoScrollBottomRef.current && messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages, isRecipientTyping, autoScrollBottomRef]);

  // Load theme preference
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
  }, []);

  // Sync current conversation ID to CallContext
  useEffect(() => {
    setCurrentConvoId(activeConvo?.id || null);
    return () => {
      setCurrentConvoId(null);
    };
  }, [activeConvo?.id, setCurrentConvoId]);

  // Listen to clicks outside picker elements
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (defaultEmojiPickerRef.current && !defaultEmojiPickerRef.current.contains(e.target as Node)) setShowDefaultEmojiPickerPopover(false);
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) setActiveReactionPickerId(null);
      if (customReactionPickerRef.current && !customReactionPickerRef.current.contains(e.target as Node)) setActiveCustomEmojiMsgId(null);
      if (deleteTooltipRef.current && !deleteTooltipRef.current.contains(e.target as Node)) setDeleteConfirmMsgId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setActiveReactionPickerId, setActiveCustomEmojiMsgId, setDeleteConfirmMsgId]);

  // Derived values
  const activeThemeColor = activeConvo?.themeColor || '#0084FF';
  const activeThemeGradient = activeConvo?.themeGradient;
  const activeBgImage = activeConvo?.bgImage;
  const activeDefaultEmoji = activeConvo?.defaultEmoji || '👍';

  const isGroup = activeConvo?.isGroup;
  const recipientInfo = isGroup ? null : getRecipientInfo(activeConvo);
  const recipientName = isGroup
    ? (activeConvo?.name || 'Group')
    : getRecipientDisplayName(activeConvo);
  const recipientAvatarUrl = isGroup
    ? (activeConvo?.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=100&q=80')
    : (recipientInfo?.avatarUrl || '');
  const recipientIsOnline = isGroup ? false : (recipientInfo ? onlineUsers.has(recipientInfo.id) : false);

  // Handlers
  const handleCall = (type: 'AUDIO' | 'VIDEO') => {
    if (!activeConvo || !user) return;
    if (activeConvo.isGroup) {
      // Group call
      if (groupCallStatus?.active) {
        joinGroupCall(activeConvo.id, type);
      } else {
        startGroupCall(activeConvo.id, activeConvo.name || 'Group', type);
      }
    } else {
      // 1:1 call
      const recipient = activeConvo.participants.find((p: any) => p.userId !== user.id)?.user;
      if (!recipient) return;
      startCall(recipient.id, recipient.name, recipient.avatarUrl, type, activeConvo.id);
    }
  };

  const handleBackToSidebar = () => {
    router.push('/chat');
  };

  const handleSaveNickname = (targetUserId: string) => {
    updateChatSettings({ nicknameTargetUserId: targetUserId, nickname: nicknameInput.trim() });
    setEditingParticipantId(null);
    setNicknameInput('');
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvo || !token) return;
    setIsUploadingBg(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      updateChatSettings({ bgImage: data.fileUrl });
      setCustomUploadedBgs((prev) => Array.from(new Set([data.fileUrl, ...prev])));
    } catch {
      alert('Failed to upload background image.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleDeleteCustomBg = (bgUrl: string) => {
    setCustomUploadedBgs((prev) => prev.filter((u) => u !== bgUrl));
    if (activeConvo?.bgImage === bgUrl) updateChatSettings({ bgImage: '' });
  };

  const handleInitiateReply = (msg: any) => {
    setReplyingTo(msg);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const handleSendMessage = () => {
    handleSend(inputText, setInputText, stopTyping);
  };

  const handleScrollMessages = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    if (t.scrollTop < 40 && hasMore && !loadingMore) {
      loadMoreMessages(messageAreaRef);
    }
  };

  if (!activeConvo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-secondary)] animate-pulse">Loading conversation...</div>
      </div>
    );
  }

  const handleSendRichEmail = (subject: string, htmlContent: string) => {
    const richPayload = `[RICH_EMAIL]${JSON.stringify({ subject, html: htmlContent })}`;
    handleSend(richPayload, () => { }, stopTyping);
  };

  return (
    <>
      {/* Header */}
      <ChatHeader
        activeConvo={activeConvo}
        recipientName={recipientName}
        recipientAvatarUrl={recipientAvatarUrl}
        isOnline={recipientIsOnline}
        showDetails={showDetails}
        activeThemeColor={activeThemeColor}
        onBack={handleBackToSidebar}
        onAudioCall={() => handleCall('AUDIO')}
        onVideoCall={() => handleCall('VIDEO')}
        onToggleDetails={() => setShowDetails(!showDetails)}
      />

      {/* Body Row */}
      <div className="flex-grow flex flex-row min-h-0 relative overflow-hidden">
        {/* Left Column: Messages + Input */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <MessageList
            messages={messages}
            hasMore={hasMore}
            loadingMore={loadingMore}
            isSwitchingThread={isSwitchingThread}
            isRecipientTyping={isRecipientTyping}
            recipientTypingName={recipientName}
            activeThemeColor={activeThemeColor}
            prependedMsgIds={prependedMsgIds}
            messageAreaRef={messageAreaRef}
            activeBgImage={activeBgImage}
            currentUserId={user?.id || ''}
            reactionUpdatingMsgId={reactionUpdatingMsgId}
            activeReactionPickerId={activeReactionPickerId}
            activeCustomEmojiMsgId={activeCustomEmojiMsgId}
            deleteConfirmMsgId={deleteConfirmMsgId}
            activeThemeGradient={activeThemeGradient}
            theme={theme}
            reactionPickerRef={reactionPickerRef}
            customReactionPickerRef={customReactionPickerRef}
            getGroupedReactions={getGroupedReactions}
            onScroll={handleScrollMessages}
            onLoadMore={() => loadMoreMessages(messageAreaRef)}
            onReply={handleInitiateReply}
            onReactionPickerToggle={setActiveReactionPickerId}
            onCustomEmojiMsgToggle={setActiveCustomEmojiMsgId}
            onToggleReaction={handleToggleReaction}
            onDeleteToggle={setDeleteConfirmMsgId}
            onConfirmDelete={confirmDeleteMessage}
            onScrollToMessage={(id) => scrollToMessage(id, 'animate-pulse rounded-lg shadow-sm duration-1000 bg-white/15')}
            onOpenLightbox={(urls, i) => { setLightboxImages(urls); setLightboxIndex(i); }}
          />

          <MessageInput
            inputText={inputText}
            uploading={uploading}
            sendingMedia={mediaEditor.sendingMedia}
            replyingTo={replyingTo}
            activeDefaultEmoji={activeDefaultEmoji}
            activeThemeColor={activeThemeColor}
            activeThemeGradient={activeThemeGradient}
            theme={theme}
            showEmojiPicker={showEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            textInputRef={textInputRef}
            onInputChange={(val) => handleInputChange(val, setInputText)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            onSend={handleSendMessage}
            onSendDefaultEmoji={handleSendDefaultEmoji}
            onFileSelect={mediaEditor.handleFileSelect}
            onEmojiClick={(d) => { setInputText((p) => p + d.emoji); textInputRef.current?.focus(); }}
            onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
            onCancelReply={() => setReplyingTo(null)}
            onSendRichEmail={handleSendRichEmail}
            participants={activeConvo?.participants || []}
            recipientName={recipientName}
            recipientTypingText={recipientTypingText}
          />
        </div>

        {/* Media Preview Modal */}
        {mediaEditor.showMediaPreviewModal && mediaEditor.pendingMediaItems.length > 0 && (
          <MediaPreviewModal
            pendingMediaItems={mediaEditor.pendingMediaItems}
            activeMediaIndex={mediaEditor.activeMediaIndex}
            setActiveMediaIndex={mediaEditor.setActiveMediaIndex}
            mediaCaptions={mediaEditor.mediaCaptions}
            setMediaCaptions={mediaEditor.setMediaCaptions}
            mediaFilters={mediaEditor.mediaFilters}
            setMediaFilters={mediaEditor.setMediaFilters}
            mediaRotations={mediaEditor.mediaRotations}
            setMediaRotations={mediaEditor.setMediaRotations}
            isDrawMode={mediaEditor.isDrawMode}
            setIsDrawMode={mediaEditor.setIsDrawMode}
            drawColor={mediaEditor.drawColor}
            setDrawColor={mediaEditor.setDrawColor}
            brushSize={mediaEditor.brushSize}
            setBrushSize={mediaEditor.setBrushSize}
            showFilterPicker={mediaEditor.showFilterPicker}
            setShowFilterPicker={mediaEditor.setShowFilterPicker}
            sendingMedia={mediaEditor.sendingMedia}
            qualityMode={mediaEditor.qualityMode}
            setQualityMode={mediaEditor.setQualityMode}
            drawCanvasRef={mediaEditor.drawCanvasRef}
            activeThemeColor={activeThemeColor}
            onClose={mediaEditor.handleCancelMediaPreview}
            onSend={mediaEditor.handleSendMediaWithCaption}
            onRemoveThumbnail={mediaEditor.handleRemoveThumbnail}
            onFileSelect={mediaEditor.handleFileSelect}
            startDrawing={mediaEditor.startDrawing}
            draw={mediaEditor.draw}
            stopDrawing={mediaEditor.stopDrawing}
            clearDrawing={mediaEditor.clearDrawing}
          />
        )}

        {/* Right Details Sidebar */}
        {showDetails && (
          <ChatDetails
            activeConvo={activeConvo}
            activeThemeColor={activeThemeColor}
            activeBgImage={activeBgImage}
            activeDefaultEmoji={activeDefaultEmoji}
            theme={theme}
            onlineUsers={onlineUsers}
            editingParticipantId={editingParticipantId}
            setEditingParticipantId={setEditingParticipantId}
            nicknameInput={nicknameInput}
            setNicknameInput={setNicknameInput}
            showDefaultEmojiPickerPopover={showDefaultEmojiPickerPopover}
            setShowDefaultEmojiPickerPopover={setShowDefaultEmojiPickerPopover}
            copiedHandle={copiedHandle}
            setCopiedHandle={setCopiedHandle}
            isUploadingBg={isUploadingBg}
            customUploadedBgs={customUploadedBgs}
            defaultEmojiPickerRef={defaultEmojiPickerRef}
            getRecipientInfo={getRecipientInfo}
            getRecipientDisplayName={getRecipientDisplayName}
            onClose={() => setShowDetails(false)}
            onSaveNickname={handleSaveNickname}
            updateChatSettings={updateChatSettings}
            onBgUpload={handleBgUpload}
            onDeleteCustomBg={handleDeleteCustomBg}
          />
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxImages([])}
        onPrev={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
        onNext={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
      />
    </>
  );
}
