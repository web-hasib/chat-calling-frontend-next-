'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CallOverlay.module.css';
import { MessageSquare, Send, X as CloseIcon, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isMobile, setIsMobile] = useState(false);

  // Mobile Bottom Sheet Height State
  const [mobileHeight, setMobileHeight] = useState<number>(340);

  // Desktop Floating State
  const [desktopPos, setDesktopPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [desktopSize, setDesktopSize] = useState<{ width: number; height: number }>({ width: 340, height: 460 });
  const [isMaximized, setIsMaximized] = useState(false);

  // Drag tracking state
  const dragInfo = useRef<{
    mode: 'none' | 'mobile-height' | 'desktop-drag' | 'desktop-resize';
    startX: number;
    startY: number;
    startMobileHeight: number;
    startPosX: number;
    startPosY: number;
    startWidth: number;
    startHeight: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startMobileHeight: 340,
    startPosX: 0,
    startPosY: 0,
    startWidth: 340,
    startHeight: 460,
  });

  // Detect screen size
  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setMobileHeight(Math.min(window.innerHeight * 0.45, 360));
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // ─── Global Pointer/Touch Listeners for Seamless Dragging ───
  useEffect(() => {
    const handleMove = (e: PointerEvent | TouchEvent) => {
      if (dragInfo.current.mode === 'none') return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as PointerEvent).clientY;

      const deltaX = clientX - dragInfo.current.startX;
      const deltaY = clientY - dragInfo.current.startY;

      if (dragInfo.current.mode === 'mobile-height') {
        // Dragging top pill up increases height, dragging down decreases height
        const newHeight = dragInfo.current.startMobileHeight - deltaY;
        const maxH = window.innerHeight * 0.85;
        const minH = 180;

        if (newHeight < 130) {
          // Dragged all the way down -> close smoothly
          onClose();
          return;
        }

        setMobileHeight(Math.max(minH, Math.min(newHeight, maxH)));
      } else if (dragInfo.current.mode === 'desktop-drag' && !isMaximized) {
        setDesktopPos({
          x: dragInfo.current.startPosX + deltaX,
          y: dragInfo.current.startPosY + deltaY,
        });
      } else if (dragInfo.current.mode === 'desktop-resize' && !isMaximized) {
        const newW = Math.max(280, Math.min(dragInfo.current.startWidth - deltaX, window.innerWidth - 30));
        const newH = Math.max(260, Math.min(dragInfo.current.startHeight + deltaY, window.innerHeight - 90));
        setDesktopSize({ width: newW, height: newH });
      }
    };

    const handleUp = () => {
      if (dragInfo.current.mode !== 'none') {
        dragInfo.current.mode = 'none';
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isMaximized, onClose]);

  // ─── Mobile: Only the Top Drag Pill triggers height adjusting ───
  const startMobileHeightDrag = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

    dragInfo.current = {
      mode: 'mobile-height',
      startX: clientX,
      startY: clientY,
      startMobileHeight: mobileHeight,
      startPosX: desktopPos.x,
      startPosY: desktopPos.y,
      startWidth: desktopSize.width,
      startHeight: desktopSize.height,
    };
  }, [mobileHeight, desktopPos, desktopSize]);

  // ─── Desktop: Header drag moves floating window ───
  const startDesktopDrag = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if ('target' in e && (e.target as HTMLElement).closest('button')) return;
    if (isMobile) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

    dragInfo.current = {
      mode: 'desktop-drag',
      startX: clientX,
      startY: clientY,
      startMobileHeight: mobileHeight,
      startPosX: desktopPos.x,
      startPosY: desktopPos.y,
      startWidth: desktopSize.width,
      startHeight: desktopSize.height,
    };
  }, [isMobile, mobileHeight, desktopPos, desktopSize]);

  // ─── Desktop: Corner resize ───
  const startDesktopCornerResize = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

    dragInfo.current = {
      mode: 'desktop-resize',
      startX: clientX,
      startY: clientY,
      startMobileHeight: mobileHeight,
      startPosX: desktopPos.x,
      startPosY: desktopPos.y,
      startWidth: desktopSize.width,
      startHeight: desktopSize.height,
    };
  }, [mobileHeight, desktopPos, desktopSize]);

  if (!isOpen) return null;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        top: 'auto',
        width: '100vw',
        maxWidth: '100vw',
        margin: 0,
        height: `${mobileHeight}px`,
        maxHeight: '85dvh',
        minHeight: '220px',
        borderRadius: '24px 24px 0 0',
        borderBottom: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: '1px solid rgba(255, 255, 255, 0.16)',
        background: 'rgba(14, 16, 22, 0.97)',
        backdropFilter: 'blur(48px)',
        WebkitBackdropFilter: 'blur(48px)',
        zIndex: 10050,
        transform: 'none',
        boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
      }
    : isMaximized
    ? {
        position: 'fixed',
        top: '16px',
        right: '16px',
        bottom: '88px',
        width: 'min(420px, calc(100vw - 32px))',
        height: 'auto',
        maxHeight: 'calc(100vh - 104px)',
        background: 'rgba(14, 16, 22, 0.96)',
        backdropFilter: 'blur(48px)',
        WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '20px',
        transform: 'none',
        zIndex: 10050,
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
      }
    : {
        position: 'fixed',
        right: '16px',
        bottom: '88px',
        width: `${desktopSize.width}px`,
        height: `${desktopSize.height}px`,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100dvh - 104px)',
        background: 'rgba(14, 16, 22, 0.96)',
        backdropFilter: 'blur(48px)',
        WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '20px',
        transform: `translate3d(${desktopPos.x}px, ${desktopPos.y}px, 0)`,
        zIndex: 10050,
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
      };

  return (
    <div
      className={styles.chatPanel}
      style={panelStyle}
    >
      {/* Mobile Top Drag Sheet Pill Handle (Only drag point for mobile height resize) */}
      {isMobile && (
        <div
          className={styles.chatSheetDragPillArea}
          onPointerDown={startMobileHeightDrag}
          onTouchStart={startMobileHeightDrag}
          title="Drag up to expand, down to shrink"
        >
          <div className={styles.chatSheetDragPill} />
        </div>
      )}

      {/* Header */}
      <div
        className={styles.chatPanelHeader}
        onPointerDown={!isMobile ? startDesktopDrag : undefined}
        onTouchStart={!isMobile ? startDesktopDrag : undefined}
        style={{ cursor: !isMobile ? 'grab' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
          <MessageSquare size={16} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Meeting Chat</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isMobile && (
            <button
              type="button"
              className={styles.closeChatBtn}
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore size' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button
            type="button"
            className={styles.closeChatBtn}
            onClick={onClose}
            title="Close chat"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className={styles.chatPanelMessages} style={{ touchAction: 'pan-y' }}>
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

      {/* Input Row */}
      <div className={styles.chatPanelInputRow}>
        <input
          type="text"
          placeholder="Send a message..."
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          className={styles.chatPanelInput}
        />
        <button
          type="button"
          className={styles.chatSendBtn}
          onClick={onSendMessage}
        >
          <Send size={14} />
        </button>
      </div>

      {/* Desktop Corner Resize Handle */}
      {!isMobile && !isMaximized && (
        <div
          className={styles.chatResizeHandle}
          onPointerDown={startDesktopCornerResize}
          onTouchStart={startDesktopCornerResize}
          title="Drag to resize width and height"
        />
      )}
    </div>
  );
};
