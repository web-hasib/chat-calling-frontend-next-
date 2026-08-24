'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Users, Settings, Sun, Moon, LogOut, Plus, Link2, X, GroupIcon } from 'lucide-react';
import { useChatContext } from '../../../context/ChatContext';
import { useAuth } from '../../../context/AuthContext';
import { CreateGroupModal } from './CreateGroupModal';
import { JoinGroupModal } from './JoinGroupModal';
import { SettingsPage } from './SettingsPage';
import { formatMessageSnippet } from '../../../utils/formatSnippet';

interface SidebarProps {
  user: any;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  showUserList: boolean;
  setShowUserList: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  theme: 'dark' | 'light';
  toggleTheme: (t: 'dark' | 'light') => void;
  openEditProfile: () => void;
  logout: () => void;
  searchQuery: string;
  users: any[];
  conversations: any[];
  conversationsLoading: boolean;
  activeConvo: any;
  onlineUsers: Set<string>;
  startChatWithUser: (u: any) => void;
  selectConvo: (c: any) => void;
  getRecipientInfo: (c: any) => any;
  getRecipientDisplayName: (c: any) => string;
  currentUserId: string;
  updateProfile: (data: {
    pushNotificationsEnabled?: boolean;
    soundEffectsEnabled?: boolean;
    messageTone?: string;
    callTone?: string;
  }) => Promise<void>;
}

