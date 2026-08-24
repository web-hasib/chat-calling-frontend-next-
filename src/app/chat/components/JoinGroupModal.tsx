'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useChatContext } from '../../../context/ChatContext';

interface JoinGroupModalProps {
  onClose: () => void;
  onSuccess: (convo: any) => void;
}

export function JoinGroupModal({ onClose, onSuccess }: JoinGroupModalProps) {
  const { joinGroup } = useChatContext();
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative text-[var(--text-primary)] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors border-none bg-transparent"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold">Join Group by Invite</h3>
        <p className="text-xs text-[var(--text-secondary)]">Enter the 8-character invite code shared by the group admin.</p>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Invite Code</label>
          <input
            type="text"
            value={inviteCodeInput}
            onChange={(e) => { setInviteCodeInput(e.target.value); setErrorMsg(''); }}
            placeholder="e.g. A1B2C3D4"
            className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:border-[var(--accent-primary)] text-[var(--text-primary)] uppercase tracking-wider font-mono text-center"
          />
          {errorMsg && <p className="text-xs text-rose-500">{errorMsg}</p>}
        </div>

        <button
          disabled={!inviteCodeInput.trim() || joining}
          onClick={async () => {
            setJoining(true);
            setErrorMsg('');
            try {
              const convo = await joinGroup(inviteCodeInput.trim().toUpperCase());
              setJoining(false);
              if (convo) {
                onSuccess(convo);
              } else {
                setErrorMsg('Invalid or expired invite code.');
              }
            } catch (err: any) {
              setJoining(false);
              setErrorMsg(err.message || 'Failed to join group.');
            }
          }}
          className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
        >
          {joining ? 'Joining...' : 'Join Group'}
        </button>
      </div>
    </div>
  );
}
