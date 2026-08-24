'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCall } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';
import styles from './CallOverlay.module.css';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoOn, VideoOff, Monitor, Users, LogOut, MessageSquare, Smile, Send, X as CloseIcon, Maximize2, Minimize2, Settings } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { DeviceSettingsModal } from './DeviceSettingsModal';
import { OneToOneCallOverlay } from './OneToOneCallOverlay';
import { InMeetingChatPanel } from './InMeetingChatPanel';
import { ParticipantsModal } from './ParticipantsModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useAudioActivity } from '../hooks/useAudioActivity';

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
  scale: number;
  duration: number;
  delay: number;
  rotate: number;
}

const getDiscordAdaptiveBg = (userId: string) => {
  const colors = [
    '#3c2f2f', // Dark reddish brown
    '#2f3c37', // Dark sage green
    '#372f3c', // Dark dusty purple
    '#2f363c', // Dark slate blue
    '#3c372f', // Dark olive/bronze
    '#403030', // Dark warm brown
    '#304038', // Dark teal-green
    '#3a3d52', // Dark indigo-grey
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const EMOJI_PRESETS = ['❤️', '👍', '🔥', '😂', '👏', '🎉', '😮', '😢', '💯', '🚀'] as const;

const RemoteVideoElement: React.FC<{
  stream?: MediaStream | null;
  className?: string;
  onRef?: (el: HTMLVideoElement | null) => void;
}> = React.memo(({ stream, className, onRef }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      onRef?.(videoRef.current);
    }
  }, [stream, onRef]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className={className}
    />
  );
});
RemoteVideoElement.displayName = 'RemoteVideoElement';