export function Sidebar({
  user, sidebarCollapsed, setSidebarCollapsed,
  showUserList, setShowUserList, setSearchQuery,
  showSettings, setShowSettings,
  theme, toggleTheme, openEditProfile, logout,
  searchQuery, users, conversations, conversationsLoading,
  activeConvo, onlineUsers,
  startChatWithUser, selectConvo, getRecipientInfo, getRecipientDisplayName,
  currentUserId, updateProfile,
}: SidebarProps) {
  const { createGroup, joinGroup } = useChatContext();
  const { token } = useAuth();

  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  const [showJoinGroup, setShowJoinGroup] = React.useState(false);
  const [groupName, setGroupName] = React.useState('');
  const [groupAvatar, setGroupAvatar] = React.useState('');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'unread' | 'groups'>('all');

  // Compute counts for filter pills
  const unreadConvosCount = React.useMemo(() => {
    return conversations.filter((c) => (c.unreadCount || 0) > 0).length;
  }, [conversations]);

  const groupsCount = React.useMemo(() => {
    return conversations.filter((c) => c.isGroup).length;
  }, [conversations]);

  // Filter conversations list
  const filteredConversations = React.useMemo(() => {
    return conversations.filter((convo) => {
      if (activeFilter === 'unread') {
        return (convo.unreadCount || 0) > 0;
      }
      if (activeFilter === 'groups') {
        return convo.isGroup;
      }
      return true;
    });
  }, [conversations, activeFilter]);

  // Mobile bottom navigation active tab synced with props
  const [mobileTab, setMobileTab] = React.useState<'chats' | 'users' | 'groups' | 'settings'>('chats');

  React.useEffect(() => {
    if (showSettings) {
      setMobileTab('settings');
    } else if (showUserList) {
      setMobileTab('users');
    } else if (activeFilter === 'groups') {
      setMobileTab('groups');
    } else {
      setMobileTab('chats');
    }
  }, [showSettings, showUserList, activeFilter]);

  // Handle bottom tab change
  const handleMobileTabChange = (tab: 'chats' | 'users' | 'groups' | 'settings') => {
    setMobileTab(tab);
    if (tab === 'chats') {
      setShowUserList(false);
      setActiveFilter('all');
      setShowSettings(false);
    } else if (tab === 'users') {
      setShowUserList(true);
      setShowSettings(false);
    } else if (tab === 'groups') {
      setShowUserList(false);
      setActiveFilter('groups');
      setShowSettings(false);
    } else if (tab === 'settings') {
      setShowSettings(true);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transition-all duration-200 shrink-0 w-full md:w-auto ${sidebarCollapsed ? 'md:w-[76px]' : 'md:w-[320px]'}`}>
      
      {/* ── Top Header ── */}
      <div className={`flex items-center justify-between border-b border-[var(--border-color)] ${sidebarCollapsed ? 'p-4 flex-col gap-4' : 'px-5 py-4.5'}`}>
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'flex-col text-center' : ''}`}>
          <div
            className="relative cursor-pointer"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings & Profile"
          >
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--accent-primary)]/30" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--accent-success)] border-2 border-[var(--bg-secondary)] rounded-full" />
          </div>
          <div className={sidebarCollapsed ? 'hidden' : ''}>
            <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">{user.name || 'Chats'}</h2>
            <div className="text-[11px] text-[var(--text-secondary)]">@{user.username || 'user'}</div>
          </div>
        </div>

        {/* Top Header Actions (Clean & Minimal) */}
        <div className="flex gap-1.5 items-center relative" style={{ flexDirection: sidebarCollapsed ? 'column' : 'row' }}>
          <button
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Desktop quick create group */}
          {!sidebarCollapsed && (
            <button
              className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              onClick={() => setShowCreateGroup(true)}
              title="Create Group Chat"
            >
              <Plus size={18} />
            </button>
          )}

          {/* Settings trigger (Desktop only - mobile has bottom tab) */}
          <button
            className={`hidden md:flex w-8 h-8 rounded-full items-center justify-center transition-colors cursor-pointer ${
              showSettings
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings & Preferences"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── Mobile Settings View or Standard Search & Convo List ── */}
      {showSettings ? (
        <div className="md:hidden flex-grow flex flex-col overflow-y-auto">
          <SettingsPage
            user={user}
            theme={theme}
            toggleTheme={toggleTheme}
            openEditProfile={openEditProfile}
            openCreateGroup={() => setShowCreateGroup(true)}
            openJoinGroup={() => setShowJoinGroup(true)}
            logout={logout}
            onClose={() => setShowSettings(false)}
            updateProfile={updateProfile}
          />
        </div>
      ) : (
        <>
          {/* ── Search & Filter Pill Bar ── */}
          <div className={`p-3 border-b border-[var(--border-color)] flex flex-col gap-2.5 ${sidebarCollapsed ? 'hidden' : ''}`}>
            <input
              type="text"
              placeholder="Search by username, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)] transition-colors placeholder:text-[var(--text-secondary)]"
            />

            {/* Messenger-style Filter Tabs (All / Unread / Groups) */}
            {!showUserList && !searchQuery && (
              <div className="flex items-center gap-1.5 px-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    activeFilter === 'all'
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-500'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('unread')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    activeFilter === 'unread'
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-500'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Unread</span>
                  {unreadConvosCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-bold shadow-sm">
                      {unreadConvosCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('groups')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    activeFilter === 'groups'
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-500'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Groups</span>
                  {groupsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[var(--border-color)] text-[var(--text-secondary)] rounded-full text-[10px] font-bold">
                      {groupsCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Conversation / User List (Hidden when showSettings is active on mobile) ── */}
      <div className={`flex-grow overflow-y-auto p-3 pb-20 md:pb-3 ${showSettings ? 'hidden md:block' : ''}`}>
        {showUserList || searchQuery ? (
          users.length > 0 ? (
            users.map((u) => {
              const isOnline = onlineUsers.has(u.id);
              return (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors mb-1 ${sidebarCollapsed ? 'justify-center' : ''}`} onClick={() => startChatWithUser(u)}>
                  <div className={`flex items-center gap-3 min-w-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className={sidebarCollapsed ? 'hidden' : 'min-w-0'}>
                      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">@{u.username} • {u.email}</div>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--accent-success)]' : 'bg-[var(--text-muted)]'} ${sidebarCollapsed ? 'absolute ml-5 mt-5 border-2 border-[var(--bg-secondary)]' : ''}`} />
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-sm text-[var(--text-secondary)]">No users found</div>
          )
        ) : conversationsLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center p-3 gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse shrink-0" />
              <div className={`flex-grow flex flex-col gap-1.5 ${sidebarCollapsed ? 'hidden' : ''}`}>
                <div className="w-[40%] h-2.5 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                <div className="w-[60%] h-2 bg-[var(--bg-tertiary)] rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((convo) => {
            const recipient = getRecipientInfo(convo);
            if (!recipient && !convo.isGroup) return null;
            const displayName = convo.isGroup ? convo.name : getRecipientDisplayName(convo);
            const isOnline = convo.isGroup ? false : onlineUsers.has(recipient.id);
            const isActive = activeConvo?.id === convo.id;
            const unreadCount = convo.unreadCount || 0;
            const hasUnread = unreadCount > 0;

            return (
              <div
                key={convo.id}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors mb-1 ${
                  isActive ? 'bg-[var(--bg-tertiary)] border-l-3 border-[var(--accent-primary)]' : ''
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                onClick={() => selectConvo(convo)}
                style={isActive && convo.themeColor ? { borderLeftColor: convo.themeColor } : undefined}
              >
                <div className={`flex items-center gap-3 min-w-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                  <div className="relative shrink-0">
                    <img
                      src={
                        convo.isGroup
                          ? convo.avatarUrl ||
                            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=100&q=80'
                          : recipient.avatarUrl
                      }
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    {!convo.isGroup && isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--accent-success)] border-2 border-[var(--bg-secondary)] rounded-full" />
                    )}
                  </div>

                  <div className={sidebarCollapsed ? 'hidden' : 'min-w-0 flex-1'}>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-sm truncate ${
                          hasUnread
                            ? 'font-bold text-[var(--text-primary)]'
                            : 'font-semibold text-[var(--text-primary)]'
                        }`}
                      >
                        {displayName}
                      </span>
                    </div>

                    <div
                      className={`text-xs truncate max-w-[170px] ${
                        hasUnread
                          ? 'font-semibold text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {convo.messages[0]
                        ? `${
                            convo.messages[0].senderId === currentUserId
                              ? 'You: '
                              : convo.isGroup
                              ? `${convo.messages[0].sender?.name || 'User'}: `
                              : ''
                          }${formatMessageSnippet(convo.messages[0])}`
                        : 'No messages yet'}
                    </div>
                  </div>
                </div>

                {/* Right badges: Unread Badge or Online Dot */}
                {!sidebarCollapsed && hasUnread ? (
                  <div className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-500 text-white rounded-full text-[11px] font-bold shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                ) : !sidebarCollapsed && !convo.isGroup && (
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-[var(--accent-success)]' : 'bg-transparent'
                    }`}
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
            {activeFilter === 'unread' ? (
              <>
                <span className="text-lg">🎉</span>
                <span>You have caught up with all messages!</span>
              </>
            ) : activeFilter === 'groups' ? (
              <>
                <span className="text-lg"><GroupIcon/></span>
                <span>No group chats found.</span>
              </>
            ) : (
              <span>No conversations active. Click the user icon above to start chatting!</span>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile App-Style Glassy Bottom Bar (/10 Opacity + Backdrop Blur) ── */}
      <div className={`md:hidden absolute bottom-0 left-0 right-0 h-[60px] bg-[var(--bg-secondary)] border-t border-[var(--border-color)]/30 z-40 shrink-0 flex items-center pointer-events-auto ${sidebarCollapsed ? 'hidden' : ''}`}>
        
        {/* Simple Centered Horizontal Underline Indicator */}
        <div
          className="absolute bottom-0 h-[3px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 flex justify-center"
          style={{
            width: '25%',
            left: `${
              mobileTab === 'chats' && !showUserList
                ? 0
                : showUserList || mobileTab === 'users'
                ? 25
                : mobileTab === 'groups'
                ? 50
                : 75
            }%`,
          }}
        >
          <div className="w-8 h-full bg-[var(--accent-primary)] rounded-full" />
        </div>

        {/* 4 Interactive Tab Buttons */}
        <div className="relative w-full h-full flex items-center z-20">
          
          {/* Tab 1: Chats */}
          <button
            type="button"
            onClick={() => handleMobileTabChange('chats')}
            className="flex-1 h-full flex items-center justify-center cursor-pointer border-none bg-transparent relative group"
            title="All Chats"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-200 ${
                mobileTab === 'chats' && !showUserList
                  ? 'text-[var(--accent-primary)] scale-105'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
              </svg>

              {unreadConvosCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center ring-2 ring-[var(--bg-secondary)] shadow-sm">
                  {unreadConvosCount > 9 ? '9+' : unreadConvosCount}
                </span>
              )}
            </div>
          </button>

          {/* Tab 2: People / Contacts */}
          <button
            type="button"
            onClick={() => handleMobileTabChange('users')}
            className="flex-1 h-full flex items-center justify-center cursor-pointer border-none bg-transparent relative group"
            title="People & Direct Contacts"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-200 ${
                showUserList || mobileTab === 'users'
                  ? 'text-[var(--accent-primary)] scale-105'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21h19.2v-1.8c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          </button>

          {/* Tab 3: Group Chats */}
          <button
            type="button"
            onClick={() => handleMobileTabChange('groups')}
            className="flex-1 h-full flex items-center justify-center cursor-pointer border-none bg-transparent relative group"
            title="Group Chats"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-200 ${
                mobileTab === 'groups' && activeFilter === 'groups' && !showUserList
                  ? 'text-[var(--accent-primary)] scale-105'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              {groupsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center ring-2 ring-[var(--bg-secondary)] shadow-sm">
                  {groupsCount}
                </span>
              )}
            </div>
          </button>

          {/* Tab 4: Settings */}
          <button
            type="button"
            onClick={() => handleMobileTabChange('settings')}
            className="flex-1 h-full flex items-center justify-center cursor-pointer border-none bg-transparent relative group"
            title="Settings & Theme"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-200 ${
                showSettings
                  ? 'text-[var(--accent-primary)] scale-105'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </div>
          </button>

        </div>
      </div>

      {/* ── Create Group Modal ── */}
      {showCreateGroup && (
        <CreateGroupModal
          users={users}
          onClose={() => setShowCreateGroup(false)}
          onSuccess={(convo) => {
            setShowCreateGroup(false);
            selectConvo(convo);
          }}
        />
      )}

      {/* ── Join Group Modal ── */}
      {showJoinGroup && (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onSuccess={(convo) => {
            setShowJoinGroup(false);
            selectConvo(convo);
          }}
        />
      )}
    </div>
  );
}
