'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { triggerPhoneVibration, stopPhoneVibration, showPushNotification } from '../utils/notifications';
import { AgoraCallManager } from '../utils/agoraManager';

// ─── 1:1 Call Types (unchanged) ───

interface ActiveCall {
  role: 'caller' | 'receiver';
  type: 'AUDIO' | 'VIDEO';
  peerId: string;
  peerName?: string;
  peerAvatar?: string;
  conversationId: string;
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'busy' | 'declined' | 'ended' | 'offline' | 'failed';
  failureReason?: string;
}

// ─── Group Call Types ───

interface GroupCallParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

interface ActiveGroupCall {
  role: 'initiator' | 'participant';
  type: 'AUDIO' | 'VIDEO';
  conversationId: string;
  groupName: string;
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
  participants: GroupCallParticipant[];
  startedAt?: number;
}

interface GroupCallStatus {
  active: boolean;
  type?: 'AUDIO' | 'VIDEO';
  startedAt?: number;
  participantsCount?: number;
}

interface GroupChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

interface GroupCallEmojiReaction {
  userId: string;
  emoji: string;
  id: number;
}

// ─── Context Type ───

interface CallContextType {
  // 1:1 call
  activeCall: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  isMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isPeerVideoMuted: boolean;
  isPeerScreenSharing: boolean;
  startCall: (targetUserId: string, targetName: string, targetAvatar: string, type: 'AUDIO' | 'VIDEO', conversationId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;

  // Device & Camera management (Both 1:1 and Group)
  switchCamera: (deviceId?: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => Promise<void>;
  currentFacingMode: 'user' | 'environment';
  isUserInCallOnOtherDevice: boolean;

  // Group call
  activeGroupCall: ActiveGroupCall | null;
  groupLocalStream: MediaStream | null;
  groupRemoteStreams: Map<string, MediaStream>;
  groupCallDuration: number;
  isGroupMuted: boolean;
  isGroupVideoMuted: boolean;
  isGroupScreenSharing: boolean;
  currentConvoId: string | null;
  setCurrentConvoId: (convoId: string | null) => void;
  groupCallStatus: GroupCallStatus | null;
  groupCallMessages: GroupChatMessage[];
  latestEmojiReaction: GroupCallEmojiReaction | null;
  groupCallVideoStates: Record<string, boolean>;
  groupCallScreenSharingStates: Record<string, boolean>;
  groupMutedUserIds: Set<string>;
  myGroupRole: string | null;
  isHandRaised: boolean;
  isFootRaised: boolean;
  groupCallHandRaisedStates: Record<string, boolean>;
  groupCallFootRaisedStates: Record<string, boolean>;
  startGroupCall: (conversationId: string, groupName: string, type: 'AUDIO' | 'VIDEO') => void;
  joinGroupCall: (convoIdToJoin?: string, convoTypeToJoin?: 'AUDIO' | 'VIDEO') => Promise<void>;
  rejectGroupCall: () => void;
  leaveGroupCall: () => void;
  toggleGroupMute: () => void;
  toggleGroupVideo: () => void;
  toggleGroupScreenShare: () => Promise<void>;
  sendGroupCallMessage: (message: string) => void;
  triggerGroupCallEmoji: (emoji: string) => void;
  adminMuteAll: () => void;
  toggleHandRaise: () => void;
  toggleFootRaise: () => void;
  adminMuteUser: (userId: string) => void;
  adminUnmuteUser: (userId: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Fallback STUN-only config (used until TURN credentials are fetched)
const FALLBACK_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Metered.ca TURN Server API (Free 500MB/month)
const METERED_API_URL =
  'https://whatscordigram.metered.live/api/v1/turn/credentials?apiKey=7fe865cc807907397100003469b7da353ab7';

async function fetchTurnConfig(): Promise<RTCConfiguration> {
  try {
    const response = await fetch(METERED_API_URL);
    const iceServers = await response.json();
    console.log('[TURN] Fetched Metered TURN credentials:', iceServers.length, 'servers');
    return { iceServers, iceCandidatePoolSize: 10 };
  } catch (err) {
    console.warn('[TURN] Failed to fetch TURN credentials, using STUN-only fallback', err);
    return FALLBACK_ICE_CONFIG;
  }
}

// ─── Audio Synthesizer (shared) ───

class CallAudioSynthesizer {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  private oscs: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;

  startRingingOutgoing() {
    this.stop();
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (!AudioContextClass) return;
    this.audioCtx = new AudioContextClass();
    
    const playRingCycle = () => {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, this.audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime + 1.9);
      gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 2.0);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
      this.oscs = [osc1, osc2];
      this.gainNode = gain;
      
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch(e) {}
      }, 2000);
    };
    
    playRingCycle();
    this.intervalId = setInterval(playRingCycle, 6000);
  }

  startRingtoneIncoming() {
    this.stop();
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (!AudioContextClass) return;
    this.audioCtx = new AudioContextClass();

    // Trigger mobile vibration
    triggerPhoneVibration([1000, 500, 1000, 500]);

    const playRingtoneCycle = () => {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Re-trigger vibration for each ring cycle
      triggerPhoneVibration([1000, 500, 1000, 500]);

      const now = this.audioCtx.currentTime;
      const gain = this.audioCtx.createGain();
      gain.connect(this.audioCtx.destination);
      this.gainNode = gain;

      const playBeep = (freq: number, startOffset: number, duration: number) => {
        if (!this.audioCtx || !gain) return;
        const osc = this.audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + startOffset);
        
        gain.gain.setValueAtTime(0, now + startOffset);
        gain.gain.linearRampToValueAtTime(0.08, now + startOffset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration - 0.05);
        
        osc.connect(gain);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
        this.oscs.push(osc);
      };

      playBeep(853, 0.0, 0.4);
      playBeep(960, 0.0, 0.4);
      
      playBeep(853, 0.5, 0.4);
      playBeep(960, 0.5, 0.4);

      playBeep(853, 1.2, 0.4);
      playBeep(960, 1.2, 0.4);

      playBeep(853, 1.7, 0.4);
      playBeep(960, 1.7, 0.4);
    };