const GroupThumbnailTileWrapper: React.FC<{
  userId: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream | null;
  hasVideo: boolean;
  isUserMuted: boolean;
  isSharingScreen?: boolean;
  isHandRaised?: boolean;
  isFootRaised?: boolean;
  onClick?: () => void;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}> = React.memo(({
  userId,
  name,
  avatarUrl,
  stream,
  hasVideo,
  isUserMuted,
  isSharingScreen,
  isHandRaised,
  isFootRaised,
  onClick,
  onVideoRef,
}) => {
  const isSpeaking = useAudioActivity(stream || null, isUserMuted);

  return (
    <div 
      className={`${styles.thumbnailTile} ${isSpeaking ? styles.speakingGlow : ''}`}
      onClick={onClick}
      title={`Focus ${name}`}
    >
      {hasVideo && stream ? (
        <RemoteVideoElement
          stream={stream}
          className={styles.thumbnailVideoEl}
          onRef={onVideoRef}
        />
      ) : (
        <div className={styles.thumbnailPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(userId) }}>
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name || userId}`}
            alt={name}
            className={styles.thumbnailPlaceholderAvatar}
          />
        </div>
      )}
      <div className={styles.thumbnailLabel}>
        {isSpeaking && <span className={styles.speakingWaveDot} />}
        {isSharingScreen && '💻 '}{name} {isHandRaised && '🖐️'} {isFootRaised && '🦶'} {isUserMuted && '🔇'}
      </div>
      {stream && <RemoteAudioElement stream={stream} />}
    </div>
  );
});
GroupThumbnailTileWrapper.displayName = 'GroupThumbnailTileWrapper';

const GroupRemoteTileWrapper: React.FC<{
  userId: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream | null;
  hasVideo: boolean;
  isUserMuted: boolean;
  isUserScreenSharing?: boolean;
  isHandRaised?: boolean;
  isFootRaised?: boolean;
  onClick?: () => void;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}> = React.memo(({
  userId,
  name,
  avatarUrl,
  stream,
  hasVideo,
  isUserMuted,
  isUserScreenSharing,
  isHandRaised,
  isFootRaised,
  onClick,
  onVideoRef,
}) => {
  const isSpeaking = useAudioActivity(stream || null, isUserMuted);

  return (
    <div 
      className={`${styles.groupVideoTile} ${isSpeaking ? styles.speakingGlow : ''}`}
      onClick={onClick}
      title={`Click to focus ${name}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {hasVideo && stream ? (
        <RemoteVideoElement
          stream={stream}
          className={styles.groupVideoEl}
          onRef={onVideoRef}
        />
      ) : (
        <div className={styles.groupVideoPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(userId) }}>
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name || userId}`}
            alt={name}
            className={styles.groupPlaceholderAvatar}
          />
        </div>
      )}
      <div className={styles.groupTileLabel}>
        {isSpeaking && <span className={styles.speakingWaveDot} />}
        {isUserScreenSharing && '💻 '}{name} {isUserScreenSharing && '(Sharing Screen)'} {isHandRaised && '🖐️'} {isFootRaised && '🦶'} {isUserMuted && '🔇'}
      </div>
      {stream && <RemoteAudioElement stream={stream} />}
    </div>
  );
});
GroupRemoteTileWrapper.displayName = 'GroupRemoteTileWrapper';

const RemoteAudioElement: React.FC<{
  stream?: MediaStream | null;
}> = React.memo(({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && stream && audioRef.current.srcObject !== stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      muted
      style={{ display: 'none' }}
    />
  );
});
RemoteAudioElement.displayName = 'RemoteAudioElement';

const CallOverlay: React.FC = () => {
  const { user } = useAuth();
  const {
    // 1:1 call
    activeCall,
    localStream,
    remoteStream,
    callDuration,
    isMuted,
    isVideoMuted,
    isScreenSharing,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    // Group call
    activeGroupCall,
    groupLocalStream,
    groupRemoteStreams,
    groupCallDuration,
    isGroupMuted,
    isGroupVideoMuted,
    isGroupScreenSharing,
    joinGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    toggleGroupMute,
    toggleGroupVideo,
    toggleGroupScreenShare,
    groupCallMessages,
    sendGroupCallMessage,
    triggerGroupCallEmoji,
    latestEmojiReaction,
    groupCallVideoStates,
    groupCallScreenSharingStates,
    groupMutedUserIds,
    myGroupRole,
    isHandRaised,
    isFootRaised,
    groupCallHandRaisedStates,
    groupCallFootRaisedStates,
    adminMuteAll,
    toggleHandRaise,
    toggleFootRaise,
    adminMuteUser,
    adminUnmuteUser,
  } = useCall();

  // ─── Group Call Refs ───
  const groupLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const groupRemoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // ─── Ephemeral Call Features States ───
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [showAllParticipantsPanel, setShowAllParticipantsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSelfSpeaking = useAudioActivity(groupLocalStream || localStream, isGroupMuted || isMuted);
  const [raiseConfirmModal, setRaiseConfirmModal] = useState<{ type: 'hand' | 'foot'; action: 'raise' | 'lower' } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  };

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const el = containerRef.current || document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  const [muteConfirmConfig, setMuteConfirmConfig] = useState<{
    isOpen: boolean;
    type: 'all' | 'user';
    targetUserId?: string;
    targetUserName?: string;
  }>({ isOpen: false, type: 'all' });
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Message popups (toast) logic
  interface MessageToast {
    id: string;
    senderName: string;
    message: string;
  }
  const [toasts, setToasts] = useState<MessageToast[]>([]);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    if (groupCallMessages.length > lastMessageCountRef.current) {
      const latestMsg = groupCallMessages[groupCallMessages.length - 1];
      const isMyMessage = latestMsg.senderId === user?.id;

      if (!isMyMessage && !showChatPanel) {
        const newToast = {
          id: Math.random().toString(),
          senderName: latestMsg.senderName,
          message: latestMsg.message,
        };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 5000);
      }
    }
    lastMessageCountRef.current = groupCallMessages.length;
  }, [groupCallMessages, showChatPanel, user]);

  // ─── Group Call PIP Dragging & Edge Docking State ───
  const [groupPipPosition, setGroupPipPosition] = useState({ x: 0, y: 0 });
  const [groupPipDocked, setGroupPipDocked] = useState<'left' | 'right' | null>(null);
  const isGroupDraggingRef = useRef(false);
  const groupDragStartRef = useRef({ x: 0, y: 0 });
  const didDragMovedRef = useRef(false);
  const startClientPosRef = useRef({ x: 0, y: 0 });

  const handleGroupPointerDown = (e: React.PointerEvent) => {
    isGroupDraggingRef.current = true;
    didDragMovedRef.current = false;
    startClientPosRef.current = { x: e.clientX, y: e.clientY };
    groupDragStartRef.current = {
      x: e.clientX - groupPipPosition.x,
      y: e.clientY - groupPipPosition.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGroupPointerMove = (e: React.PointerEvent) => {
    if (!isGroupDraggingRef.current) return;
    const movedDist = Math.hypot(e.clientX - startClientPosRef.current.x, e.clientY - startClientPosRef.current.y);
    if (movedDist > 6) {
      didDragMovedRef.current = true;
    }

    let newX = e.clientX - groupDragStartRef.current.x;
    let newY = e.clientY - groupDragStartRef.current.y;

    const pipWidth = 110;
    const padding = 16;

    // Left limit (relative to default right: 20px)
    const minX = -(window.innerWidth - pipWidth - padding);
    // Right limit (can be dragged off-screen to the right by up to pipWidth + 20)
    const maxX = pipWidth + 20;

    const minY = -window.innerHeight + 150 + padding;
    const maxY = padding;

    newX = Math.max(minX - 30, Math.min(newX, maxX + 30));
    newY = Math.max(minY, Math.min(newY, maxY));

    setGroupPipPosition({ x: newX, y: newY });
  };

  const handleGroupPointerUp = (e: React.PointerEvent) => {
    if (!isGroupDraggingRef.current) return;
    isGroupDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const pipWidth = 110;
    const padding = 16;
    const minX = -(window.innerWidth - pipWidth - padding);

    // If it was just a tap/click without dragging, and it is currently docked, UNDOCK it!
    if (!didDragMovedRef.current) {
      if (groupPipDocked) {
        if (groupPipDocked === 'left') {
          setGroupPipPosition(prev => ({ ...prev, x: minX + 20 }));
        } else {
          setGroupPipPosition(prev => ({ ...prev, x: 0 }));
        }
        setGroupPipDocked(null);
      }
      return;
    }

    // It was a drag: check if dragged to left or right screen edge
    if (groupPipPosition.x <= minX + 60) {
      // Dock to left edge (leaves 22px tab visible)
      setGroupPipDocked('left');
      setGroupPipPosition(prev => ({ ...prev, x: minX - pipWidth + 22 }));
    } else if (groupPipPosition.x >= 20) {
      // Dock to right edge (leaves 22px tab visible, exactly matching left)
      setGroupPipDocked('right');
      setGroupPipPosition(prev => ({ ...prev, x: pipWidth + 20 - 22 }));
    } else {
      setGroupPipDocked(null);
    }
  };

  const handleGroupPipClick = (e: React.MouseEvent) => {
    if (groupPipDocked) {
      e.stopPropagation();
      const pipWidth = 110;
      const padding = 16;
      const minX = -(window.innerWidth - pipWidth - padding);
      if (groupPipDocked === 'left') {
        setGroupPipPosition(prev => ({ ...prev, x: minX + 20 }));
      } else {
        setGroupPipPosition(prev => ({ ...prev, x: 0 }));
      }
      setGroupPipDocked(null);
    }
  };

  // ─── Group stream binding ───
  useEffect(() => {
    if (groupLocalVideoRef.current && groupLocalStream) {
      groupLocalVideoRef.current.srcObject = groupLocalStream;
    }
  }, [groupLocalStream, activeGroupCall?.status, isGroupVideoMuted]);

  useEffect(() => {
    for (const [userId, stream] of groupRemoteStreams) {
      const el = groupRemoteVideoRefs.current.get(userId);
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    }
  }, [groupRemoteStreams]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupCallMessages, showChatPanel]);

  // Trigger cinematic multi-emoji burst animation when a reaction is received
  useEffect(() => {
    if (latestEmojiReaction) {
      const burstCount = 5; // clean and elegant count of 5 emojis
      const baseLeft = Math.random() * 60 + 20; // 20% to 80%
      const newEmojis: FloatingEmoji[] = [];

      for (let i = 0; i < burstCount; i++) {
        newEmojis.push({
          id: latestEmojiReaction.id + i + Math.random(),
          emoji: latestEmojiReaction.emoji,
          left: Math.max(5, Math.min(95, baseLeft + (Math.random() * 20 - 10))),
          scale: 0.9 + Math.random() * 0.7, // size variation from 0.9x to 1.6x
          duration: 5.5 + Math.random() * 2.0, // gentle slow float (5.5s to 7.5s)
          delay: i * 0.18 + Math.random() * 0.08, // smooth staggered launch
          rotate: Math.floor(Math.random() * 30 - 15), // -15deg to +15deg tilt
        });
      }

      setFloatingEmojis(prev => [...prev, ...newEmojis]);

      const maxLifetime = 8500;
      setTimeout(() => {
        const idsToRemove = new Set(newEmojis.map(e => e.id));
        setFloatingEmojis(prev => prev.filter(fe => !idsToRemove.has(fe.id)));
      }, maxLifetime);
    }
  }, [latestEmojiReaction]);

  // Memoized sorted participant list for participants modal
  const sortedModalParticipants = useMemo(() => {
    return [...(activeGroupCall?.participants || [])].sort((a, b) => {
      const aSharing = groupCallScreenSharingStates[a.userId] || false;
      const bSharing = groupCallScreenSharingStates[b.userId] || false;
      if (aSharing && !bSharing) return -1;
      if (!aSharing && bSharing) return 1;

      const aHandRaised = groupCallHandRaisedStates[a.userId] || false;
      const bHandRaised = groupCallHandRaisedStates[b.userId] || false;
      const aFootRaised = groupCallFootRaisedStates[a.userId] || false;
      const bFootRaised = groupCallFootRaisedStates[b.userId] || false;
      const aRaised = aHandRaised || aFootRaised;
      const bRaised = bHandRaised || bFootRaised;
      const aLive = groupRemoteStreams.has(a.userId);
      const bLive = groupRemoteStreams.has(b.userId);

      if (aRaised && !bRaised) return -1;
      if (!aRaised && bRaised) return 1;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return 0;
    });
  }, [activeGroupCall?.participants, groupCallScreenSharingStates, groupCallHandRaisedStates, groupCallFootRaisedStates, groupRemoteStreams]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Send meeting chat message
  const handleSendChat = () => {
    if (!chatInputText.trim()) return;
    sendGroupCallMessage(chatInputText);
    setChatInputText('');
  };

  // ═══════════════════════════════════════════════════════════
  // GROUP CALL UI
  // ═══════════════════════════════════════════════════════════

  if (activeGroupCall) {
    const isRinging = activeGroupCall.status === 'ringing';
    const isConnected = activeGroupCall.status === 'connected';
    const isConnecting = activeGroupCall.status === 'connecting';
    const isEnded = activeGroupCall.status === 'ended';
    const isVideoCall = activeGroupCall.type === 'VIDEO';

    // Ringing / Ended state
    if (isRinging || isEnded) {
      return (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <div className={styles.groupBadge}>
              <Users size={16} />
              <span>Group Call</span>
            </div>

            <div className={styles.groupAvatarRow}>
              {activeGroupCall.participants.slice(0, 3).map((p) => (
                <img
                  key={p.userId}
                  src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`}
                  alt={p.name}
                  className={isRinging ? styles.ringingAvatar : styles.avatar}
                  style={{ width: 80, height: 80 }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <h2 className={styles.name}>{activeGroupCall.groupName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                {isVideoCall ? (
                  <VideoOn size={16} style={{ color: 'var(--accent-primary, #3b82f6)' }} />
                ) : (
                  <Phone size={14} style={{ color: 'var(--accent-success, #22c55e)' }} />
                )}
                <span
                  className={styles.status}
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: isEnded ? '#ef4444' : undefined,
                  }}
                >
                  {isEnded
                    ? 'Group call ended'
                    : `Incoming ${isVideoCall ? 'Video' : 'Audio'} Group Call...`}
                </span>
              </div>
              {isRinging && activeGroupCall.participants.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  from {activeGroupCall.participants[0].name}
                </span>
              )}
            </div>

            <div className={styles.controls}>
              {isEnded ? null : (
                <>
                  <button
                    className={`${styles.btn} ${styles.btnAnswer}`}
                    onClick={() => joinGroupCall()}
                    title="Join Group Call"
                  >
                    <Phone size={24} />
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDecline}`}
                    onClick={rejectGroupCall}
                    title="Decline"
                  >
                    <PhoneOff size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Connecting state
    if (isConnecting) {
      return (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <div className={styles.groupBadge}>
              <Users size={16} />
              <span>Group Call</span>
            </div>
            <h2 className={styles.name}>{activeGroupCall.groupName}</h2>
            <span className={styles.status}>Connecting...</span>
          </div>
        </div>
      );
    }

    // Connected state — VIDEO/AUDIO layout
    if (isConnected) {
      const allParticipants = activeGroupCall?.participants || [];
      const remoteParticipants = allParticipants.filter(p => p.userId !== user?.id);

      // Build effective remote list using actual participants data
      const effectiveRemoteList = remoteParticipants.length > 0
        ? remoteParticipants.map(p => ({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl,
            stream: groupRemoteStreams.get(p.userId) || null,
          }))
        : Array.from(groupRemoteStreams.entries()).map(([uid, stream]) => {
            const p = allParticipants.find(part => part.userId === uid);
            return {
              userId: uid,
              name: p?.name || 'Participant',
              avatarUrl: p?.avatarUrl,
              stream,
            };
          });

      const totalParticipants = Math.max(allParticipants.length, effectiveRemoteList.length + 1);
      
      // On mobile, the local preview floats, so grid only displays remote participants.
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const gridParticipantsCount = totalParticipants > 4 ? 4 : totalParticipants;
      const activeGridParticipants = isMobile ? (gridParticipantsCount - 1) : gridParticipantsCount;
      
      const gridClass = activeGridParticipants <= 1
        ? styles.groupGrid2 // 1 participant or 2 layout
        : activeGridParticipants <= 2
        ? styles.groupGrid2
        : styles.groupGrid4;

      const isControlsHidden = (isMobile && showChatPanel) || (!controlsVisible && !showEmojiTray && !showChatPanel && !showAllParticipantsPanel && !raiseConfirmModal && !muteConfirmConfig.isOpen);

      return (
        <div 
          ref={containerRef}
          className={styles.groupCallContainer}
          onMouseMove={handleUserActivity}
          onClick={handleUserActivity}
          onTouchStart={handleUserActivity}
        >
          {/* Main Layout containing Grid + sliding chat panel */}
          <div className={styles.groupMainBody}>
            {/* Grid display / Avatar display */}
            <div className={styles.groupMediaArea}>
              {/* Floating Cinematic Emojis */}
              <div className={styles.emojiContainer}>
                {floatingEmojis.map(fe => (
                  <span
                    key={fe.id}
                    className={styles.flyingEmoji}
                    style={{
                      left: `${fe.left}%`,
                      animationDuration: `${fe.duration}s`,
                      animationDelay: `${fe.delay}s`,
                      transform: `scale(${fe.scale}) rotate(${fe.rotate}deg)`,
                      fontSize: `${32 * fe.scale}px`,
                    }}
                  >
                    {fe.emoji}
                  </span>
                ))}
              </div>

              {isVideoCall ? (
                (() => {
                  const screenSharingRemoteEntries = effectiveRemoteList.filter((item) => groupCallScreenSharingStates[item.userId]);
                  const latestRemoteScreenSharingUserId = screenSharingRemoteEntries.length > 0 
                    ? screenSharingRemoteEntries[screenSharingRemoteEntries.length - 1].userId 
                    : null;
                  const defaultScreenSharingUserId = isGroupScreenSharing ? (user?.id || 'me') : latestRemoteScreenSharingUserId;
                  const effectiveFocusedUserId = focusedUserId || defaultScreenSharingUserId || (totalParticipants === 2 && effectiveRemoteList.length > 0 ? effectiveRemoteList[0].userId : null);

                  if (effectiveFocusedUserId) {
                    const otherRemoteParticipants = effectiveRemoteList.filter((item) => item.userId !== effectiveFocusedUserId);

                    return (
                      <div className={styles.focusedSpeakerLayout}>
                        {/* Thumbnail Row for other remote participants (rendered at top) */}
                        {otherRemoteParticipants.length > 0 && (
                          <div className={`${styles.thumbnailStrip} ${isControlsHidden ? styles.controlsHidden : ''}`}>
                            {(() => {
                              const maxThumbnails = 4;
                              const hasOverflow = otherRemoteParticipants.length > maxThumbnails;
                              const toRender = hasOverflow 
                                ? otherRemoteParticipants.slice(0, maxThumbnails - 1) 
                                : otherRemoteParticipants;
                              const overflowCount = otherRemoteParticipants.length - toRender.length;

                              return (
                                <>
                                  {toRender.map(({ userId, name, avatarUrl, stream }) => {
                                    const hasVideo = groupCallVideoStates[userId] !== false;
                                    const isSharingScreen = groupCallScreenSharingStates[userId];
                                    const isUserMuted = groupMutedUserIds.has(userId);

                                    return (
                                      <GroupThumbnailTileWrapper
                                        key={userId}
                                        userId={userId}
                                        name={name || 'Participant'}
                                        avatarUrl={avatarUrl}
                                        stream={stream}
                                        hasVideo={hasVideo}
                                        isUserMuted={isUserMuted}
                                        isSharingScreen={isSharingScreen}
                                        isHandRaised={groupCallHandRaisedStates[userId]}
                                        isFootRaised={groupCallFootRaisedStates[userId]}
                                        onClick={() => setFocusedUserId(userId)}
                                        onVideoRef={(el) => {
                                          if (el) groupRemoteVideoRefs.current.set(userId, el);
                                        }}
                                      />
                                    );
                                  })}

                                  {/* Background audio tracks to keep overflow participants audible */}
                                  {hasOverflow && otherRemoteParticipants.slice(maxThumbnails - 1).map(({ userId, stream }) => (
                                    stream ? <RemoteAudioElement key={`audio-bg-thumb-${userId}`} stream={stream} /> : null
                                  ))}

                                  {/* + others Overflow tile */}
                                  {hasOverflow && (
                                    <div 
                                      className={styles.thumbnailTileOverflow}
                                      onClick={() => setShowAllParticipantsPanel(true)}
                                      title="View all participants"
                                    >
                                      <span className={styles.thumbnailOverflowCount}>+{overflowCount}</span>
                                      <span className={styles.thumbnailOverflowLabel}>others</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Pinned Focused Video / Screen Share Spotlight (takes up remaining space) */}
                        <div className={styles.focusedVideoWrapper}>
                          {(() => {
                            if (effectiveFocusedUserId === (user?.id || 'me')) {
                              return (
                                <div className={styles.focusedVideoTile} onClick={() => setFocusedUserId(null)} title="Click to unpin">
                                  {!isGroupVideoMuted ? (
                                    <video
                                      ref={groupLocalVideoRef}
                                      autoPlay
                                      playsInline
                                      muted
                                      className={styles.focusedVideoEl}
                                    />
                                  ) : (
                                    <div className={styles.groupVideoPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(user?.id || 'me') }}>
                                      <img
                                        src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || user?.id || 'me'}`}
                                        alt="You"
                                        className={styles.groupPlaceholderAvatar}
                                        style={{ width: 120, height: 120 }}
                                      />
                                    </div>
                                  )}
                                  <div className={styles.groupTileLabel}>
                                    💻 You (Sharing Screen) {isHandRaised && '🖐️'} {isFootRaised && '🦶'} {isGroupMuted && '🔇'}
                                  </div>
                                </div>
                              );
                            }

                            const focusedEntry = effectiveRemoteList.find((item) => item.userId === effectiveFocusedUserId);
                            if (!focusedEntry) return null;
                            const { userId: uid, name, avatarUrl, stream } = focusedEntry;
                            const hasVideo = groupCallVideoStates[uid] !== false && !!stream?.getVideoTracks().length;
                            const isUserScreenSharing = groupCallScreenSharingStates[uid];

                            return (
                              <div key={uid} className={styles.focusedVideoTile} onClick={() => setFocusedUserId(null)} title="Click to unpin">
                                {hasVideo && stream ? (
                                  <RemoteVideoElement
                                    stream={stream}
                                    className={styles.focusedVideoEl}
                                    onRef={(el) => {
                                      if (el) groupRemoteVideoRefs.current.set(uid, el);
                                    }}
                                  />
                                ) : (
                                  <div className={styles.groupVideoPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(uid) }}>
                                    <img
                                      src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name || uid}`}
                                      alt={name || 'Participant'}
                                      className={styles.groupPlaceholderAvatar}
                                      style={{ width: 120, height: 120 }}
                                    />
                                  </div>
                                )}
                                <div className={styles.groupTileLabel}>
                                  {isUserScreenSharing ? '💻' : '📌'} {name || 'Participant'} {isUserScreenSharing ? '(Sharing Screen)' : ''} {groupCallHandRaisedStates[uid] && '🖐️'} {groupCallFootRaisedStates[uid] && '🦶'} {groupMutedUserIds.has(uid) && '🔇'}
                                </div>
                                {stream && <RemoteAudioElement stream={stream} />}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Floating Local Preview PIP (Always on top, draggable) */}
                        {effectiveFocusedUserId !== (user?.id || 'me') && (
                          <div 
                            className={`${styles.groupVideoTile} ${styles.groupFloatingPip}`}
                            style={{
                              transform: `translate(${groupPipPosition.x}px, ${groupPipPosition.y}px)`,
                            }}
                            onPointerDown={handleGroupPointerDown}
                            onPointerMove={handleGroupPointerMove}
                            onPointerUp={handleGroupPointerUp}
                          >
                            {!isGroupVideoMuted ? (
                              <video
                                ref={groupLocalVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={styles.groupVideoEl}
                              />
                            ) : (
                              <div className={styles.groupVideoPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(user?.id || 'me') }}>
                                <img
                                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || user?.id || 'me'}`}
                                  alt="You"
                                  className={styles.groupPlaceholderAvatar}
                                />
                              </div>
                            )}
                            <div className={styles.groupTileLabel}>
                              {isGroupScreenSharing && '💻 '}You {isGroupScreenSharing && '(Sharing Screen)'} {isGroupMuted && '🔇'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Default Grid Layout
                  return (
                    <div className={`${styles.groupVideoGrid} ${gridClass}`}>
                      {/* Self Tile */}
                      <div
                        className={`${styles.groupVideoTile} ${isMobile ? styles.groupFloatingPip : ''} ${groupPipDocked ? styles.groupPipDocked : ''} ${groupPipDocked === 'left' ? styles.groupPipDockedLeft : ''} ${groupPipDocked === 'right' ? styles.groupPipDockedRight : ''} ${isSelfSpeaking ? styles.speakingGlow : ''}`}
                        style={isMobile ? {
                          transform: `translate3d(${groupPipPosition.x}px, ${groupPipPosition.y}px, 0)`,
                        } : undefined}
                        onPointerDown={isMobile ? handleGroupPointerDown : undefined}
                        onPointerMove={isMobile ? handleGroupPointerMove : undefined}
                        onPointerUp={isMobile ? handleGroupPointerUp : undefined}
                        onClick={isMobile ? handleGroupPipClick : undefined}
                        title={groupPipDocked ? 'Click to show preview' : undefined}
                      >
                        {!isGroupVideoMuted ? (
                          <video
                            ref={groupLocalVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={styles.groupVideoEl}
                          />
                        ) : (
                          <div className={styles.groupVideoPlaceholder} style={{ backgroundColor: getDiscordAdaptiveBg(user?.id || 'me') }}>
                            <img
                              src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || user?.id || 'me'}`}
                              alt="You"
                              className={styles.groupPlaceholderAvatar}
                            />
                          </div>
                        )}
                        <div className={styles.groupTileLabel}>
                          {isSelfSpeaking && <span className={styles.speakingWaveDot} />}
                          {isGroupScreenSharing && '💻 '}You {isGroupScreenSharing && '(Sharing Screen)'} {isHandRaised && '🖐️'} {isFootRaised && '🦶'} {isGroupMuted && '🔇'}
                        </div>
                      </div>

                      {/* Remote Tiles (Capped at 2 if total participants > 4) */}
                      {(() => {
                        const maxRemoteVisible = totalParticipants > 4 ? 3 : effectiveRemoteList.length;
                        const visibleRemote = effectiveRemoteList.slice(0, maxRemoteVisible);
                        const overflowRemote = effectiveRemoteList.slice(maxRemoteVisible);
                        const overflowCount = effectiveRemoteList.length - maxRemoteVisible;

                        return (
                          <>
                            {visibleRemote.map(({ userId, name, avatarUrl, stream }) => {
                              const hasVideo = groupCallVideoStates[userId] !== false && !!stream?.getVideoTracks().length;
                              const isUserMuted = groupMutedUserIds.has(userId);
                              const isUserScreenSharing = groupCallScreenSharingStates[userId];

                              return (
                                <GroupRemoteTileWrapper
                                  key={userId}
                                  userId={userId}
                                  name={name || 'Participant'}
                                  avatarUrl={avatarUrl}
                                  stream={stream}
                                  hasVideo={hasVideo}
                                  isUserMuted={isUserMuted}
                                  isUserScreenSharing={isUserScreenSharing}
                                  isHandRaised={groupCallHandRaisedStates[userId]}
                                  isFootRaised={groupCallFootRaisedStates[userId]}
                                  onClick={() => setFocusedUserId(userId)}
                                  onVideoRef={(el) => {
                                    if (el) groupRemoteVideoRefs.current.set(userId, el);
                                  }}
                                />
                              );
                            })}

                            {/* Background audio tracks to keep overflow video participants audible */}
                            {overflowRemote.map(({ userId, stream }) => (
                              stream ? <RemoteAudioElement key={`audio-bg-vid-${userId}`} stream={stream} /> : null
                            ))}

                            {/* +N Overflow tile */}
                            {overflowCount > 0 && (
                              <div 
                                className={styles.videoOverflowTile}
                                onClick={() => setShowAllParticipantsPanel(true)}
                                title="View all participants"
                              >
                                <span className={styles.videoOverflowCount}>+{overflowCount}</span>
                                <span className={styles.videoOverflowLabel}>others</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : (
                /* Audio calling centered layout */
                <div className={styles.groupAudioCenter}>
                  {/* Background audio tracks to ensure overflow participants are audible */}
                  {activeGroupCall.participants.map((p) => {
                    const stream = groupRemoteStreams.get(p.userId);
                    if (!stream) return null;
                    return (
                      <RemoteAudioElement key={`audio-bg-${p.userId}`} stream={stream} />
                    );
                  })}

                  <div className={styles.groupAvatarRow}>
                    {/* Self avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || user?.id || 'me'}`}
                          alt="You"
                          className={styles.avatar}
                          style={{ width: 68, height: 68 }}
                        />
                        {isGroupMuted && (
                          <span style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(239,68,68,0.95)', borderRadius: '50%', padding: '3px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MicOff size={10} />
                          </span>
                        )}
                        {isHandRaised && (
                          <span style={{ position: 'absolute', top: -6, right: -6, fontSize: '16px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>🖐️</span>
                        )}
                        {isFootRaised && (
                          <span style={{ position: 'absolute', top: -6, left: -6, fontSize: '16px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>🦶</span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>You</span>
                    </div>

                    {/* Remote avatars */}
                    {(() => {
                      const maxVisible = 4;
                      const visibleParticipants = sortedModalParticipants.slice(0, maxVisible);
                      const overflowCount = sortedModalParticipants.length - maxVisible;

                      return (
                        <>
                          {visibleParticipants.map((p) => {
                            const hasStream = groupRemoteStreams.has(p.userId);
                            const isUserMuted = groupMutedUserIds.has(p.userId);
                            const pHandRaised = groupCallHandRaisedStates[p.userId] || false;
                            const pFootRaised = groupCallFootRaisedStates[p.userId] || false;
                            return (
                              <div 
                                key={p.userId} 
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                onClick={() => setFocusedUserId(p.userId)}
                              >
                                <div style={{ position: 'relative' }}>
                                  <img
                                    src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`}
                                    alt={p.name}
                                    className={styles.avatar}
                                    style={{ width: 68, height: 68, opacity: hasStream ? 1 : 0.4 }}
                                  />
                                  {isUserMuted && (
                                    <span style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(239,68,68,0.95)', borderRadius: '50%', padding: '3px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <MicOff size={10} />
                                    </span>
                                  )}
                                  {pHandRaised && (
                                    <span style={{ position: 'absolute', top: -6, right: -6, fontSize: '16px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>🖐️</span>
                                  )}
                                  {pFootRaised && (
                                    <span style={{ position: 'absolute', top: -6, left: -6, fontSize: '16px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>🦶</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '72px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                  {p.name}
                                </span>
                              </div>
                            );
                          })}
                          
                          {overflowCount > 0 && (
                            <div 
                              className={styles.overflowAvatar}
                              onClick={() => setShowAllParticipantsPanel(true)}
                              title="View all participants"
                            >
                              <span className={styles.overflowAvatarText}>+{overflowCount}</span>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>others</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <h2 className={styles.name} style={{ color: 'white', marginTop: '16px' }}>{activeGroupCall.groupName}</h2>
                  <span className={styles.status}>Connected (Group Voice Call)</span>
                </div>
              )}
            </div>

            {/* In-Meeting Chat Panel */}
            <InMeetingChatPanel
              isOpen={showChatPanel}
              onClose={() => setShowChatPanel(false)}
              messages={groupCallMessages}
              currentUserId={user?.id}
              inputText={chatInputText}
              onInputChange={setChatInputText}
              onSendMessage={handleSendChat}
              messagesEndRef={chatMessagesEndRef}
            />
          </div>

          {/* Connected Timer overlay */}
          <div className={`${styles.timerOverlay} ${isControlsHidden ? styles.controlsHidden : ''}`}>
            <div className={styles.timerDot} />
            <span>{formatTime(groupCallDuration)}</span>
            <span 
              className={styles.participantCount}
              onClick={() => setShowAllParticipantsPanel(true)}
              title="Click to view all participants"
              style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)' }}
            >
              <Users size={12} />
              {totalParticipants}
            </span>
          </div>

          {/* Call controls overlay */}
          <div className={`${styles.videoControls} ${isControlsHidden ? styles.controlsHidden : ''}`}>
            <button
              className={isGroupMuted ? styles.videoBtnMuted : styles.videoBtn}
              onClick={toggleGroupMute}
              title={isGroupMuted ? 'Unmute' : 'Mute'}
            >
              {isGroupMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Participants Panel Button */}
            <button
              className={showAllParticipantsPanel ? styles.videoBtnActive : styles.videoBtn}
              onClick={() => setShowAllParticipantsPanel(!showAllParticipantsPanel)}
              title="View All Participants"
            >
              <Users size={20} />
            </button>

            {/* Hand Raise */}
            <button
              className={isHandRaised ? styles.videoBtnActive : styles.videoBtn}
              onClick={() => setRaiseConfirmModal({ type: 'hand', action: isHandRaised ? 'lower' : 'raise' })}
              title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
              style={isHandRaised ? { backgroundColor: 'rgba(250, 204, 21, 0.2)', color: '#facc15' } : {}}
            >
              <span style={{ fontSize: '18px' }}>🖐️</span>
            </button>

            {isVideoCall && (
              <button
                className={isGroupVideoMuted ? styles.videoBtnMuted : styles.videoBtn}
                onClick={toggleGroupVideo}
                title={isGroupVideoMuted ? 'Camera On' : 'Camera Off'}
              >
                {isGroupVideoMuted ? <VideoOff size={20} /> : <VideoOn size={20} />}
              </button>
            )}

            {isVideoCall && (
              <button
                className={isGroupScreenSharing ? styles.videoBtnActive : styles.videoBtn}
                onClick={toggleGroupScreenShare}
                title={isGroupScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              >
                <Monitor size={20} />
              </button>
            )}

            {/* Reactions Control */}
            <div style={{ position: 'relative' }}>
              <button
                className={showEmojiTray ? styles.videoBtnActive : styles.videoBtn}
                onClick={() => {
                  setShowEmojiTray(!showEmojiTray);
                  if (showEmojiTray) setShowCustomEmojiPicker(false);
                }}
                title="Send Reaction"
              >
                <Smile size={20} />
              </button>
              {showEmojiTray && (
                <div className={styles.emojiPickerTray}>
                  {EMOJI_PRESETS.map(emoji => (
                    <button
                      key={emoji}
                      className={styles.trayEmojiBtn}
                      onClick={() => {
                        triggerGroupCallEmoji(emoji);
                        setShowEmojiTray(false);
                        setShowCustomEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                  {/* Plus button for Custom Emoji Picker */}
                  <button
                    type="button"
                    className={styles.trayEmojiBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomEmojiPicker(!showCustomEmojiPicker);
                    }}
                    title="Choose Custom Emoji"
                    style={{ fontSize: '18px', fontWeight: 'bold', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}
                  >
                    +
                  </button>
                </div>
              )}

              {/* Custom Emoji Picker placed outside the scrollable tray */}
              {showCustomEmojiPicker && (
                <div className={styles.customEmojiPickerWrapper}>
                  <EmojiPicker
                    theme={Theme.DARK}
                    width={isMobile ? 320 : 350}
                    height={380}
                    onEmojiClick={(emojiData) => {
                      triggerGroupCallEmoji(emojiData.emoji);
                      setShowCustomEmojiPicker(false);
                      setShowEmojiTray(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Chat Control */}
            <button
              className={showChatPanel ? styles.videoBtnActive : styles.videoBtn}
              onClick={() => setShowChatPanel(!showChatPanel)}
              title="Meeting Chat"
            >
              <MessageSquare size={20} />
            </button>

            {/* Settings & More Controls */}
            <button
              className={showSettingsModal ? styles.videoBtnActive : styles.videoBtn}
              onClick={() => setShowSettingsModal(!showSettingsModal)}
              title="Settings & More"
            >
              <Settings size={20} />
            </button>

            <button className={styles.videoBtnEnd} onClick={leaveGroupCall} title="Leave Call">
              <PhoneOff size={20} />
            </button>
          </div>

          <DeviceSettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            isFootRaised={isFootRaised}
            onToggleFootRaise={() => setRaiseConfirmModal({ type: 'foot', action: isFootRaised ? 'lower' : 'raise' })}
            onAdminMuteAll={(myGroupRole === 'CREATOR' || myGroupRole === 'ADMIN' || myGroupRole === 'MODERATOR') ? () => setMuteConfirmConfig({ isOpen: true, type: 'all' }) : undefined}
          />
          
          {/* Toast notifications */}
          {toasts.length > 0 && (
            <div className={styles.toastContainer}>
              {toasts.map((toast) => (
                <div key={toast.id} className={styles.toast}>
                  <div className={styles.toastHeader}>
                    <span className={styles.toastSender}>{toast.senderName}</span>
                    <button 
                      className={styles.toastCloseBtn}
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                  <div className={styles.toastBody}>{toast.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* Participants Modal Component */}
          <ParticipantsModal
            isOpen={showAllParticipantsPanel}
            onClose={() => setShowAllParticipantsPanel(false)}
            totalParticipants={totalParticipants}
            myUser={user}
            myGroupRole={myGroupRole}
            isGroupScreenSharing={isGroupScreenSharing}
            isHandRaised={isHandRaised}
            isFootRaised={isFootRaised}
            isGroupMuted={isGroupMuted}
            sortedParticipants={sortedModalParticipants}
            groupRemoteStreams={groupRemoteStreams}
            groupMutedUserIds={groupMutedUserIds}
            groupCallScreenSharingStates={groupCallScreenSharingStates}
            groupCallHandRaisedStates={groupCallHandRaisedStates}
            groupCallFootRaisedStates={groupCallFootRaisedStates}
            onFocusUser={(uid) => setFocusedUserId(uid)}
            onAdminMuteUser={(uid) => adminMuteUser(uid)}
            onAdminUnmuteUser={(uid) => adminUnmuteUser(uid)}
            onAdminMuteAll={() => setMuteConfirmConfig({ isOpen: true, type: 'all' })}
            onToggleMyMute={toggleGroupMute}
          />

          {/* Admin Mute Confirmation Modal */}
          <ConfirmationModal
            isOpen={muteConfirmConfig.isOpen}
            onClose={() => setMuteConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            title="Confirm Mute Action"
            message={
              muteConfirmConfig.type === 'all'
                ? 'Are you sure you want to mute all participants in this meeting?'
                : `Are you sure you want to mute ${muteConfirmConfig.targetUserName}?`
            }
            submitLabel="Confirm Mute"
            onConfirm={() => {
              if (muteConfirmConfig.type === 'all') {
                adminMuteAll();
              } else if (muteConfirmConfig.type === 'user' && muteConfirmConfig.targetUserId) {
                adminMuteUser(muteConfirmConfig.targetUserId);
              }
            }}
          />

          {/* Hand/Foot Raise Confirmation Modal */}
          <ConfirmationModal
            isOpen={!!raiseConfirmModal}
            onClose={() => setRaiseConfirmModal(null)}
            icon={raiseConfirmModal?.type === 'hand' ? '🖐️' : '🦶'}
            title={
              raiseConfirmModal?.action === 'raise'
                ? `Raise your ${raiseConfirmModal.type === 'hand' ? 'Hand' : 'Foot'}?`
                : `Lower your ${raiseConfirmModal?.type === 'hand' ? 'Hand' : 'Foot'}?`
            }
            message={
              raiseConfirmModal?.action === 'raise'
                ? `All participants will see that you have raised your ${raiseConfirmModal.type}.`
                : `This will remove your raised ${raiseConfirmModal?.type} status.`
            }
            submitLabel="Confirm"
            submitColor={raiseConfirmModal?.type === 'hand' ? '#f59e0b' : '#a855f7'}
            onConfirm={() => {
              if (raiseConfirmModal?.type === 'hand') {
                toggleHandRaise();
              } else {
                toggleFootRaise();
              }
            }}
          />
        </div>
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1:1 CALL UI Component
  // ═══════════════════════════════════════════════════════════
  if (!activeCall || activeCall.status === 'idle') return null;

  return (
    <OneToOneCallOverlay
      activeCall={activeCall}
      localStream={localStream}
      remoteStream={remoteStream}
      callDuration={callDuration}
      isMuted={isMuted}
      isVideoMuted={isVideoMuted}
      isScreenSharing={isScreenSharing}
      formatTime={formatTime}
      onAccept={acceptCall}
      onReject={rejectCall}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
    />
  );
};

export default CallOverlay;
