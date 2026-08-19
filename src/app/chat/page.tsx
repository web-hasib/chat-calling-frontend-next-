'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="hidden md:flex flex-grow flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3 text-center p-6 h-full">
      <MessageSquare size={48} strokeWidth={1} />
      <p>Select or start a conversation to begin messaging</p>
    </div>
  );
}