    playRingtoneCycle();
    this.intervalId = setInterval(playRingtoneCycle, 3500);
  }

  stop() {
    stopPhoneVibration();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.oscs.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.oscs = [];
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch(e) {}
      this.gainNode = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch(e) {}
      this.audioCtx = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CallProvider
// ═══════════════════════════════════════════════════════════════

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // ─── 1:1 Call State (unchanged) ───

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isPeerVideoMuted, setIsPeerVideoMuted] = useState<boolean>(false);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState<boolean>(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const incomingOfferRef = useRef<any>(null);
  const earlyCandidatesRef = useRef<any[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioSynthRef = useRef<CallAudioSynthesizer | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const iceConfigRef = useRef<RTCConfiguration>(FALLBACK_ICE_CONFIG);

  // ─── Group Call State ───

  const [activeGroupCall, setActiveGroupCall] = useState<ActiveGroupCall | null>(null);
  const [groupLocalStream, setGroupLocalStream] = useState<MediaStream | null>(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [groupCallDuration, setGroupCallDuration] = useState<number>(0);
  const [isGroupMuted, setIsGroupMuted] = useState<boolean>(false);
  const [isGroupVideoMuted, setIsGroupVideoMuted] = useState<boolean>(false);
  const [isGroupScreenSharing, setIsGroupScreenSharing] = useState<boolean>(false);

  // Synchronized timestamp state
  const [groupCallStartedAt, setGroupCallStartedAt] = useState<number | null>(null);

  // Ephemeral Group Call Features (Chat & Emoji Reactions)
  const [groupCallMessages, setGroupCallMessages] = useState<GroupChatMessage[]>([]);
  const [latestEmojiReaction, setLatestEmojiReaction] = useState<GroupCallEmojiReaction | null>(null);
  const [groupCallVideoStates, setGroupCallVideoStates] = useState<Record<string, boolean>>({});
  const [groupCallScreenSharingStates, setGroupCallScreenSharingStates] = useState<Record<string, boolean>>({});

  // Current active conversation context to track group call status
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [groupCallStatus, setGroupCallStatus] = useState<GroupCallStatus | null>(null);

  const [myGroupRole, setMyGroupRole] = useState<string | null>(null);
  const [groupMutedUserIds, setGroupMutedUserIds] = useState<Set<string>>(new Set());

  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [isFootRaised, setIsFootRaised] = useState<boolean>(false);
  const [groupCallHandRaisedStates, setGroupCallHandRaisedStates] = useState<Record<string, boolean>>({});
  const [groupCallFootRaisedStates, setGroupCallFootRaisedStates] = useState<Record<string, boolean>>({});

  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const currentFacingModeRef = useRef<'user' | 'environment'>('user');
  const outgoingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserInCallOnOtherDevice, setIsUserInCallOnOtherDevice] = useState<boolean>(false);

  useEffect(() => {
    currentFacingModeRef.current = currentFacingMode;
  }, [currentFacingMode]);

  // Map of userId -> RTCPeerConnection for group mesh
  const groupPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const groupScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const groupLocalStreamRef = useRef<MediaStream | null>(null);
  const activeGroupCallRef = useRef<ActiveGroupCall | null>(null);

  // ─── Sync refs ───

  // Fetch TURN credentials from Metered.ca on mount
  useEffect(() => {
    fetchTurnConfig().then((config) => {
      iceConfigRef.current = config;
    });
  }, []);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    activeGroupCallRef.current = activeGroupCall;
  }, [activeGroupCall]);

  useEffect(() => {
    groupLocalStreamRef.current = groupLocalStream;
  }, [groupLocalStream]);

  const isHandRaisedRef = useRef(false);
  const isFootRaisedRef = useRef(false);

  useEffect(() => {
    isHandRaisedRef.current = isHandRaised;
  }, [isHandRaised]);

  useEffect(() => {
    isFootRaisedRef.current = isFootRaised;
  }, [isFootRaised]);

  // Synchronized timer hook based on startedAt timestamp
  useEffect(() => {
    if (!groupCallStartedAt) {
      setGroupCallDuration(0);
      return;
    }
    const updateTimer = () => {
      const diff = Math.floor((Date.now() - groupCallStartedAt) / 1000);
      setGroupCallDuration(diff > 0 ? diff : 0);
    };
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [groupCallStartedAt]);

  // Initialize synthesizer
  useEffect(() => {
    audioSynthRef.current = new CallAudioSynthesizer();
    return () => {
      audioSynthRef.current?.stop();
    };
  }, []);

  // Listen to interactive Service Worker Push Notification clicks (Answer / Decline)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_CALL_ACCEPTED') {
        if (activeCallRef.current?.status === 'ringing') {
          acceptCall();
        } else if (activeGroupCallRef.current?.status === 'ringing') {
          joinGroupCall(event.data.conversationId, event.data.callType);
        }
      } else if (event.data?.type === 'PUSH_CALL_DECLINED') {
        if (activeCallRef.current?.status === 'ringing') {
          rejectCall();
        } else if (activeGroupCallRef.current?.status === 'ringing') {
          rejectGroupCall();
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Initialize Agora RTC Manager for Group Calling
  const agoraManagerRef = useRef<AgoraCallManager | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const manager = new AgoraCallManager();
    manager.setCallbacks({
      onRemoteStreamUpdate: (peerId: string, stream: MediaStream | null) => {
        setGroupRemoteStreams(prev => {
          const next = new Map(prev);
          if (stream) {
            next.set(peerId, stream);
          } else {
            next.delete(peerId);
          }
          return next;
        });
      },
      onUserJoined: (peerId: string) => {
        console.log('[Agora] Remote user joined:', peerId);
      },
      onUserLeft: (peerId: string) => {
        console.log('[Agora] Remote user left:', peerId);
        setGroupRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      },
    });
    agoraManagerRef.current = manager;

    return () => {
      manager.leaveChannel();
    };
  }, []);

  // Monitor dynamic call status for the current active conversation
  useEffect(() => {
    if (!socket || !currentConvoId) {
      setGroupCallStatus(null);
      return;
    }

    const statusChannel = `group-call-status-${currentConvoId}`;

    const handleStatusUpdate = (data: GroupCallStatus) => {
      setGroupCallStatus(data);
    };

    const handleStatusResponse = (res: { conversationId: string; active: boolean; type?: 'AUDIO' | 'VIDEO'; startedAt?: number; participants?: string[] }) => {
      if (res.conversationId === currentConvoId) {
        setGroupCallStatus({
          active: res.active,
          type: res.type,
          startedAt: res.startedAt,
          participantsCount: res.participants?.length || 0,
        });
      }
    };

    socket.on(statusChannel, handleStatusUpdate);
    socket.on('group-call-status-response', handleStatusResponse);

    // Initial check
    socket.emit('group-call-status', { conversationId: currentConvoId });

    return () => {
      socket.off(statusChannel, handleStatusUpdate);
      socket.off('group-call-status-response', handleStatusResponse);
    };
  }, [socket, currentConvoId]);

  // ═══════════════════════════════════════════════════════════
  // 1:1 CALL LOGIC (unchanged from original)
  // ═══════════════════════════════════════════════════════════

  // Set up socket signaling listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data: { from: string; offer: any; type: 'AUDIO' | 'VIDEO'; conversationId: string; callerName?: string; callerAvatar?: string }) => {
      if (activeCallRef.current && activeCallRef.current.status !== 'idle') {
        socket.emit('reject-call', {
          to: data.from,
          conversationId: data.conversationId,
          type: data.type,
          reason: 'busy',
        });
        return;
      }
      if (activeGroupCallRef.current && activeGroupCallRef.current.status !== 'idle') {
        socket.emit('reject-call', {
          to: data.from,
          conversationId: data.conversationId,
          type: data.type,
          reason: 'busy',
        });
        return;
      }
      setActiveCall({
        role: 'receiver',
        type: data.type,
        peerId: data.from,
        peerName: data.callerName || 'Incoming Caller',
        peerAvatar: data.callerAvatar,
        conversationId: data.conversationId,
        status: 'ringing',
      });
      incomingOfferRef.current = data.offer;
      earlyCandidatesRef.current = [];
      audioSynthRef.current?.startRingtoneIncoming();

      // Trigger Web Push Notification banner
      showPushNotification(data.callerName || 'Incoming Caller', {
        body: `Incoming ${data.type === 'VIDEO' ? 'Video' : 'Audio'} Call...`,
        isCall: true,
        requireInteraction: true,
        tag: 'incoming-call-alert',
        conversationId: data.conversationId,
        callType: data.type,
      });
    });

    socket.on('call-accepted', async (data: { answer: any; receiverName?: string; receiverAvatar?: string }) => {
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }
      if (peerConnectionRef.current) {
        try {
          audioSynthRef.current?.stop();
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // Flush any buffered ICE candidates that arrived early
          if (earlyCandidatesRef.current.length > 0) {
            for (const cand of earlyCandidatesRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
              } catch (err) {
                console.error('Error adding buffered ICE candidate on caller', err);
              }
            }
            earlyCandidatesRef.current = [];
          }

          setActiveCall(prev => prev ? { 
            ...prev, 
            status: 'connected',
            peerName: data.receiverName || prev.peerName,
            peerAvatar: data.receiverAvatar || prev.peerAvatar,
          } : null);
          startCallTimer();
        } catch (e) {
          console.error('Error setting remote description', e);
        }
      }
    });

    socket.on('ice-candidate', async (data: { candidate: any }) => {
      if (!data?.candidate) return;
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      } else {
        earlyCandidatesRef.current.push(data.candidate);
      }
    });

    socket.on('call-media-state', (data: { videoEnabled?: boolean; audioEnabled?: boolean; isScreenSharing?: boolean }) => {
      if (typeof data.videoEnabled === 'boolean') {
        setIsPeerVideoMuted(!data.videoEnabled);
      }
      if (typeof data.isScreenSharing === 'boolean') {
        setIsPeerScreenSharing(data.isScreenSharing);
      }
    });

    socket.on('call-rejected', (data?: { reason?: string }) => {
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }
      audioSynthRef.current?.stop();
      if (data?.reason === 'busy') {
        setActiveCall(prev => prev ? { ...prev, status: 'busy' } : null);
      } else {
        setActiveCall(prev => prev ? { ...prev, status: 'declined' } : null);
      }
      setTimeout(cleanupCall, 1500);
    });

    socket.on('call-ended', () => {
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }
      audioSynthRef.current?.stop();
      setActiveCall(prev => prev ? { ...prev, status: 'ended' } : null);
      setTimeout(cleanupCall, 1500);
    });

    socket.on('call-failed', (err: { reason: string }) => {
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
        outgoingTimeoutRef.current = null;
      }
      audioSynthRef.current?.stop();
      const isOffline = err.reason?.toLowerCase().includes('offline');
      setActiveCall(prev => prev ? { 
        ...prev, 
        status: isOffline ? 'offline' : 'failed', 
        failureReason: err.reason || 'User offline' 
      } : null);
      setTimeout(cleanupCall, 2500);
    });

    // Multi-device sync: if this user enters/leaves call on another device/tab
    socket.on('user-device-call-sync', (data: { inCall: boolean; socketId: string | null; type: string | null }) => {
      if (data.inCall && data.socketId !== socket.id) {
        setIsUserInCallOnOtherDevice(true);
      } else {
        setIsUserInCallOnOtherDevice(false);
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-media-state');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.off('call-failed');
      socket.off('user-device-call-sync');
    };
  }, [socket]);

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };

  const initMedia = async (type: 'AUDIO' | 'VIDEO', isGroup = false) => {
    try {
      const savedVideoIn = typeof window !== 'undefined' ? localStorage.getItem('chat_calling_video_in') : null;
      const savedAudioIn = typeof window !== 'undefined' ? localStorage.getItem('chat_calling_audio_in') : null;
      const facing = currentFacingModeRef.current || 'user';

      const videoConstraints = isGroup
        ? (savedVideoIn
            ? { deviceId: { exact: savedVideoIn }, width: { ideal: 640, max: 854 }, height: { ideal: 360, max: 480 }, frameRate: { ideal: 15, max: 20 } }
            : { width: { ideal: 640, max: 854 }, height: { ideal: 360, max: 480 }, frameRate: { ideal: 15, max: 20 }, facingMode: facing })
        : (savedVideoIn
            ? { deviceId: { exact: savedVideoIn }, width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } }
            : { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: facing });

      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        ...(savedAudioIn ? { deviceId: { exact: savedAudioIn } } : {}),
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'VIDEO' ? videoConstraints : false,
        audio: audioConstraints,
      });
      return stream;
    } catch (e) {
      if (type === 'VIDEO') {
        console.warn('Video acquisition failed, falling back to audio only');
        try {
          const savedAudioIn = typeof window !== 'undefined' ? localStorage.getItem('chat_calling_audio_in') : null;
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              ...(savedAudioIn ? { deviceId: { exact: savedAudioIn } } : {}),
            },
          });
          return fallbackStream;
        } catch (err) {
          console.error('Audio fallback failed as well', err);
        }
      }
      console.error('Error accessing media devices', e);
      alert('Could not access camera or microphone.');
      throw e;
    }
  };

  const setupPeerConnection = (stream: MediaStream, targetUserId: string) => {
    const pc = new RTCPeerConnection(iceConfigRef.current);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (
    targetUserId: string,
    targetName: string,
    targetAvatar: string,
    type: 'AUDIO' | 'VIDEO',
    conversationId: string
  ) => {
    if (isUserInCallOnOtherDevice) {
      alert('You are already active in a call on another device.');
      return;
    }

    try {
      setActiveCall({
        role: 'caller',
        type,
        peerId: targetUserId,
        peerName: targetName,
        peerAvatar: targetAvatar,
        conversationId,
        status: 'ringing',
      });
      audioSynthRef.current?.startRingingOutgoing();

      // 45-Second Outgoing Call Timeout Guard
      if (outgoingTimeoutRef.current) {
        clearTimeout(outgoingTimeoutRef.current);
      }
      outgoingTimeoutRef.current = setTimeout(() => {
        if (activeCallRef.current?.status === 'ringing' && activeCallRef.current.role === 'caller') {
          console.log('[Call] Outgoing call timed out after 45s with no answer');
          socket?.emit('end-call', {
            to: targetUserId,
            conversationId,
            type,
            reason: 'no_answer',
          });
          setActiveCall(prev => prev ? { ...prev, status: 'declined', failureReason: 'No Answer' } : null);
          setTimeout(cleanupCall, 2000);
        }
      }, 45000);

      const stream = await initMedia(type);
      setLocalStream(stream);
      setIsMuted(false);
      setIsVideoMuted(type === 'VIDEO' ? false : true);
      const pc = setupPeerConnection(stream, targetUserId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('call-user', {
          to: targetUserId,
          offer,
          type,
          conversationId,
          callerName: user?.name,
          callerAvatar: user?.avatarUrl,
        });
      }
    } catch (e) {
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!activeCall || !incomingOfferRef.current || !socket) return;

    try {
      audioSynthRef.current?.stop();
      setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : null);
      
      const stream = await initMedia(activeCall.type);
      setLocalStream(stream);
      setIsMuted(false);
      setIsVideoMuted(activeCall.type === 'VIDEO' ? false : true);
      const pc = setupPeerConnection(stream, activeCall.peerId);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
      
      // Flush any buffered ICE candidates that arrived before answering
      if (earlyCandidatesRef.current.length > 0) {
        for (const cand of earlyCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.error('Error adding buffered ICE candidate on receiver', err);
          }
        }
        earlyCandidatesRef.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('accept-call', {
        to: activeCall.peerId,
        answer,
        receiverName: user?.name,
        receiverAvatar: user?.avatarUrl,
      });

      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      startCallTimer();
    } catch (e) {
      console.error('Error accepting call:', e);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (!activeCall || !socket) return;
    socket.emit('reject-call', {
      to: activeCall.peerId,
      conversationId: activeCall.conversationId,
      type: activeCall.type,
    });
    cleanupCall();
  };

  const endCall = () => {
    if (!activeCall || !socket) return;
    socket.emit('end-call', {
      to: activeCall.peerId,
      conversationId: activeCall.conversationId,
      type: activeCall.type,
      duration: callDuration,
    });
    cleanupCall();
  };

  const toggleMute = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const nextMuted = !audioTrack.enabled;
      setIsMuted(nextMuted);
      if (socket && activeCallRef.current) {
        socket.emit('call-media-state', {
          to: activeCallRef.current.peerId,
          videoEnabled: !isVideoMuted,
          audioEnabled: !nextMuted,
          isScreenSharing,
        });
      }
    }
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const nextVideoMuted = !videoTrack.enabled;
      setIsVideoMuted(nextVideoMuted);
      if (socket && activeCallRef.current) {
        socket.emit('call-media-state', {
          to: activeCallRef.current.peerId,
          videoEnabled: !nextVideoMuted,
          audioEnabled: !isMuted,
          isScreenSharing,
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;
        screenTrackRef.current = screenTrack;

        const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          peerConnectionRef.current.addTrack(screenTrack, localStream || new MediaStream());
        }

        screenTrack.onended = () => {
          stopScreenShareHelper();
        };

        setIsScreenSharing(true);
        if (socket && activeCallRef.current) {
          socket.emit('call-media-state', {
            to: activeCallRef.current.peerId,
            videoEnabled: true,
            audioEnabled: !isMuted,
            isScreenSharing: true,
          });
        }
      } catch (err) {
        console.error('Error starting screen share', err);
      }
    } else {
      stopScreenShareHelper();
    }
  };

  const stopScreenShareHelper = async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (peerConnectionRef.current && localStream) {
      const webcamTrack = localStream.getVideoTracks()[0];
      const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender && webcamTrack) {
        await videoSender.replaceTrack(webcamTrack);
      }
    }
    setIsScreenSharing(false);
    if (socket && activeCallRef.current) {
      socket.emit('call-media-state', {
        to: activeCallRef.current.peerId,
        videoEnabled: !isVideoMuted,
        audioEnabled: !isMuted,
        isScreenSharing: false,
      });
    }
  };

  // ─── Live Device & Camera Switchers (1:1 & Group) ───

  const switchCamera = useCallback(async (deviceId?: string) => {
    try {
      let nextFacing = currentFacingModeRef.current;
      if (!deviceId) {
        nextFacing = currentFacingModeRef.current === 'user' ? 'environment' : 'user';
        currentFacingModeRef.current = nextFacing;
        setCurrentFacingMode(nextFacing);
      }

      // 1. Handle 1:1 WebRTC Call
      if (peerConnectionRef.current && localStream) {
        const videoConstraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: nextFacing } };

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) oldVideoTrack.stop();

          const updatedStream = new MediaStream([newVideoTrack, ...localStream.getAudioTracks()]);
          setLocalStream(updatedStream);
          if (deviceId) {
            try { localStorage.setItem('chat_calling_video_in', deviceId); } catch {}
          }
        }
      }

      // 2. Handle Agora Group Call
      if (agoraManagerRef.current && activeGroupCallRef.current) {
        if (deviceId) {
          await agoraManagerRef.current.switchCamera(deviceId);
          try { localStorage.setItem('chat_calling_video_in', deviceId); } catch {}
        } else {
          // Mobile camera flip
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          if (videoDevices.length > 1) {
            const currentDevId = localStorage.getItem('chat_calling_video_in');
            const otherDev = videoDevices.find(d => d.deviceId !== currentDevId) || videoDevices[1];
            if (otherDev) {
              await agoraManagerRef.current.switchCamera(otherDev.deviceId);
              try { localStorage.setItem('chat_calling_video_in', otherDev.deviceId); } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.error('[SwitchCamera] Failed to switch camera:', err);
    }
  }, [localStream]);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    try {
      if (!deviceId) return;
      try { localStorage.setItem('chat_calling_audio_in', deviceId); } catch {}

      // 1. Handle 1:1 WebRTC Call
      if (peerConnectionRef.current && localStream) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
          video: false,
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        if (newAudioTrack) {
          const audioSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(newAudioTrack);
          }
          const oldAudioTrack = localStream.getAudioTracks()[0];
          if (oldAudioTrack) oldAudioTrack.stop();

          const updatedStream = new MediaStream([...localStream.getVideoTracks(), newAudioTrack]);
          setLocalStream(updatedStream);
        }
      }

      // 2. Handle Agora Group Call
      if (agoraManagerRef.current && activeGroupCallRef.current) {
        await agoraManagerRef.current.switchMicrophone(deviceId);
      }
    } catch (err) {
      console.error('[SwitchMicrophone] Failed to switch microphone:', err);
    }
  }, [localStream]);

  const switchAudioOutput = useCallback(async (deviceId: string) => {
    try {
      if (!deviceId) return;
      try { localStorage.setItem('chat_calling_audio_out', deviceId); } catch {}

      if ('setSinkId' in HTMLMediaElement.prototype) {
        const mediaElements = document.querySelectorAll('audio, video');
        mediaElements.forEach((el) => {
          if (typeof (el as any).setSinkId === 'function') {
            (el as any).setSinkId(deviceId).catch((e: any) => console.warn('Could not set sink id on element:', e));
          }
        });
      }
    } catch (err) {
      console.error('[SwitchAudioOutput] Failed to switch audio output:', err);
    }
  }, []);

  const cleanupCall = () => {
    if (outgoingTimeoutRef.current) {
      clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    audioSynthRef.current?.stop();
    stopCallTimer();
    setIsPeerVideoMuted(false);
    setIsPeerScreenSharing(false);
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    incomingOfferRef.current = null;
    earlyCandidatesRef.current = [];
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoMuted(false);
    setIsScreenSharing(false);
  };

  // ═══════════════════════════════════════════════════════════
  // GROUP CALL LOGIC
  // ═══════════════════════════════════════════════════════════

  // Helper to optimize encoding parameters on group call video senders
  const applyGroupSenderEncodingParams = useCallback((pc: RTCPeerConnection, isScreenShare = false) => {
    try {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender && videoSender.track) {
        const params = videoSender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        if (isScreenShare) {
          params.encodings[0].maxBitrate = 1000000; // 1 Mbps for sharp screen sharing text
          params.encodings[0].maxFramerate = 15;
          delete params.encodings[0].scaleResolutionDownBy;
        } else {
          params.encodings[0].maxBitrate = 250000; // 250 kbps max per peer in group call to save CPU & bandwidth
          params.encodings[0].maxFramerate = 20;
          params.encodings[0].scaleResolutionDownBy = 1.2;
        }
        videoSender.setParameters(params).catch(() => {});
      }
    } catch (e) {
      // Graceful fallback if browser doesn't support setting encoding parameters
    }
  }, []);

  // Helper: create a peer connection for a specific group peer
  const createGroupPeerConnection = useCallback((peerId: string, stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(iceConfigRef.current);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Apply bitrate & framerate caps for group calls to save CPU and bandwidth
    applyGroupSenderEncodingParams(pc, isGroupScreenSharing);

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setGroupRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(peerId, event.streams[0]);
          return next;
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('group-ice-candidate', {
          to: peerId,
          candidate: event.candidate,
          conversationId: activeGroupCallRef.current?.conversationId,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`Group call: ICE connection to ${peerId} ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          removeGroupPeer(peerId);
        }
      }
    };

    groupPeerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, isGroupScreenSharing, applyGroupSenderEncodingParams]);

  // Helper: remove a specific peer from the group call
  const removeGroupPeer = useCallback((peerId: string) => {
    const pc = groupPeerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      groupPeerConnectionsRef.current.delete(peerId);
    }
    setGroupRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    setActiveGroupCall(prev => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.filter(p => p.userId !== peerId),
      };
    });
  }, []);

  // Full cleanup for group call
  const cleanupGroupCall = useCallback(() => {
    audioSynthRef.current?.stop();
    setGroupCallStartedAt(null);

    // Leave Agora RTC Channel
    if (agoraManagerRef.current) {
      agoraManagerRef.current.leaveChannel().catch(() => {});
    }

    if (groupScreenTrackRef.current) {
      groupScreenTrackRef.current.stop();
      groupScreenTrackRef.current = null;
    }

    for (const [, pc] of groupPeerConnectionsRef.current) {
      pc.close();
    }
    groupPeerConnectionsRef.current.clear();

    const stream = groupLocalStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setGroupLocalStream(null);
    groupLocalStreamRef.current = null;

    setGroupRemoteStreams(new Map());
    setActiveGroupCall(null);
    setIsGroupMuted(false);
    setIsGroupVideoMuted(false);
    setIsGroupScreenSharing(false);
    setGroupCallMessages([]);
    setLatestEmojiReaction(null);
    setGroupCallVideoStates({});
    setMyGroupRole(null);
    setGroupMutedUserIds(new Set());
    setIsHandRaised(false);
    setIsFootRaised(false);
    setGroupCallHandRaisedStates({});
    setGroupCallFootRaisedStates({});
  }, []);

  // ─── Group Call Socket Listeners ───

  useEffect(() => {
    if (!socket) return;

    socket.on('group-call-incoming', (data: {
      conversationId: string;
      type: 'AUDIO' | 'VIDEO';
      initiatorId: string;
      initiatorName: string;
      initiatorAvatar?: string;
      groupName: string;
      startedAt: number;
    }) => {
      if (activeCallRef.current && activeCallRef.current.status !== 'idle') {
        socket.emit('group-call-reject', { conversationId: data.conversationId });
        return;
      }
      if (activeGroupCallRef.current && activeGroupCallRef.current.status !== 'idle') {
        socket.emit('group-call-reject', { conversationId: data.conversationId });
        return;
      }

      setActiveGroupCall({
        role: 'participant',
        type: data.type,
        conversationId: data.conversationId,
        groupName: data.groupName,
        status: 'ringing',
        participants: [{
          userId: data.initiatorId,
          name: data.initiatorName,
          avatarUrl: data.initiatorAvatar,
        }],
        startedAt: data.startedAt,
      });
      setGroupCallStartedAt(data.startedAt);
      audioSynthRef.current?.startRingtoneIncoming();

      // Trigger Web Push Notification banner
      showPushNotification(data.groupName || 'Group Call', {
        body: `${data.initiatorName || 'Someone'} started an ${data.type === 'VIDEO' ? 'video' : 'audio'} group call`,
        isCall: true,
        requireInteraction: true,
        tag: 'incoming-group-call-alert',
        conversationId: data.conversationId,
        callType: data.type,
      });
    });

    socket.on('group-call-started', (data: {
      conversationId: string;
      type: 'AUDIO' | 'VIDEO';
      participants: string[];
      myRole?: string;
      startedAt: number;
    }) => {
      setActiveGroupCall(prev => prev ? { ...prev, status: 'connected', startedAt: data.startedAt } : null);
      setGroupCallStartedAt(data.startedAt);
      if (data.myRole) {
        setMyGroupRole(data.myRole);
      }
    });

    socket.on('group-call-joined', async (data: {
      conversationId: string;
      type: 'AUDIO' | 'VIDEO';
      existingParticipants: GroupCallParticipant[];
      myRole?: string;
      startedAt: number;
      messages?: GroupChatMessage[];
    }) => {
      audioSynthRef.current?.stop();

      const stream = groupLocalStreamRef.current;
      if (!stream) return;

      if (data.messages) {
        setGroupCallMessages(data.messages);
      }

      setActiveGroupCall(prev => prev ? {
        ...prev,
        status: 'connected',
        participants: data.existingParticipants,
        startedAt: data.startedAt,
      } : null);

      if (data.myRole) {
        setMyGroupRole(data.myRole);
      }

      setGroupCallStartedAt(data.startedAt);

      // Emit initial camera status when joining so other peers know if we have video on
      const localVideoTrack = stream.getVideoTracks()[0];
      socket.emit('group-call-media-state', {
        conversationId: data.conversationId,
        videoEnabled: localVideoTrack ? localVideoTrack.enabled : false,
        audioEnabled: !isGroupMuted,
      });

      if (!agoraManagerRef.current) {
        for (const peer of data.existingParticipants) {
          try {
            const pc = createGroupPeerConnection(peer.userId, stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('group-call-offer', {
              to: peer.userId,
              offer,
              conversationId: data.conversationId,
            });
          } catch (e) {
            console.error(`Failed to create offer for ${peer.userId}`, e);
          }
        }
      }
    });

    socket.on('group-call-user-joined', (data: {
      conversationId: string;
      userId: string;
      name: string;
      avatarUrl?: string;
      role?: string;
    }) => {
      setActiveGroupCall(prev => {
        if (!prev) return null;
        if (prev.participants.find(p => p.userId === data.userId)) return prev;
        return {
          ...prev,
          participants: [...prev.participants, {
            userId: data.userId,
            name: data.name,
            avatarUrl: data.avatarUrl,
            role: data.role,
          }],
        };
      });

      // Broadcast our current media state so the newly joined user gets it
      const stream = groupLocalStreamRef.current;
      const videoTrack = stream?.getVideoTracks()[0];
      const audioTrack = stream?.getAudioTracks()[0];
      socket.emit('group-call-media-state', {
        conversationId: data.conversationId,
        videoEnabled: videoTrack ? videoTrack.enabled : false,
        audioEnabled: audioTrack ? audioTrack.enabled : true,
        handRaised: isHandRaisedRef.current,
        footRaised: isFootRaisedRef.current,
      });
    });

    socket.on('group-call-offer', async (data: {
      from: string;
      offer: any;
      conversationId: string;
    }) => {
      if (agoraManagerRef.current) return;
      const stream = groupLocalStreamRef.current;
      if (!stream) return;

      try {
        const pc = createGroupPeerConnection(data.from, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('group-call-answer', {
          to: data.from,
          answer,
          conversationId: data.conversationId,
        });
      } catch (e) {
        console.error(`Failed to handle offer from ${data.from}`, e);
      }
    });

    socket.on('group-call-answer', async (data: {
      from: string;
      answer: any;
      conversationId: string;
    }) => {
      if (agoraManagerRef.current) return;
      const pc = groupPeerConnectionsRef.current.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error(`Failed to set answer from ${data.from}`, e);
        }
      }
    });

    socket.on('group-ice-candidate', async (data: {
      from: string;
      candidate: any;
      conversationId: string;
    }) => {
      if (agoraManagerRef.current) return;
      const pc = groupPeerConnectionsRef.current.get(data.from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error(`Failed to add ICE candidate from ${data.from}`, e);
        }
      }
    });

    socket.on('group-call-user-left', (data: {
      userId: string;
      conversationId: string;
    }) => {
      removeGroupPeer(data.userId);
    });

    socket.on('group-call-ended', (data: {
      conversationId: string;
    }) => {
      setActiveGroupCall(prev => prev ? { ...prev, status: 'ended' } : null);
      setTimeout(() => cleanupGroupCall(), 2000);
    });

    socket.on('group-call-error', (data: { reason: string }) => {
      alert(`Group call error: ${data.reason}`);
      cleanupGroupCall();
    });

    // Handle incoming ephemeral meeting chat messages
    socket.on('group-call-chat-message-received', (msg: GroupChatMessage) => {
      setGroupCallMessages(prev => {
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        if (prev.some(m => m.senderId === msg.senderId && Math.abs(m.timestamp - msg.timestamp) < 500 && m.message === msg.message)) return prev;
        return [...prev, msg];
      });
    });

    // Handle incoming ephemeral emoji reactions
    socket.on('group-call-emoji-received', (data: { userId: string; emoji: string }) => {
      setLatestEmojiReaction({
        userId: data.userId,
        emoji: data.emoji,
        id: Date.now() + Math.random(),
      });
    });

    // Handle camera and audio status changes of other peers
    socket.on('group-call-media-state-received', (data: { userId: string; videoEnabled: boolean; audioEnabled: boolean; handRaised?: boolean; footRaised?: boolean; isScreenSharing?: boolean }) => {
      setGroupCallVideoStates(prev => ({
        ...prev,
        [data.userId]: data.videoEnabled,
      }));
      setGroupMutedUserIds(prev => {
        const next = new Set(prev);
        if (data.audioEnabled === false) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
      if (data.handRaised !== undefined) {
        setGroupCallHandRaisedStates(prev => ({
          ...prev,
          [data.userId]: data.handRaised || false,
        }));
      }
      if (data.footRaised !== undefined) {
        setGroupCallFootRaisedStates(prev => ({
          ...prev,
          [data.userId]: data.footRaised || false,
        }));
      }
      if (data.isScreenSharing !== undefined) {
        setGroupCallScreenSharingStates(prev => ({
          ...prev,
          [data.userId]: data.isScreenSharing || false,
        }));
      }
    });

    // Handle force mute by admin/creator
    socket.on('group-call-force-muted', async (data: { conversationId: string; byUserId?: string }) => {
      console.log('[Agora/CallContext] Received group-call-force-muted');
      setIsGroupMuted(true);
      if (agoraManagerRef.current) {
        await agoraManagerRef.current.setAudioMuted(true);
      }
      const stream = groupLocalStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      if (user) {
        setGroupMutedUserIds(prev => new Set(prev).add(user.id));
      }
      if (socket && activeGroupCallRef.current) {
        const videoTrack = stream?.getVideoTracks()[0];
        socket.emit('group-call-media-state', {
          conversationId: data.conversationId,
          videoEnabled: videoTrack ? videoTrack.enabled : false,
          audioEnabled: false,
          handRaised: isHandRaisedRef.current,
          footRaised: isFootRaisedRef.current,
        });
      }
    });

    // Handle force unmute by admin/creator
    socket.on('group-call-force-unmuted', async (data: { conversationId: string; byUserId?: string }) => {
      console.log('[Agora/CallContext] Received group-call-force-unmuted');
      setIsGroupMuted(false);
      if (agoraManagerRef.current) {
        await agoraManagerRef.current.setAudioMuted(false);
      }
      const stream = groupLocalStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach(t => { t.enabled = true; });
      }
      if (user) {
        setGroupMutedUserIds(prev => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
      }
      if (socket && activeGroupCallRef.current) {
        const videoTrack = stream?.getVideoTracks()[0];
        socket.emit('group-call-media-state', {
          conversationId: data.conversationId,
          videoEnabled: videoTrack ? videoTrack.enabled : false,
          audioEnabled: true,
          handRaised: isHandRaisedRef.current,
          footRaised: isFootRaisedRef.current,
        });
      }
    });

    return () => {
      socket.off('group-call-incoming');
      socket.off('group-call-started');
      socket.off('group-call-joined');
      socket.off('group-call-user-joined');
      socket.off('group-call-offer');
      socket.off('group-call-answer');
      socket.off('group-ice-candidate');
      socket.off('group-call-user-left');
      socket.off('group-call-ended');
      socket.off('group-call-error');
      socket.off('group-call-chat-message-received');
      socket.off('group-call-emoji-received');
      socket.off('group-call-media-state-received');
      socket.off('group-call-force-muted');
      socket.off('group-call-force-unmuted');
    };
  }, [socket, createGroupPeerConnection, removeGroupPeer, cleanupGroupCall]);

  // ─── Group Call Actions ───

  // ─── Group Call Actions ───

  const startGroupCall = useCallback(async (
    conversationId: string,
    groupName: string,
    type: 'AUDIO' | 'VIDEO'
  ) => {
    if (!socket || !user) return;
    if (isUserInCallOnOtherDevice) {
      alert('You are already active in a call on another device.');
      return;
    }

    try {
      setActiveGroupCall({
        role: 'initiator',
        type,
        conversationId,
        groupName,
        status: 'connecting',
        participants: [],
      });

      // Join Agora RTC Channel
      let stream: MediaStream;
      if (agoraManagerRef.current) {
        const agoraRes = await agoraManagerRef.current.joinChannel({
          channelName: conversationId,
          userId: user.id,
          type,
        });
        stream = agoraRes.localStream;
      } else {
        stream = await initMedia(type, true);
      }

      setGroupLocalStream(stream);
      groupLocalStreamRef.current = stream;
      setIsGroupMuted(false);
      setIsGroupVideoMuted(type === 'VIDEO' ? false : true);

      socket.emit('group-call-initiate', { conversationId, type });
    } catch (e) {
      console.error('Failed to start group call with Agora', e);
      cleanupGroupCall();
    }
  }, [socket, user, cleanupGroupCall]);

  const joinGroupCall = useCallback(async (convoIdToJoin?: string, convoTypeToJoin?: 'AUDIO' | 'VIDEO') => {
    const activeConvoId = convoIdToJoin && typeof convoIdToJoin === 'string' ? convoIdToJoin : activeGroupCall?.conversationId || currentConvoId;
    const callType = convoTypeToJoin && typeof convoTypeToJoin === 'string' ? convoTypeToJoin : activeGroupCall?.type || groupCallStatus?.type || 'VIDEO';

    if (!activeConvoId || !socket || !user) return;
    if (isUserInCallOnOtherDevice) {
      alert('You are already active in a call on another device.');
      return;
    }

    try {
      audioSynthRef.current?.stop();
      
      setActiveGroupCall({
        role: 'participant',
        type: callType,
        conversationId: activeConvoId,
        groupName: activeGroupCall?.groupName || 'Group',
        status: 'connecting',
        participants: activeGroupCall?.participants || [],
      });

      // Join Agora RTC Channel
      let stream: MediaStream;
      if (agoraManagerRef.current) {
        const agoraRes = await agoraManagerRef.current.joinChannel({
          channelName: activeConvoId,
          userId: user.id,
          type: callType,
        });
        stream = agoraRes.localStream;
      } else {
        stream = await initMedia(callType, true);
      }

      setGroupLocalStream(stream);
      groupLocalStreamRef.current = stream;
      setIsGroupMuted(false);
      setIsGroupVideoMuted(callType === 'VIDEO' ? false : true);

      socket.emit('group-call-join', {
        conversationId: activeConvoId,
        type: callType,
      });
    } catch (e) {
      console.error('Failed to join group call with Agora', e);
      cleanupGroupCall();
    }
  }, [activeGroupCall, groupCallStatus, currentConvoId, socket, user, cleanupGroupCall]);

  const rejectGroupCall = useCallback(() => {
    if (!activeGroupCall || !socket) return;
    audioSynthRef.current?.stop();
    socket.emit('group-call-reject', {
      conversationId: activeGroupCall.conversationId,
    });
    setActiveGroupCall(null);
  }, [activeGroupCall, socket]);

  const leaveGroupCall = useCallback(() => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket) return;
    socket.emit('group-call-leave', {
      conversationId: activeCallConvoId,
      duration: groupCallDuration,
    });
    cleanupGroupCall();
  }, [activeGroupCall, currentConvoId, socket, groupCallDuration, cleanupGroupCall]);

  const toggleGroupMute = useCallback(() => {
    const nextMuted = !isGroupMuted;
    setIsGroupMuted(nextMuted);

    if (agoraManagerRef.current) {
      agoraManagerRef.current.setAudioMuted(nextMuted);
    }

    const stream = groupLocalStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !nextMuted;
      }
    }

    if (user) {
      setGroupMutedUserIds(prev => {
        const next = new Set(prev);
        if (nextMuted) {
          next.add(user.id);
        } else {
          next.delete(user.id);
        }
        return next;
      });
    }

    if (socket && activeGroupCallRef.current) {
      const videoTrack = stream ? stream.getVideoTracks()[0] : null;
      socket.emit('group-call-media-state', {
        conversationId: activeGroupCallRef.current.conversationId,
        videoEnabled: videoTrack ? videoTrack.enabled : false,
        audioEnabled: !nextMuted,
        handRaised: isHandRaisedRef.current,
        footRaised: isFootRaisedRef.current,
      });
    }
  }, [socket, isGroupMuted, user]);

  const toggleGroupVideo = useCallback(() => {
    const nextVideoMuted = !isGroupVideoMuted;
    setIsGroupVideoMuted(nextVideoMuted);

    if (agoraManagerRef.current) {
      agoraManagerRef.current.setVideoMuted(nextVideoMuted);
    }

    const stream = groupLocalStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !nextVideoMuted;
      }
    }

    if (socket && activeGroupCallRef.current) {
      socket.emit('group-call-media-state', {
        conversationId: activeGroupCallRef.current.conversationId,
        videoEnabled: !nextVideoMuted,
        audioEnabled: !isGroupMuted,
        handRaised: isHandRaisedRef.current,
        footRaised: isFootRaisedRef.current,
      });
    }
  }, [socket, isGroupVideoMuted, isGroupMuted]);

  const toggleGroupScreenShare = useCallback(async () => {
    if (!isGroupScreenSharing) {
      try {
        let screenTrack: MediaStreamTrack | null = null;
        if (agoraManagerRef.current) {
          screenTrack = await agoraManagerRef.current.startScreenShare();
        } else {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenTrack = screenStream.getVideoTracks()[0];
        }

        if (!screenTrack) return;
        groupScreenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          stopGroupScreenShareHelper();
        };

        setIsGroupScreenSharing(true);

        if (socket && activeGroupCallRef.current) {
          socket.emit('group-call-media-state', {
            conversationId: activeGroupCallRef.current.conversationId,
            videoEnabled: true,
            audioEnabled: !isGroupMuted,
            handRaised: isHandRaisedRef.current,
            footRaised: isFootRaisedRef.current,
            isScreenSharing: true,
          });
        }
      } catch (err) {
        console.error('Error starting group screen share', err);
      }
    } else {
      stopGroupScreenShareHelper();
    }
  }, [isGroupScreenSharing, isGroupMuted, socket]);

  const stopGroupScreenShareHelper = useCallback(async () => {
    if (agoraManagerRef.current) {
      await agoraManagerRef.current.stopScreenShare();
    }
    if (groupScreenTrackRef.current) {
      groupScreenTrackRef.current.stop();
      groupScreenTrackRef.current = null;
    }
    setIsGroupScreenSharing(false);

    if (socket && activeGroupCallRef.current) {
      const stream = groupLocalStreamRef.current;
      const videoTrack = stream ? stream.getVideoTracks()[0] : null;
      const audioTrack = stream ? stream.getAudioTracks()[0] : null;
      socket.emit('group-call-media-state', {
        conversationId: activeGroupCallRef.current.conversationId,
        videoEnabled: videoTrack ? videoTrack.enabled : false,
        audioEnabled: audioTrack ? audioTrack.enabled : !isGroupMuted,
        handRaised: isHandRaisedRef.current,
        footRaised: isFootRaisedRef.current,
        isScreenSharing: false,
      });
    }
  }, [socket, isGroupMuted]);

  const sendGroupCallMessage = useCallback((message: string) => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket || !message.trim()) return;

    const msgId = `${user?.id || 'anon'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const msgData: GroupChatMessage = {
      id: msgId,
      senderId: user?.id || 'unknown',
      senderName: user?.name || user?.username || 'You',
      message: message.trim(),
      timestamp: Date.now(),
    };

    // Add locally immediately
    setGroupCallMessages(prev => [...prev, msgData]);

    // Send to other peers
    socket.emit('group-call-chat-message', {
      id: msgId,
      conversationId: activeCallConvoId,
      message: msgData.message,
      senderName: msgData.senderName,
    });
  }, [activeGroupCall, currentConvoId, socket, user]);

  const triggerGroupCallEmoji = useCallback((emoji: string) => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket) return;

    // Set locally
    setLatestEmojiReaction({
      userId: user?.id || 'unknown',
      emoji,
      id: Date.now() + Math.random(),
    });

    // Send to other peers
    socket.emit('group-call-emoji', {
      conversationId: activeCallConvoId,
      emoji,
    });
  }, [activeGroupCall, currentConvoId, socket, user]);

  const adminMuteAll = useCallback(() => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket) return;
    if (activeGroupCall?.participants) {
      setGroupMutedUserIds(prev => {
        const next = new Set(prev);
        activeGroupCall.participants.forEach(p => {
          if (p.userId !== user?.id) next.add(p.userId);
        });
        return next;
      });
    }
    socket.emit('group-call-admin-mute-all', { conversationId: activeCallConvoId });
  }, [activeGroupCall, currentConvoId, socket, user]);

  const toggleHandRaise = useCallback(() => {
    setIsHandRaised(prev => {
      const nextVal = !prev;
      isHandRaisedRef.current = nextVal;
      if (user) {
        setGroupCallHandRaisedStates(prevStates => ({
          ...prevStates,
          [user.id]: nextVal,
        }));
      }
      if (socket && activeGroupCallRef.current) {
        const stream = groupLocalStreamRef.current;
        const videoTrack = stream?.getVideoTracks()[0];
        const audioTrack = stream?.getAudioTracks()[0];
        socket.emit('group-call-media-state', {
          conversationId: activeGroupCallRef.current.conversationId,
          videoEnabled: videoTrack ? videoTrack.enabled : false,
          audioEnabled: audioTrack ? audioTrack.enabled : true,
          handRaised: nextVal,
          footRaised: isFootRaisedRef.current,
        });
      }
      return nextVal;
    });
  }, [socket, user]);

  const toggleFootRaise = useCallback(() => {
    setIsFootRaised(prev => {
      const nextVal = !prev;
      isFootRaisedRef.current = nextVal;
      if (user) {
        setGroupCallFootRaisedStates(prevStates => ({
          ...prevStates,
          [user.id]: nextVal,
        }));
      }
      if (socket && activeGroupCallRef.current) {
        const stream = groupLocalStreamRef.current;
        const videoTrack = stream?.getVideoTracks()[0];
        const audioTrack = stream?.getAudioTracks()[0];
        socket.emit('group-call-media-state', {
          conversationId: activeGroupCallRef.current.conversationId,
          videoEnabled: videoTrack ? videoTrack.enabled : false,
          audioEnabled: audioTrack ? audioTrack.enabled : true,
          handRaised: isHandRaisedRef.current,
          footRaised: nextVal,
        });
      }
      return nextVal;
    });
  }, [socket, user]);

  const adminMuteUser = useCallback((targetUserId: string) => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket) return;
    setGroupMutedUserIds(prev => new Set(prev).add(targetUserId));
    socket.emit('group-call-admin-mute-user', { conversationId: activeCallConvoId, targetUserId });
  }, [activeGroupCall, currentConvoId, socket]);

  const adminUnmuteUser = useCallback((targetUserId: string) => {
    const activeCallConvoId = activeGroupCall?.conversationId || currentConvoId;
    if (!activeCallConvoId || !socket) return;
    setGroupMutedUserIds(prev => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    socket.emit('group-call-admin-unmute-user', { conversationId: activeCallConvoId, targetUserId });
  }, [activeGroupCall, currentConvoId, socket]);

  // ═══════════════════════════════════════════════════════════
  // PROVIDER
  // ═══════════════════════════════════════════════════════════

  return (
    <CallContext.Provider
      value={{
        // 1:1 call
        activeCall,
        localStream,
        remoteStream,
        callDuration,
        isMuted,
        isVideoMuted,
        isScreenSharing,
        isPeerVideoMuted,
        isPeerScreenSharing,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,

        // Device & Camera management
        switchCamera,
        switchMicrophone,
        switchAudioOutput,
        currentFacingMode,
        isUserInCallOnOtherDevice,

        // Group call
        activeGroupCall,
        groupLocalStream,
        groupRemoteStreams,
        groupCallDuration,
        isGroupMuted,
        isGroupVideoMuted,
        isGroupScreenSharing,
        currentConvoId,
        setCurrentConvoId,
        groupCallStatus,
        groupCallMessages,
        latestEmojiReaction,
        groupCallVideoStates,
        groupCallScreenSharingStates,
        groupMutedUserIds,
        myGroupRole,
        isHandRaised,
        isFootRaised,
        groupCallHandRaisedStates,
        groupCallFootRaisedStates,
        startGroupCall,
        joinGroupCall,
        rejectGroupCall,
        leaveGroupCall,
        toggleGroupMute,
        toggleGroupVideo,
        toggleGroupScreenShare,
        sendGroupCallMessage,
        triggerGroupCallEmoji,
        adminMuteAll,
        toggleHandRaise,
        toggleFootRaise,
        adminMuteUser,
        adminUnmuteUser,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
