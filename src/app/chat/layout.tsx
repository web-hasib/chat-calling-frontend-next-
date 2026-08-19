'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatProvider, useChatContext } from '../../context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { EditProfileModal } from './components/EditProfileModal';
import { SettingsPage } from './components/SettingsPage';
import { CreateGroupModal } from './components/CreateGroupModal';
import { JoinGroupModal } from './components/JoinGroupModal';

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, token, logout, loading, updateProfile } = useAuth();
  const { onlineUsers } = useSocket();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const conversationId = params?.conversationId as string | undefined;

  const chat = useChatContext();
  const {
    conversations, activeConvo, setActiveConvo,
    users, conversationsLoading,
    fetchConversations, fetchUsers, selectConvo,
    getRecipientInfo, getRecipientDisplayName,
    createGroup, joinGroup
  } = chat;

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Group modal triggers
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Redirect if no token
  useEffect(() => {
    if (!loading && !token) router.push('/');
  }, [token, loading, router]);

  // Load conversations on token
  useEffect(() => {
    if (token) fetchConversations();
  }, [token]);

  // Debounce user search
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => fetchUsers(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, token]);

  // Theme
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.body.classList.toggle('light-theme', saved === 'light');
  }, []);

  const toggleTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    document.body.classList.toggle('light-theme', t === 'light');
  };

  // Sync route params with activeConvo
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;
    if (conversationId) {
      const found = conversations.find(c => String(c.id) === conversationId);
      if (found) {
        if (!activeConvo || String(activeConvo.id) !== conversationId) {
          selectConvo(found);
        }
      }
    } else {
      if (activeConvo) {
        setActiveConvo(null);
      }
    }
  }, [conversationId, conversations, activeConvo, selectConvo, setActiveConvo]);

  const handleStartChatWithUser = async (targetUser: any) => {
    try {
      const res = await fetch(`${API_URL}/chat/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: targetUser.id }),
      });
      if (!res.ok) throw new Error();
      const convo = await res.json();
      await fetchConversations();
      setShowUserList(false);
      setSearchQuery('');
      router.push(`/chat/${convo.id}`);
    } catch (e) {
      console.error('Error starting chat', e);
    }
  };

  const handleSelectConvo = async (convo: any) => {
    router.push(`/chat/${convo.id}`);
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditUsername(user?.username || '');
    setEditAvatarUrl(user?.avatarUrl || '');
    setProfileError('');
    setProfileSuccess(false);
    setShowEditProfile(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setProfileError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ message: 'Upload failed' }))).message);
      setEditAvatarUrl((await res.json()).fileUrl);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to upload image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileUpdating(true);
    try {
      await updateProfile({
        name: editName.trim(),
        username: editUsername.trim().toLowerCase(),
        avatarUrl: editAvatarUrl
      });
      setProfileSuccess(true);
      setTimeout(() => setShowEditProfile(false), 1500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden">
        <div className="w-[320px] border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col p-5 gap-5">
          <div className="flex justify-between">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            <div className="w-20 h-6 bg-[var(--bg-tertiary)] rounded animate-pulse" />
          </div>
          <div className="w-full h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
          <div className="flex flex-col gap-4 mt-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] shrink-0 animate-pulse" />
                <div className="flex-grow flex flex-col gap-1.5">
                  <div className="w-[40%] h-3 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                  <div className="w-[70%] h-2.5 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-[var(--bg-primary)] p-6 gap-6">
          <div className="flex justify-between pb-4 border-b border-[var(--border-color)]">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="w-[100px] h-3.5 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-5 justify-end">
            <div className="w-[200px] h-10 rounded-xl bg-[var(--bg-tertiary)] self-start animate-pulse" />
            <div className="w-[140px] h-10 rounded-xl bg-[var(--bg-tertiary)] self-end animate-pulse" />
            <div className="w-[260px] h-10 rounded-xl bg-[var(--bg-tertiary)] self-start animate-pulse" />
          </div>
          <div className="w-full h-11 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
      </div>
    );
  }

  const isChatView = !!conversationId;

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar: Visible when not inside a chat thread or on desktop */}
      <div className={`${isChatView ? 'hidden' : 'w-full'} md:w-auto md:block shrink-0`}>
        <Sidebar
          user={user}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          showUserList={showUserList}
          setShowUserList={setShowUserList}
          setSearchQuery={setSearchQuery}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          theme={theme}
          toggleTheme={toggleTheme}
          openEditProfile={openEditProfile}
          logout={logout}
          searchQuery={searchQuery}
          users={users}
          conversations={conversations}
          conversationsLoading={conversationsLoading}
          activeConvo={activeConvo}
          onlineUsers={onlineUsers}
          startChatWithUser={handleStartChatWithUser}
          selectConvo={(c) => { setShowSettings(false); handleSelectConvo(c); }}
          getRecipientInfo={getRecipientInfo}
          getRecipientDisplayName={getRecipientDisplayName}
          currentUserId={user.id}
          updateProfile={updateProfile}
        />
      </div>

      {/* Desktop Main Pane: Settings or Chat */}
      <div className={`flex-grow flex flex-col bg-[var(--bg-primary)] overflow-hidden ${isChatView ? 'flex' : 'hidden'} md:flex`}>
        {showSettings ? (
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
        ) : (
          children
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          users={users}
          onClose={() => setShowCreateGroup(false)}
          onSuccess={(convo) => {
            setShowCreateGroup(false);
            setShowSettings(false);
            handleSelectConvo(convo);
          }}
        />
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onSuccess={(convo) => {
            setShowJoinGroup(false);
            setShowSettings(false);
            handleSelectConvo(convo);
          }}
        />
      )}

      {/* Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          editName={editName}
          setEditName={setEditName}
          editUsername={editUsername}
          setEditUsername={setEditUsername}
          editAvatarUrl={editAvatarUrl}
          uploadingAvatar={uploadingAvatar}
          profileUpdating={profileUpdating}
          profileError={profileError || null}
          profileSuccess={profileSuccess}
          onClose={() => setShowEditProfile(false)}
          onSubmit={handleProfileSubmit}
          onAvatarUpload={handleAvatarUpload}
        />
      )}
    </div>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </ChatProvider>
  );
}
