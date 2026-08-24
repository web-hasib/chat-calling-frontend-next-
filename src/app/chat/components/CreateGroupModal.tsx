'use client';

import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useChatContext } from '../../../context/ChatContext';
import { useAuth } from '../../../context/AuthContext';

interface CreateGroupModalProps {
  users: any[];
  onClose: () => void;
  onSuccess: (convo: any) => void;
}

export function CreateGroupModal({ users, onClose, onSuccess }: CreateGroupModalProps) {
  const { createGroup } = useChatContext();
  const { token } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative text-[var(--text-primary)] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors border-none bg-transparent"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold">Create Group Chat</h3>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:border-[var(--accent-primary)] text-[var(--text-primary)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Group Icon (Avatar)</label>
          <div className="flex items-center gap-3">
            {groupAvatar ? (
              <img src={groupAvatar} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)]">No Icon</div>
            )}
            <label className="flex-grow py-2 px-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] rounded-xl text-xs font-semibold text-center cursor-pointer transition-colors text-[var(--text-primary)]">
              {uploadingAvatar ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingAvatar(true);
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/chat/upload`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    if (!res.ok) throw new Error('Upload failed');
                    const data = await res.json();
                    setGroupAvatar(data.fileUrl);
                  } catch {
                    alert('Failed to upload image.');
                  } finally {
                    setUploadingAvatar(false);
                  }
                }}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Select Members ({selectedUserIds.length})</label>
          <div className="overflow-y-auto flex flex-col gap-1 pr-1 max-h-[180px]">
            {users.map((u) => (
              <label key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-tertiary)] cursor-pointer text-sm transition-colors">
                <div className="flex items-center gap-2.5">
                  <img src={u.avatarUrl} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                  <span className="font-medium text-xs text-[var(--text-primary)]">{u.name}</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(u.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUserIds([...selectedUserIds, u.id]);
                    } else {
                      setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                    }
                  }}
                  className="accent-[var(--accent-primary)] cursor-pointer w-4 h-4"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          disabled={!groupName.trim() || selectedUserIds.length === 0 || creatingGroup}
          onClick={async () => {
            setCreatingGroup(true);
            const convo = await createGroup(groupName, groupAvatar, selectedUserIds);
            setCreatingGroup(false);
            if (convo) {
              onSuccess(convo);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
        >
          {creatingGroup ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}
