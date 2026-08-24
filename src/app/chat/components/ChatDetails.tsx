'use client';

import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Edit3, Check, Copy, Upload, Trash2, Sparkles, X, UserPlus, LogOut, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { THEME_PRESETS, BG_PRESETS, DEFAULT_EMOJI_PRESETS } from '../constants';
import { useAuth } from '../../../context/AuthContext';
import { useChatContext } from '../../../context/ChatContext';

interface ChatDetailsProps {
  activeConvo: any;
  activeThemeColor: string;
  activeBgImage?: string;
  activeDefaultEmoji: string;
  theme: 'dark' | 'light';
  onlineUsers: Set<string>;
  editingParticipantId: string | null;
  setEditingParticipantId: (id: string | null) => void;
  nicknameInput: string;
  setNicknameInput: (v: string) => void;
  showDefaultEmojiPickerPopover: boolean;
  setShowDefaultEmojiPickerPopover: (v: boolean) => void;
  copiedHandle: boolean;
  setCopiedHandle: (v: boolean) => void;
  isUploadingBg: boolean;
  customUploadedBgs: string[];
  defaultEmojiPickerRef: React.RefObject<HTMLDivElement | null>;
  getRecipientInfo: (c: any) => any;
  getRecipientDisplayName: (c: any) => string;
  onClose: () => void;
  onSaveNickname: (userId: string) => void;
  updateChatSettings: (data: any) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteCustomBg: (url: string) => void;
}

