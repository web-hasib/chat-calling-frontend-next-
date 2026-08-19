'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EditProfileModalProps {
  editName: string;
  setEditName: (v: string) => void;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editAvatarUrl: string;
  uploadingAvatar: boolean;
  profileUpdating: boolean;
  profileError: string | null;
  profileSuccess: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EditProfileModal({
  editName, setEditName,
  editUsername, setEditUsername,
  editAvatarUrl, uploadingAvatar, profileUpdating,
  profileError, profileSuccess,
  onClose, onSubmit, onAvatarUpload,
}: EditProfileModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] p-6 rounded-lg gap-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[var(--border-color)] pb-3">
          <DialogTitle className="text-lg font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <label className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-colors group">
            <img
              src={editAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${editUsername || 'default'}`}
              alt="Avatar Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold">
              <span>{uploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              className="hidden"
              disabled={uploadingAvatar}
            />
          </label>
          <div className="text-[11px] text-[var(--text-muted)] text-center">
            Accepts JPG, PNG, GIF. Uploads to secure hosting.
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {profileError && (
            <div className="p-3 rounded-md text-xs bg-red-500/10 border border-red-500/20 text-red-400">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 rounded-md text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Profile updated successfully!
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Display Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
              required
              disabled={profileUpdating}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Username</label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
              pattern="^[a-zA-Z0-9_]{3,15}$"
              title="Username must be 3-15 alphanumeric characters or underscores"
              required
              disabled={profileUpdating}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              className="flex-1 py-2 px-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-semibold rounded-md hover:bg-[var(--border-color)] transition-colors"
              onClick={onClose}
              disabled={profileUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-2 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={profileUpdating || uploadingAvatar}
            >
              {profileUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
