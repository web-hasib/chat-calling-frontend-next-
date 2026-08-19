import { useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export function useTyping(activeConvo: any) {
  const { socket } = useSocket();
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const isTypingLocalRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (val: string, setInputText: (v: string) => void) => {
    setInputText(val);
    const convoId = activeConvo?.id || activeConvo?._id;
    if (!socket || !convoId) return;

    isTypingLocalRef.current = true;
    socket.emit('typing', { conversationId: convoId, isTyping: true, text: val });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingLocalRef.current = false;
      socket.emit('typing', { conversationId: convoId, isTyping: false, text: val });
    }, 2000);
  };

  const stopTyping = () => {
    const convoId = activeConvo?.id || activeConvo?._id;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket && convoId) {
      isTypingLocalRef.current = false;
      socket.emit('typing', { conversationId: convoId, isTyping: false, text: '' });
    }
  };

  return {
    isRecipientTyping,
    setIsRecipientTyping,
    isTypingLocalRef,
    typingTimeoutRef,
    handleInputChange,
    stopTyping,
  };
}
