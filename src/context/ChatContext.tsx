'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useChat } from '../hooks/useChat';
import { useTyping } from '../hooks/useTyping';
import { useMediaEditor } from '../hooks/useMediaEditor';

interface ChatContextType {
  // Chat state
  conversations: any[];
  messages: any[];
  activeConvo: any | null;
  setActiveConvo: (convo: any | null) => void;
  users: any[];
  conversationsLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  prependedMsgIds: Set<string>;
  isSwitchingThread: boolean;
  autoScrollBottomRef: React.MutableRefObject<boolean>;
  replyingTo: any | null;
  setReplyingTo: (msg: any | null) => void;
  activeReactionPickerId: string | null;
  setActiveReactionPickerId: (id: string | null) => void;
  activeCustomEmojiMsgId: string | null;
  setActiveCustomEmojiMsgId: (id: string | null) => void;
  deleteConfirmMsgId: string | null;
  setDeleteConfirmMsgId: (id: string | null) => void;
  reactionUpdatingMsgId: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  fetchUsers: (search?: string) => Promise<void>;
  selectConvo: (convo: any) => Promise<void>;
  loadMoreMessages: (messageAreaRef: React.RefObject<HTMLDivElement | null>) => Promise<void>;
  handleSend: (inputText: string, setInputText: (v: string) => void, stopTyping: () => void) => void;
  handleSendDefaultEmoji: () => void;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  confirmDeleteMessage: (msgId: string) => void;
  updateChatSettings: (settings: any) => Promise<void> | void;
  scrollToMessage: (id: string, highlightClass: string) => void;
  getGroupedReactions: (reactions?: any[]) => any[];
  getRecipientInfo: (convo: any) => any;
  getRecipientDisplayName: (convo: any) => string;
  createGroup: (name: string, avatarUrl: string, participantIds: string[]) => Promise<any>;
  joinGroup: (inviteCode: string) => Promise<any>;
  leaveGroupConvo: (conversationId: string) => Promise<any>;
  deleteGroupConvo: (conversationId: string) => Promise<boolean>;

  // Typing hook
  isRecipientTyping: boolean;
  setIsRecipientTyping: (v: boolean) => void;
  recipientTypingText: string;
  setRecipientTypingText: (t: string) => void;
  handleInputChange: (val: string, setInputText: (v: string) => void) => void;
  stopTyping: () => void;

  // Media editor hook
  mediaEditor: any;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [recipientTypingText, setRecipientTypingText] = useState('');

  const chat = useChat(user, token, setIsRecipientTyping, setRecipientTypingText);
  const typing = useTyping(chat.activeConvo);
  const mediaEditor = useMediaEditor(
    chat.activeConvo,
    token,
    socket,
    chat.replyingTo,
    chat.setReplyingTo,
    chat.autoScrollBottomRef
  );

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        isRecipientTyping,
        setIsRecipientTyping,
        recipientTypingText,
        setRecipientTypingText,
        handleInputChange: typing.handleInputChange,
        stopTyping: typing.stopTyping,
        mediaEditor,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
