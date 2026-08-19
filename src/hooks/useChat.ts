import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { showPushNotification, playMessageNotificationSound } from '../utils/notifications';

export function useChat(
  user: any,
  token: string | null,
  setIsRecipientTyping: (v: boolean) => void,
  setRecipientTypingText?: (t: string) => void
) {
  const { socket } = useSocket();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const autoScrollBottomRef = useRef(true);
  const prevScrollHeightRef = useRef<number | null>(null);
  const messageCacheRef = useRef<Record<string, { messages: any[]; hasMore: boolean; nextCursor: string | null }>>({});
  const [prependedMsgIds, setPrependedMsgIds] = useState<Set<string>>(new Set());
  const [isSwitchingThread, setIsSwitchingThread] = useState(false);

  // Reaction / delete UI state
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const [activeCustomEmojiMsgId, setActiveCustomEmojiMsgId] = useState<string | null>(null);
  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState<string | null>(null);
  const [reactionUpdatingMsgId, setReactionUpdatingMsgId] = useState<string | null>(null);

  // ---------- API ----------

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setConversations(await res.json());
    } catch (e) {
      console.error('Error fetching conversations', e);
    } finally {
      setConversationsLoading(false);
    }
  }, [token, API_URL]);

  const fetchUsers = useCallback(async (search?: string) => {
    try {
      const url = search
        ? `${API_URL}/chat/users?search=${encodeURIComponent(search)}`
        : `${API_URL}/chat/users`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch (e) {
      console.error('Error fetching users', e);
    }
  }, [token, API_URL]);

  const selectConvo = useCallback(async (convo: any) => {
    setActiveConvo(convo);
    setIsRecipientTyping(false);
    setReplyingTo(null);
    setActiveReactionPickerId(null);
    setActiveCustomEmojiMsgId(null);
    setDeleteConfirmMsgId(null);
    autoScrollBottomRef.current = true;

    const cached = messageCacheRef.current[convo.id];
    if (cached) {
      setMessages(cached.messages);
      setHasMore(cached.hasMore);
      setNextCursor(cached.nextCursor);
      setIsSwitchingThread(false);
    } else {
      setIsSwitchingThread(true);
      setMessages([]);
    }

    try {
      const res = await fetch(`${API_URL}/chat/conversation/${convo.id}/messages?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const fetchedMsgs: any[] = Array.isArray(data) ? data : data.messages || [];
      const fetchedHasMore = Array.isArray(data) ? false : data.hasMore || false;
      const fetchedNextCursor = Array.isArray(data) ? null : data.nextCursor || null;

      messageCacheRef.current[convo.id] = {
        messages: fetchedMsgs,
        hasMore: fetchedHasMore,
        nextCursor: fetchedNextCursor,
      };
      setMessages(fetchedMsgs);
      setHasMore(fetchedHasMore);
      setNextCursor(fetchedNextCursor);

      if (socket) socket.emit('mark-as-read', { conversationId: convo.id });
      setConversations((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, unreadCount: 0 } : c))
      );
      fetch(`${API_URL}/chat/conversation/${convo.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { });
    } catch (e) {
      console.error('Error fetching messages', e);
    } finally {
      setIsSwitchingThread(false);
    }
  }, [token, socket, API_URL, setIsRecipientTyping]);

  const loadMoreMessages = async (messageAreaRef: React.RefObject<HTMLDivElement | null>) => {
    if (!activeConvo || !hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    autoScrollBottomRef.current = false;
    const container = messageAreaRef.current;
    if (container) prevScrollHeightRef.current = container.scrollHeight;

    try {
      const res = await fetch(
        `${API_URL}/chat/conversation/${activeConvo.id}/messages?limit=20&cursor=${nextCursor}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newMsgs = Array.isArray(data) ? data : data.messages || [];
      const newNextCursor = Array.isArray(data) ? null : data.nextCursor;
      const newHasMore = Array.isArray(data) ? false : data.hasMore;

      const prependedIds = new Set<string>(newMsgs.map((m: any) => String(m.id)));
      setPrependedMsgIds(prependedIds);
      setMessages((prev) => [...newMsgs, ...prev]);
      setNextCursor(newNextCursor);
      setHasMore(newHasMore);

      requestAnimationFrame(() => {
        if (container && prevScrollHeightRef.current !== null) {
          container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
          prevScrollHeightRef.current = null;
        }
      });
    } catch (e) {
      console.error('Error loading older messages', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const startChatWithUser = async (
    targetUser: any,
    setActiveConvoFn: (c: any) => void,
    setShowUserList: (v: boolean) => void,
    setSearchQuery: (v: string) => void,
    setViewMode: (v: 'sidebar' | 'chat') => void
  ) => {
    try {
      const res = await fetch(`${API_URL}/chat/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: targetUser.id }),
      });
      if (!res.ok) throw new Error();
      const convo = await res.json();
      await fetchConversations();
      setActiveConvoFn(convo);
      setShowUserList(false);
      setSearchQuery('');
      setViewMode('chat');
      selectConvo(convo);
    } catch (e) {
      console.error('Error starting chat', e);
    }
  };

  // ---------- Message sending ----------

  const handleSend = (inputText: string, setInputText: (v: string) => void, stopTyping: () => void) => {
    if (!inputText.trim() || !activeConvo || !socket || !user) return;
    stopTyping();
    autoScrollBottomRef.current = true;

    const optimisticMsg = {
      id: 'pending-' + Date.now(),
      content: inputText,
      senderId: user.id,
      conversationId: activeConvo.id,
      createdAt: new Date().toISOString(),
      isRead: false,
      replyTo: replyingTo
        ? {
          id: replyingTo.id,
          content: replyingTo.content,
          fileUrl: replyingTo.fileUrl,
          fileType: replyingTo.fileType,
          sender: { id: replyingTo.senderId, name: replyingTo.sender?.name || 'User' },
        }
        : null,
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setConversations((prevConvos) => {
      const index = prevConvos.findIndex((c) => c.id === activeConvo.id);
      if (index !== -1) {
        const updated = [...prevConvos];
        const convo = { ...updated[index], messages: [optimisticMsg] };
        updated.splice(index, 1);
        return [convo, ...updated];
      }
      return prevConvos;
    });

    socket.emit('send-message', {
      conversationId: activeConvo.id,
      content: inputText,
      replyToId: replyingTo ? replyingTo.id : undefined,
    });

    setInputText('');
    setReplyingTo(null);
  };

  const handleSendDefaultEmoji = (size: 'small' | 'medium' | 'large' = 'small') => {
    const baseEmoji = activeConvo?.defaultEmoji || '👍';
    if (!activeConvo || !socket || !user) return;
    
    // Encode size in message content if not small (e.g. [BIG_EMOJI:large]👍)
    const emojiToSend = size === 'small' ? baseEmoji : `[BIG_EMOJI:${size}]${baseEmoji}`;
    
    autoScrollBottomRef.current = true;
    const optimisticMsg = {
      id: 'pending-' + Date.now(),
      content: emojiToSend,
      senderId: user.id,
      conversationId: activeConvo.id,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setConversations((prevConvos) => {
      const index = prevConvos.findIndex((c) => c.id === activeConvo.id);
      if (index !== -1) {
        const updated = [...prevConvos];
        const convo = { ...updated[index], messages: [optimisticMsg] };
        updated.splice(index, 1);
        return [convo, ...updated];
      }
      return prevConvos;
    });
    socket.emit('send-message', { conversationId: activeConvo.id, content: emojiToSend });
  };

  // ---------- Reactions / Delete ----------

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!socket || !activeConvo) return;
    setReactionUpdatingMsgId(messageId);
    socket.emit('toggle-reaction', { conversationId: activeConvo.id, messageId, emoji });
    setActiveReactionPickerId(null);
    setActiveCustomEmojiMsgId(null);
    setTimeout(() => {
      setReactionUpdatingMsgId((prevId) => (prevId === messageId ? null : prevId));
    }, 3000);
  };

  const confirmDeleteMessage = (targetMsgId: string, mode: 'me' | 'everyone' = 'me') => {
    if (!targetMsgId || !socket || !activeConvo) return;
    socket.emit('delete-message', { messageId: targetMsgId, conversationId: activeConvo.id, mode });
    setDeleteConfirmMsgId(null);
  };

  // ---------- Conversation Settings ----------

  const updateChatSettings = (data: {
    themeColor?: string;
    themeGradient?: string;
    bgImage?: string;
    defaultEmoji?: string;
    nicknameTargetUserId?: string;
    nickname?: string;
  }) => {
    if (!activeConvo || !socket) return;
    setActiveConvo((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      if (data.nicknameTargetUserId !== undefined) {
        updated.participants = prev.participants?.map((p: any) =>
          p.userId === data.nicknameTargetUserId ? { ...p, nickname: data.nickname || null } : p
        );
      }
      return updated;
    });
    socket.emit('update-conversation-settings', { conversationId: activeConvo.id, ...data });
  };

  // ---------- Helpers ----------

  const scrollToMessage = (msgId: string, highlightClass: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add(highlightClass);
      setTimeout(() => element.classList.remove(highlightClass), 1500);
    }
  };

  const getGroupedReactions = (reactions?: any[]) => {
    if (!reactions || reactions.length === 0) return [];
    const map = new Map<string, { emoji: string; count: number; userReacted: boolean }>();
    reactions.forEach((r) => {
      const existing = map.get(r.emoji);
      const isMine = r.userId === user?.id;
      if (existing) {
        existing.count += 1;
        if (isMine) existing.userReacted = true;
      } else {
        map.set(r.emoji, { emoji: r.emoji, count: 1, userReacted: isMine });
      }
    });
    return Array.from(map.values());
  };

  const getRecipientParticipant = (convo: any) =>
    convo?.participants?.find((p: any) => p.userId !== user?.id);

  const getRecipientInfo = (convo: any) => {
    const p = getRecipientParticipant(convo);
    return p?.user;
  };

  const getRecipientDisplayName = (convo: any) => {
    const p = getRecipientParticipant(convo);
    if (!p) return 'User';
    return p.nickname || p.user?.name || p.user?.username || 'User';
  };

  // ---------- Group Operations ----------

  const createGroup = async (name: string, avatarUrl: string, participantIds: string[]) => {
    try {
      const res = await fetch(`${API_URL}/chat/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, avatarUrl, participantIds }),
      });
      if (!res.ok) throw new Error('Failed to create group');
      const data = await res.json();
      await fetchConversations();
      return data.conversation;
    } catch (e) {
      console.error(e);
      alert('Error creating group chat');
      return null;
    }
  };

  const joinGroup = async (inviteCode: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/group/join/${inviteCode}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to join group');
      const data = await res.json();
      await fetchConversations();
      return data.conversation;
    } catch (e) {
      console.error(e);
      alert('Error joining group');
      return null;
    }
  };

  const leaveGroupConvo = async (conversationId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/conversation/${conversationId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to leave group');
      const data = await res.json();
      await fetchConversations();
      return data;
    } catch (e) {
      console.error(e);
      alert('Error leaving group');
      return null;
    }
  };

  const deleteGroupConvo = async (conversationId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/group/${conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete group');
      await fetchConversations();
      return true;
    } catch (e) {
      console.error(e);
      alert('Error deleting group');
      return false;
    }
  };

  // ---------- Socket effects ----------

  useEffect(() => {
    if (!socket) return;
    socket.on('new-message-notification', (msg: any) => {
      setConversations((prevConvos) => {
        const index = prevConvos.findIndex((c) => c.id === msg.conversationId);
        if (index === -1) { fetchConversations(); return prevConvos; }
        const updated = [...prevConvos];
        const isMsgFromMe = msg.senderId === user?.id;
        const currentActive = activeConvo?.id === msg.conversationId;
        const currentUnread = updated[index].unreadCount || 0;
        const newUnread = isMsgFromMe || currentActive ? 0 : currentUnread + 1;
        
        const convo = {
          ...updated[index],
          messages: [msg],
          unreadCount: newUnread,
        };
        updated.splice(index, 1);

        // Trigger Web Push Notification & Sound Tone if from another user
        if (!isMsgFromMe) {
          const senderName = msg.sender?.name || 'Someone';
          const msgContent = msg.fileUrl ? (msg.fileType === 'IMAGE' ? '📷 Sent an image' : '📎 Sent a file') : (msg.content || 'New message');
          
          // Sound tone
          playMessageNotificationSound();

          // Push alert
          showPushNotification(senderName, {
            body: msgContent,
            tag: `chat-${msg.conversationId}`,
            data: { conversationId: msg.conversationId }
          });
        }

        return [convo, ...updated];
      });
      setActiveConvo((current: any) => {
        if (current && current.id === msg.conversationId) {
          autoScrollBottomRef.current = true;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const optimisticIndex = prev.findIndex((m) => m.id === 'pending' || m.id.startsWith('pending-'));
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = msg;
              return updated;
            }
            return [...prev, msg];
          });
          if (socket) socket.emit('mark-as-read', { conversationId: current.id });
        }
        return current;
      });
    });
    return () => { socket.off('new-message-notification'); };
  }, [socket]);

  useEffect(() => {
    if (!socket || !activeConvo) return;
    const readEvent = `messages-read-${activeConvo.id}`;
    const reactionEvent = `reaction-updated-${activeConvo.id}`;
    const deleteMeEvent = `message-deleted-me-${activeConvo.id}`;
    const deleteEveryoneEvent = `message-deleted-everyone-${activeConvo.id}`;
    const convoUpdatedEvent = `conversation-updated-${activeConvo.id}`;

    socket.on(readEvent, (data: { readerId: string }) => {
      if (data.readerId !== user?.id) {
        setMessages((prev) => prev.map((m) => (m.senderId === user?.id ? { ...m, isRead: true } : m)));
      }
    });
    socket.on(reactionEvent, (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)));
      setReactionUpdatingMsgId((prevId) => (prevId === data.messageId ? null : prevId));
    });
    socket.on(deleteMeEvent, (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });
    socket.on(deleteEveryoneEvent, (data: { messageId: string }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id === data.messageId) {
          return {
            ...m,
            isDeleted: true,
            content: `${m.sender?.name || 'User'} removed this message`,
            fileUrl: null,
            fileType: null,
            reactions: []
          };
        }
        return m;
      }));
    });
    socket.on(convoUpdatedEvent, (data: { conversation: any }) => {
      if (data.conversation) {
        setActiveConvo(data.conversation);
        setConversations((prev) => prev.map((c) => (c.id === data.conversation.id ? { ...c, ...data.conversation } : c)));
      }
    });
    return () => {
      socket.off(readEvent);
      socket.off(reactionEvent);
      socket.off(deleteMeEvent);
      socket.off(deleteEveryoneEvent);
      socket.off(convoUpdatedEvent);
    };
  }, [socket, activeConvo, user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('conversation-list-updated', (data: { conversationId: string; conversation: any }) => {
      setConversations((prev) => prev.map((c) => (c.id === data.conversationId ? { ...c, ...data.conversation } : c)));
    });
    return () => { socket.off('conversation-list-updated'); };
  }, [socket]);

  useEffect(() => {
    const convoId = activeConvo?.id || activeConvo?._id;
    if (!socket || !convoId) {
      setIsRecipientTyping(false);
      if (setRecipientTypingText) setRecipientTypingText('');
      return;
    }
    const eventName = `typing-${convoId}`;
    const handleTypingEvent = (data: { userId: string; isTyping: boolean; text?: string }) => {
      const currentUserId = user?.id || user?._id;
      if (String(data.userId) !== String(currentUserId)) {
        setIsRecipientTyping(data.isTyping);
        if (setRecipientTypingText && data.text !== undefined) {
          setRecipientTypingText(data.text);
        }
      }
    };
    socket.on(eventName, handleTypingEvent);
    return () => { socket.off(eventName, handleTypingEvent); };
  }, [socket, activeConvo, user, setIsRecipientTyping, setRecipientTypingText]);

  // Auto-sync active conversation messages into memory cache
  useEffect(() => {
    if (activeConvo?.id && messages) {
      messageCacheRef.current[activeConvo.id] = { messages, hasMore, nextCursor };
    }
  }, [messages, activeConvo, hasMore, nextCursor]);

  return {
    conversations, setConversations,
    messages, setMessages,
    activeConvo, setActiveConvo,
    users,
    conversationsLoading,
    nextCursor,
    hasMore,
    loadingMore,
    prependedMsgIds,
    isSwitchingThread,
    autoScrollBottomRef,
    replyingTo, setReplyingTo,
    activeReactionPickerId, setActiveReactionPickerId,
    activeCustomEmojiMsgId, setActiveCustomEmojiMsgId,
    deleteConfirmMsgId, setDeleteConfirmMsgId,
    reactionUpdatingMsgId,
    fetchConversations,
    fetchUsers,
    selectConvo,
    loadMoreMessages,
    startChatWithUser,
    handleSend,
    handleSendDefaultEmoji,
    handleToggleReaction,
    confirmDeleteMessage,
    updateChatSettings,
    scrollToMessage,
    getGroupedReactions,
    getRecipientInfo,
    getRecipientDisplayName,
    getRecipientParticipant,
    createGroup,
    joinGroup,
    leaveGroupConvo,
    deleteGroupConvo,
  };
}
