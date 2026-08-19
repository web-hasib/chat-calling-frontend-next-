'use client';

import React from 'react';
import styles from './CallOverlay.module.css';
import { MessageSquare, Send, X as CloseIcon } from 'lucide-react';

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp?: string | number;
}

interface InMeetingChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId?: string;
  inputText: string;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const InMeetingChatPanel: React.FC<InMeetingChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  inputText,
  onInputChange,
  onSendMessage,
  messagesEndRef,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatPanelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} />
          <span>Meeting Chat</span>
        </div>
        <button className={styles.closeChatBtn} onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className={styles.chatPanelMessages}>
        {messages.length === 0 ? (
          <div className={styles.chatEmptyState}>
            Messages sent here are visible to everyone in the call.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`${styles.chatMsgItem} ${msg.senderId === currentUserId ? styles.chatMsgMine : ''}`}
            >
              <div className={styles.chatMsgSender}>
                {msg.senderId === currentUserId ? 'You' : msg.senderName}
              </div>
              <div className={styles.chatMsgText}>{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.chatPanelInputRow}>
        <input
          type="text"
          placeholder="Send a message..."
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          className={styles.chatPanelInput}
        />
        <button className={styles.chatSendBtn} onClick={onSendMessage}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