export function ChatDetails({
  activeConvo, activeThemeColor, activeBgImage, activeDefaultEmoji,
  theme, onlineUsers,
  editingParticipantId, setEditingParticipantId,
  nicknameInput, setNicknameInput,
  showDefaultEmojiPickerPopover, setShowDefaultEmojiPickerPopover,
  copiedHandle, setCopiedHandle,
  isUploadingBg, customUploadedBgs, defaultEmojiPickerRef,
  getRecipientInfo, getRecipientDisplayName,
  onClose, onSaveNickname, updateChatSettings, onBgUpload, onDeleteCustomBg,
}: ChatDetailsProps) {
  const { user: currentUser, token } = useAuth();
  const { fetchConversations, leaveGroupConvo, deleteGroupConvo } = useChatContext();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const recipient = getRecipientInfo(activeConvo);
  const isOnline = recipient ? onlineUsers.has(recipient.id) : false;
  const handleName = recipient?.username || recipient?.email?.split('@')[0] || recipient?.name?.toLowerCase().replace(/\s+/g, '') || 'user';

  // Group specific states
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(activeConvo?.name || '');
  const [isEditingGroupAvatar, setIsEditingGroupAvatar] = useState(false);
  const [groupAvatarInput, setGroupAvatarInput] = useState(activeConvo?.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  // Add member states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // Get current user role in activeConvo
  const myParticipantRecord = activeConvo?.participants?.find((p: any) => p.userId === currentUser?.id);
  const myRole = myParticipantRecord?.role || 'MEMBER';

  useEffect(() => {
    if (activeConvo) {
      setGroupNameInput(activeConvo.name || '');
      setGroupAvatarInput(activeConvo.avatarUrl || '');
    }
  }, [activeConvo]);

  // Fetch users for group member addition
  const fetchAllUsersForAdd = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        // Filter out users already in conversation
        const existingUserIds = new Set(activeConvo.participants?.map((p: any) => p.userId));
        setAllUsersList(list.filter((u: any) => !existingUserIds.has(u.id)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateGroupSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/group/${activeConvo.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupNameInput, avatarUrl: groupAvatarInput })
      });
      if (res.ok) {
        setIsEditingGroupName(false);
        setIsEditingGroupAvatar(false);
        await fetchConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (targetUserId: string, role: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/group/${activeConvo.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, role })
      });
      if (res.ok) {
        await fetchConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/group/${activeConvo.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserIds: [targetUserId] })
      });
      if (res.ok) {
        await fetchConversations();
        setShowAddMemberModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      const res = await fetch(`${API_URL}/chat/group/${activeConvo.id}/member/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      show: true,
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group?',
      onConfirm: async () => {
        const res = await leaveGroupConvo(activeConvo.id);
        if (res) {
          onClose();
        }
      }
    });
  };

  const handleDeleteGroup = () => {
    setConfirmModal({
      show: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? All messages and configurations will be permanently lost.',
      onConfirm: async () => {
        const ok = await deleteGroupConvo(activeConvo.id);
        if (ok) {
          onClose();
        }
      }
    });
  };

  const renderRoleIcon = (role: string) => {
    switch (role) {
      case 'CREATOR':
        return <span title="Creator"><ShieldAlert size={14} className="text-red-500" /></span>;
      case 'ADMIN':
        return <span title="Admin"><ShieldCheck size={14} className="text-blue-500" /></span>;
      case 'MODERATOR':
        return <span title="Moderator"><Shield size={14} className="text-green-500" /></span>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay - clicking outside closes details drawer */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="w-[320px] max-w-[85vw] border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col h-full overflow-y-auto z-50 fixed inset-y-0 right-0 md:relative md:inset-auto md:w-[300px] shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:px-5 border-b border-[var(--border-color)] flex items-center justify-between h-[72px] shrink-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Chat Details</h3>
          <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

      <div className="p-[18px] flex flex-col gap-5 flex-1">
        {/* Profile Card */}
        <div className="flex flex-col items-center gap-2.5 text-center pb-4 border-b border-[var(--border-color)]">
          <img
            src={activeConvo.isGroup ? (activeConvo.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=100&q=80') : recipient?.avatarUrl}
            alt={activeConvo.isGroup ? activeConvo.name : getRecipientDisplayName(activeConvo)}
            className="w-[72px] h-[72px] rounded-full object-cover border-2"
            style={{ borderColor: activeThemeColor }}
          />
          <div className="w-full flex flex-col items-center">
            {activeConvo.isGroup ? (
              <div className="w-full flex flex-col items-center gap-2">
                {isEditingGroupName ? (
                  <div className="flex gap-1.5 items-center w-full">
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      className="flex-grow px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] outline-none"
                    />
                    <button onClick={handleUpdateGroupSettings} className="p-1 bg-green-500 rounded text-white cursor-pointer"><Check size={14} /></button>
                    <button onClick={() => setIsEditingGroupName(false)} className="p-1 bg-red-500 rounded text-white cursor-pointer"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-base font-semibold text-[var(--text-primary)]">{activeConvo.name}</span>
                    {(myRole === 'CREATOR' || myRole === 'ADMIN' || myRole === 'MODERATOR') && (
                      <button onClick={() => setIsEditingGroupName(true)} className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"><Edit3 size={14} /></button>
                    )}
                  </div>
                )}
                {isEditingGroupAvatar ? (
                  <div className="flex flex-col gap-2 w-full mt-1.5 animate-in fade-in duration-200">
                    <label className="flex items-center justify-center gap-1.5 w-full p-2 bg-transparent border border-[var(--border-color)] rounded-md text-[var(--text-primary)] text-[11px] font-semibold cursor-pointer hover:bg-[var(--border-color)] transition-colors">
                      <Upload size={13} />
                      <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingAvatar(true);
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
                            
                            // Call API to save this uploaded image as group avatar
                            const saveRes = await fetch(`${API_URL}/chat/group/${activeConvo.id}/settings`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ name: activeConvo.name, avatarUrl: data.fileUrl })
                            });
                            if (saveRes.ok) {
                              setIsEditingGroupAvatar(false);
                              await fetchConversations();
                            }
                          } catch (e) {
                            alert('Failed to upload group icon.');
                          } finally {
                            setIsUploadingAvatar(false);
                          }
                        }}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </label>
                    <button onClick={() => setIsEditingGroupAvatar(false)} className="text-[10px] text-red-500 font-semibold cursor-pointer py-1.5 border border-red-500/20 rounded hover:bg-red-500/10 transition-colors">Cancel</button>
                  </div>
                ) : (
                  (myRole === 'CREATOR' || myRole === 'ADMIN' || myRole === 'MODERATOR') && (
                    <button onClick={() => setIsEditingGroupAvatar(true)} className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border border-[var(--border-color)] px-2 py-0.5 rounded cursor-pointer mt-1">Change Group Icon</button>
                  )
                )}
              </div>
            ) : (
              <>
                <div className="text-base font-semibold text-[var(--text-primary)]">{getRecipientDisplayName(activeConvo)}</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-secondary)]">@{handleName}</span>
                  <button
                    className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-0.5 rounded-sm inline-flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(`@${handleName}`);
                      setCopiedHandle(true);
                      setTimeout(() => setCopiedHandle(false), 1500);
                    }}
                    title="Copy handle"
                  >
                    {copiedHandle ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  </button>
                  <span className="text-[var(--text-muted)] mx-0.5">•</span>
                  <span className="text-xs text-[var(--text-muted)]">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Group Actions (Invite Link, Add Members) */}
        {activeConvo.isGroup && (
          <div className="flex flex-col gap-2.5 pb-4 border-b border-[var(--border-color)]">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Group Invitation Code</div>
            <div className="flex items-center justify-between bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border-color)]">
              <span className="font-mono text-sm tracking-wider font-semibold">{activeConvo.inviteCode}</span>
              <button
                className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => {
                  navigator.clipboard.writeText(activeConvo.inviteCode);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 1500);
                }}
              >
                {copiedInvite ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
            {(myRole === 'CREATOR' || myRole === 'ADMIN' || myRole === 'MODERATOR') && (
              <button
                onClick={() => { fetchAllUsersForAdd(); setShowAddMemberModal(true); }}
                className="w-full py-2 flex items-center justify-center gap-1.5 border border-[var(--border-color)] rounded-lg text-xs font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] transition-all"
              >
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>
        )}

        {/* Participants/Members Section */}
        <div className="flex flex-col gap-2.5">
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            {activeConvo.isGroup ? 'Group Members' : 'Nicknames'}
          </div>
          <div className="flex flex-col gap-2">
            {activeConvo.participants?.map((p: any) => {
              const isEditing = editingParticipantId === p.userId;
              const isMe = p.userId === currentUser?.id;
              
              // Member administration permissions check
              const role = p.role || 'MEMBER';
              const canRemove = activeConvo.isGroup && !isMe && (
                (myRole === 'CREATOR') ||
                (myRole === 'ADMIN' && role !== 'CREATOR' && role !== 'ADMIN') ||
                (myRole === 'MODERATOR' && role === 'MEMBER')
              );

              const canChangeRole = activeConvo.isGroup && !isMe && myRole === 'CREATOR';

              return (
                <div key={p.id} className="flex flex-col gap-1.5 bg-[var(--bg-tertiary)] p-2.5 rounded-md border border-[var(--border-color)]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={p.user?.avatarUrl} alt={p.user?.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <div className="truncate min-w-0">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {p.nickname || p.user?.name || p.user?.username}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {renderRoleIcon(role)}
                          {activeConvo.isGroup && (
                            <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                              {role.charAt(0) + role.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Change Role (For Creators only) */}
                      {canChangeRole && (
                        <select
                          value={role}
                          onChange={(e) => handleUpdateRole(p.userId, e.target.value)}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[10px] text-[var(--text-primary)] p-0.5 outline-none cursor-pointer"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      )}
                      
                      {/* Nickname Trigger */}
                      <button
                        className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 rounded hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        onClick={() => {
                          if (isEditing) {
                            setEditingParticipantId(null);
                          } else {
                            setEditingParticipantId(p.userId);
                            setNicknameInput(p.nickname || '');
                          }
                        }}
                      >
                        <Edit3 size={13} />
                      </button>

                      {/* Remove Member */}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(p.userId)}
                          className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 rounded hover:text-red-400 hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-1.5 items-center mt-1 w-full">
                      <input
                        type="text"
                        placeholder="Enter nickname..."
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        className="flex-grow min-w-0 h-7 px-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] outline-none"
                      />
                      <button
                        className="shrink-0 h-7 px-2.5 bg-[var(--accent-primary)] border-none text-white rounded text-[10px] font-medium cursor-pointer flex items-center justify-center"
                        onClick={() => onSaveNickname(p.userId)}
                        style={{ background: activeThemeColor }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Theme Settings (Only editable by Group Creator/Admin/Moderator or in 1v1) */}
        {(!activeConvo.isGroup || myRole === 'CREATOR' || myRole === 'ADMIN' || myRole === 'MODERATOR') && (
          <>
            {/* Theme Colors Section */}
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-semibold text-[var(--text-primary)]">Chat Theme</div>
              <div className="grid grid-cols-4 gap-2">
                {THEME_PRESETS.map((preset) => {
                  const isActive = activeConvo.themeColor === preset.color;
                  return (
                    <button
                      key={preset.id}
                      className={`w-full h-9 rounded-md border border-[var(--border-color)] cursor-pointer flex items-center justify-center transition-all ${isActive ? 'scale-[1.05]' : ''}`}
                      style={{ backgroundColor: preset.color }}
                      onClick={() => updateChatSettings({ themeColor: preset.color, themeGradient: '' })}
                      title={preset.label}
                    >
                      {isActive && <Check size={16} color="white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Default Emoji Section */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="text-xs font-semibold text-[var(--text-primary)]">Quick Emoji</div>
                <span className="text-lg">{activeDefaultEmoji}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {DEFAULT_EMOJI_PRESETS.map((emoji) => {
                  const isActive = activeDefaultEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      className={`w-full h-8 rounded-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)] cursor-pointer text-sm flex items-center justify-center transition-all ${isActive ? 'text-white border-transparent' : 'text-inherit'}`}
                      onClick={() => updateChatSettings({ defaultEmoji: emoji })}
                      style={isActive ? { background: activeThemeColor } : undefined}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <button
                  className="flex items-center justify-center gap-1.5 w-full p-2 bg-transparent border border-[var(--border-color)] rounded-md text-[var(--text-primary)] text-xs font-medium cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                  onClick={() => setShowDefaultEmojiPickerPopover(!showDefaultEmojiPickerPopover)}
                >
                  <Sparkles size={14} />
                  <span>Choose Custom Emoji</span>
                </button>
                {showDefaultEmojiPickerPopover && (
                  <div className="absolute bottom-11 right-0 left-0 w-full z-[100] shadow-lg rounded-md overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)]" ref={defaultEmojiPickerRef}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        updateChatSettings({ defaultEmoji: emojiData.emoji });
                        setShowDefaultEmojiPickerPopover(false);
                      }}
                      theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                      searchDisabled={false}
                      width="100%"
                      height={320}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Chat Background Image Section */}
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-semibold text-[var(--text-primary)]">Background Wallpaper</div>
              <div className="grid grid-cols-2 gap-2">
                {BG_PRESETS.map((bg) => {
                  const isActive = (activeBgImage || '') === bg.url;
                  const hasImage = Boolean(bg.url);
                  return (
                    <div
                      key={bg.id}
                      className={`relative h-[68px] rounded-md border-2 border-transparent cursor-pointer flex flex-col justify-end p-2 bg-cover bg-center overflow-hidden transition-all ${hasImage ? '' : 'bg-[var(--bg-tertiary)]'}`}
                      style={{
                        backgroundImage: hasImage ? `url(${bg.url})` : 'none',
                        borderColor: isActive ? activeThemeColor : undefined,
                      }}
                      onClick={() => updateChatSettings({ bgImage: bg.url })}
                    >
                      <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded-sm line-clamp-1 w-fit">{bg.label}</span>
                    </div>
                  );
                })}
              </div>

              <label className="flex items-center justify-center gap-1.5 w-full p-2 bg-transparent border border-[var(--border-color)] rounded-md text-[var(--text-primary)] text-xs font-medium cursor-pointer hover:bg-[var(--border-color)] transition-colors">
                <Upload size={14} />
                <span>{isUploadingBg ? 'Uploading Image...' : 'Upload Background Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onBgUpload}
                  className="hidden"
                  disabled={isUploadingBg}
                />
              </label>

              {customUploadedBgs.length > 0 && (
                <div className="flex flex-col gap-2 mt-1.5">
                  <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                    Uploaded Wallpapers
                  </div>
                  {customUploadedBgs.map((url, idx) => {
                    const isActive = activeBgImage === url;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md"
                        style={isActive ? { borderColor: activeThemeColor } : undefined}
                      >
                        <div
                          className="flex items-center gap-2.5 min-w-0"
                          onClick={() => updateChatSettings({ bgImage: url })}
                          style={{ cursor: 'pointer', flex: 1 }}
                        >
                          <img src={url} alt="Custom Background" className="w-11 h-8 rounded-sm object-cover border border-[var(--border-color)] shrink-0" />
                          <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                            {isActive ? 'Active Custom Image' : `Uploaded Wallpaper ${idx + 1}`}
                          </span>
                        </div>
                        <button
                          className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1 rounded-sm flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-red-400 transition-colors"
                          onClick={() => onDeleteCustomBg(url)}
                          title="Delete uploaded image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {Boolean(activeBgImage) && (
                <button
                  className="flex items-center justify-center gap-1.5 w-full p-2 bg-transparent border border-[var(--border-color)] rounded-md text-red-500 text-xs font-semibold cursor-pointer hover:bg-red-500/10 transition-colors"
                  onClick={() => updateChatSettings({ bgImage: '' })}
                >
                  <X size={14} />
                  <span>Clear Wallpaper (Use Default)</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Leave / Delete Group Section */}
        {activeConvo.isGroup && (
          <div className="flex flex-col gap-2.5 mt-4">
            <button
              onClick={handleLeaveGroup}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/35 text-red-500 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              <LogOut size={14} /> Leave Group
            </button>
            {(myRole === 'CREATOR' || myRole === 'ADMIN') && (
              <button
                onClick={handleDeleteGroup}
                className="w-full py-2.5 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-[0_2px_8px_rgba(239,68,68,0.25)]"
              >
                <Trash2 size={14} /> Delete Group
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            className="w-[360px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col gap-4 shadow-2xl relative text-[var(--text-primary)] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer" onClick={() => setShowAddMemberModal(false)}>
              <X size={18} />
            </button>
            <h3 className="text-base font-bold">Add Group Member</h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user..."
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-xs outline-none focus:border-[var(--accent-primary)] text-[var(--text-primary)]"
            />
            <div className="overflow-y-auto flex flex-col gap-1.5 max-h-[220px]">
              {allUsersList
                .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-tertiary)] text-xs">
                    <div className="flex items-center gap-2">
                      <img src={u.avatarUrl} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <span>{u.name || u.username}</span>
                    </div>
                    <button
                      onClick={() => handleAddMember(u.id)}
                      className="px-3 py-1 bg-[var(--accent-primary)] text-white border-none rounded text-[10px] font-semibold cursor-pointer"
                      style={{ background: activeThemeColor }}
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirmation Modal ── */}
      {confirmModal.show && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        >
          <div
            className="w-[320px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 shadow-2xl relative text-[var(--text-primary)] animate-in zoom-in-95 ease-out duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-red-500">{confirmModal.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-primary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}
