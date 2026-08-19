'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Video, VideoOff, Mic, MicOff, Send, SkipForward, 
  Play, X, Sliders, User, MessageSquare, ArrowLeft, Loader2
} from 'lucide-react';

interface PeerInfo {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function LivePage() {
  const { socket, onlineUsers } = useSocket();
  const { user, token, loading } = useAuth();
  const router = useRouter();

  // Glassmorphic Customization States
  const [blurVal, setBlurVal] = useState<number>(20);
  const [glassColor, setGlassColor] = useState<string>('rgba(255, 255, 255, 0.08)');
  const [glassColorHex, setGlassColorHex] = useState<string>('#ffffff');
  const [glassOpacity, setGlassOpacity] = useState<number>(0.08);
  const [borderRadius, setBorderRadius] = useState<number>(24);
  const [gapVal, setGapVal] = useState<number>(16);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Responsive / Mobile Specific Chat States
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [hasNewMessage, setHasNewMessage] = useState<boolean>(false);

  // Matchmaking & WebRTC States
  const [status, setStatus] = useState<'idle' | 'searching' | 'connected'>('idle');
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [role, setRole] = useState<'initiator' | 'receiver' | null>(null);
  
  // Media controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  
  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  
  // Streams & WebRTC connection references
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Queue to buffer WebRTC signals that arrive before the peer connection is fully initialized
  const signalQueueRef = useRef<any[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && (!token || !user)) {
      router.push('/');
    }
  }, [loading, token, user, router]);

  // Load custom theme settings from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBlur = localStorage.getItem('live_blurVal');
      const storedColor = localStorage.getItem('live_glassColorHex');
      const storedOpacity = localStorage.getItem('live_glassOpacity');
      const storedRadius = localStorage.getItem('live_borderRadius');
      const storedGap = localStorage.getItem('live_gapVal');

      if (storedBlur) setBlurVal(Number(storedBlur));
      if (storedColor) setGlassColorHex(storedColor);
      if (storedOpacity) setGlassOpacity(Number(storedOpacity));
      if (storedRadius) setBorderRadius(Number(storedRadius));
      if (storedGap) setGapVal(Number(storedGap));
    }
  }, []);

  // Save customization changes to localStorage and apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--liquid-glass-blur', `${blurVal}px`);
    root.style.setProperty('--glass-border-radius', `${borderRadius}px`);
    root.style.setProperty('--glass-gap', `${gapVal}px`);
    
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgb = hexToRgb(glassColorHex);
    if (rgb) {
      const rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glassOpacity})`;
      setGlassColor(rgbaStr);
      root.style.setProperty('--liquid-glass-bg', rgbaStr);
      root.style.setProperty('--liquid-glass-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(glassOpacity + 0.1, 0.4)})`);
    }

    localStorage.setItem('live_blurVal', String(blurVal));
    localStorage.setItem('live_glassColorHex', glassColorHex);
    localStorage.setItem('live_glassOpacity', String(glassOpacity));
    localStorage.setItem('live_borderRadius', String(borderRadius));
    localStorage.setItem('live_gapVal', String(gapVal));
  }, [blurVal, glassColorHex, glassOpacity, borderRadius, gapVal]);

  // Handle auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showMobileChat]);

  // WebRTC Stream binding useEffect hooks to bypass React async render timing issues
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Process a single WebRTC signal
  const processSignal = async (signal: any, pc: RTCPeerConnection) => {
    try {
      if (signal.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket) {
          socket.emit('live-webrtc-signal', { signal: { answer } });
        }
      } else if (signal.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Error processing WebRTC signal:', err);
    }
  };

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('waiting-in-queue', () => {
      setStatus('searching');
      cleanupWebRTC();
      setPeer(null);
      setMessages([]);
    });

    socket.on('live-match-found', async (data: { peer: PeerInfo; role: 'initiator' | 'receiver' }) => {
      setPeer(data.peer);
      setRole(data.role);
      setStatus('connected');
      setMessages([]);

      try {
        await startWebRTC(data.role, data.peer.id);
      } catch (err) {
        console.error('Failed to initialize WebRTC', err);
      }
    });

    // When the peer skips this client, clean up and automatically re-queue
    socket.on('live-peer-skipped', () => {
      cleanupWebRTC();
      setPeer(null);
      setStatus('searching');
      socket.emit('join-live-queue');
    });

    // When the peer disconnects, clean up and automatically re-queue
    socket.on('live-peer-disconnected', () => {
      cleanupWebRTC();
      setPeer(null);
      setStatus('searching');
      socket.emit('join-live-queue');
    });

    socket.on('live-message-received', (data: { senderId: string; content: string; createdAt: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderId: data.senderId,
          content: data.content,
          createdAt: new Date(data.createdAt),
        },
      ]);

      if (!showMobileChat) {
        setHasNewMessage(true);
      }
    });

    socket.on('live-webrtc-signal', async (data: { signal: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        // Queue the signal to process once peerConnection is fully ready
        signalQueueRef.current.push(data.signal);
        return;
      }
      await processSignal(data.signal, pc);
    });

    return () => {
      socket.off('waiting-in-queue');
      socket.off('live-match-found');
      socket.off('live-peer-skipped');
      socket.off('live-peer-disconnected');
      socket.off('live-message-received');
      socket.off('live-webrtc-signal');
    };
  }, [socket, showMobileChat]);

  // Request Camera & Microphone
  const initLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing camera/mic:', err);
      alert('Could not access your camera or microphone. Please enable permissions.');
      throw err;
    }
  };

  // Initialize WebRTC connection
  const startWebRTC = async (currentRole: 'initiator' | 'receiver', peerId: string) => {
    // Clear out any old queued signals
    signalQueueRef.current = [];

    const stream = await initLocalMedia();
    const pc = new RTCPeerConnection(iceConfig);

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
        socket.emit('live-webrtc-signal', {
          signal: { candidate: event.candidate },
        });
      }
    };

    // Save the reference to the RTCPeerConnection
    peerConnectionRef.current = pc;

    // Process any signals that were received while peer connection was warming up
    const queued = signalQueueRef.current;
    signalQueueRef.current = [];
    for (const sig of queued) {
      await processSignal(sig, pc);
    }

    if (currentRole === 'initiator' && socket) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('live-webrtc-signal', { signal: { offer } });
    }
  };

  // Clean up WebRTC peer connection
  const cleanupWebRTC = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
  };

  // Completely clean up local media stream
  const stopLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  // Start Matching queue
  const startMatching = async () => {
    if (!socket) return;
    try {
      setStatus('searching');
      await initLocalMedia();
      socket.emit('join-live-queue');
    } catch (err) {
      setStatus('idle');
    }
  };

  // Skip Match
  const skipMatch = () => {
    if (!socket) return;
    socket.emit('skip-live');
  };

  // Stop Matchmaking
  const stopMatching = () => {
    if (!socket) return;
    socket.emit('leave-live-queue');
    cleanupWebRTC();
    stopLocalMedia();
    setPeer(null);
    setStatus('idle');
    setShowMobileChat(false);
  };

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !peer) return;

    socket.emit('send-live-message', { content: chatInput });
    
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        senderId: user?.id || '',
        content: chatInput,
        createdAt: new Date(),
      },
    ]);
    setChatInput('');
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleMobileChat = () => {
    setShowMobileChat(!showMobileChat);
    setHasNewMessage(false);
  };

  return (
    <div className="glass-live-container">
      
      {/* Background animated blobs for liquid glass glow refraction */}
      <div className="glass-bg-blobs">
        <div className="glass-blob blob-1"></div>
        <div className="glass-blob blob-2"></div>
        <div className="glass-blob blob-3"></div>
      </div>

      {/* Floating Action Settings Button */}
      <button 
        onClick={() => setShowConfig(!showConfig)}
        className="live-btn"
        style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100, padding: '10px' }}
        title="Glass Settings"
      >
        <Sliders size={18} />
      </button>

      {/* Floating Back Button */}
      <button 
        onClick={() => { stopMatching(); router.push('/chat'); }}
        className="live-btn"
        style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* TOP SECTION: 70% Video layout */}
      <div className="glass-live-top-section" style={{ zIndex: 1 }}>
        
        {/* Remote video panel ( Stranger / Main Viewport ) */}
        <div className="liquid-glass glass-video-box" style={{ width: '100%', height: '100%' }}>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="live-video-element"
            style={{ display: status === 'connected' && remoteStream ? 'block' : 'none' }}
          />

          {status !== 'connected' && (
            <div className="glass-video-overlay">
              {status === 'searching' ? (
                <div className="radar-glow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="live-video-overlay-icon" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <Loader2 size={36} className="animate-spin text-blue-400" />
                  </div>
                  <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Finding a Partner...</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>Matching with someone random</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '360px' }}>
                  <div className="live-video-overlay-icon">
                    <Video size={36} />
                  </div>
                  <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Omegle Random Chat</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                    Match with random people globally. Fully ephemeral video, audio, and text chat.
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'connected' && peer && (
            <div className="glass-video-tag">
              <User size={12} /> {peer.username}
            </div>
          )}

          {/* Local Floating Video Panel ( Self - Picture-in-Picture ) */}
          <div className="liquid-glass glass-local-video-floating">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className="live-video-element"
              style={{ transform: 'scaleX(-1)', display: localStream ? 'block' : 'none' }}
            />

            {!localStream && (
              <div className="glass-video-overlay" style={{ background: '#1c1e28' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.4 }}>
                  <Video size={20} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '10px' }}>Preview</span>
                </div>
              </div>
            )}

            {isVideoMuted && localStream && (
              <div className="glass-video-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
                <VideoOff size={20} />
                <p style={{ color: 'white', fontSize: '10px', marginTop: '4px' }}>Muted</p>
              </div>
            )}

            <div className="glass-video-tag" style={{ bottom: '8px', left: '8px', padding: '3px 8px', fontSize: '10px' }}>
              You
            </div>
          </div>

        </div>

      </div>

      {/* FLOATING MOBILE CHAT OVERLAY */}
      {showMobileChat && (
        <div className="liquid-glass live-mobile-chat-overlay">
          
          {/* Header of Mobile Chat */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} className="text-blue-400" />
              Chatting with {peer?.username || 'Stranger'}
            </span>
            <button 
              onClick={toggleMobileChat} 
              className="live-btn" 
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages log */}
          <div className="live-chat-messages" style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                <strong>⚠️ Safety Notice:</strong> Keep your chat friendly. Ephemeral messaging is not logged in the database.
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div 
                    key={msg.id}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      maxWidth: '85%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      marginBottom: '8px'
                    }}
                  >
                    <div className={`live-msg-bubble ${isMe ? 'live-msg-me' : 'live-msg-other'}`} style={{ padding: '8px 14px', borderRadius: '14px', fontSize: '13px' }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input bar */}
          <form onSubmit={handleSendMessage} className="live-chat-form" style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.2)' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={status !== 'connected'}
              placeholder={status === 'connected' ? "Type a message..." : "Waiting for match..."}
              className="live-chat-input"
              style={{ opacity: status === 'connected' ? 1 : 0.5 }}
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !chatInput.trim()}
              className="live-btn live-btn-primary"
              style={{ padding: '10px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* BOTTOM SECTION: 30% Controls & Chat */}
      <div className="glass-live-bottom-section" style={{ zIndex: 1 }}>
        
        {/* DESKTOP VIEW: Left Controls Card */}
        <div className="liquid-glass live-desktop-controls" style={{ padding: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={toggleMute}
              className="live-btn"
              style={{ 
                padding: '12px',
                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                color: isMuted ? '#f87171' : '#ffffff',
                flex: 1,
                justifyContent: 'center'
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={toggleVideo}
              className="live-btn"
              style={{ 
                padding: '12px',
                background: isVideoMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: isVideoMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                color: isVideoMuted ? '#f87171' : '#ffffff',
                flex: 1,
                justifyContent: 'center'
              }}
              title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          </div>

          {status === 'idle' ? (
            <button
              onClick={startMatching}
              className="live-btn live-btn-primary"
              style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '15px' }}
            >
              <Play size={18} fill="white" /> Start Matching
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={stopMatching}
                className="live-btn live-btn-danger"
                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              >
                <X size={16} /> Stop
              </button>
              <button
                onClick={skipMatch}
                className="live-btn live-btn-primary"
                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              >
                <SkipForward size={16} /> Skip
              </button>
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {onlineUsers.size} users online
          </div>
        </div>

        {/* MOBILE VIEW: Single Horizontal Row of Controls (Full width) */}
        <div className="liquid-glass live-mobile-controls">
          <div className="live-mobile-buttons-row">
            
            {/* Mic Toggle Button */}
            <button
              onClick={toggleMute}
              className="live-btn"
              style={{ 
                padding: '12px',
                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isMuted ? '#f87171' : '#ffffff',
                borderColor: isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'
              }}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className="live-btn"
              style={{ 
                padding: '12px',
                background: isVideoMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isVideoMuted ? '#f87171' : '#ffffff',
                borderColor: isVideoMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'
              }}
            >
              {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            {/* Start / Stop Matching Toggle */}
            {status === 'idle' ? (
              <button
                onClick={startMatching}
                className="live-btn live-btn-primary"
                style={{ flex: 1, padding: '12px 16px', justifyContent: 'center', gap: '8px' }}
              >
                <Play size={16} fill="white" /> Start
              </button>
            ) : (
              <button
                onClick={stopMatching}
                className="live-btn live-btn-danger"
                style={{ flex: 1, padding: '12px 16px', justifyContent: 'center', gap: '8px' }}
              >
                <X size={16} /> Stop
              </button>
            )}

            {/* Skip Button (Only active when connected or matching) */}
            <button
              onClick={skipMatch}
              disabled={status !== 'connected'}
              className="live-btn live-btn-primary"
              style={{ 
                padding: '12px', 
                opacity: status === 'connected' ? 1 : 0.4 
              }}
            >
              <SkipForward size={18} />
            </button>

            {/* Mobile Floating Chat Toggle Button */}
            <button
              onClick={toggleMobileChat}
              disabled={status !== 'connected'}
              className="live-btn"
              style={{ 
                padding: '12px',
                position: 'relative',
                background: showMobileChat ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255,255,255,0.05)',
                color: showMobileChat ? '#60a5fa' : '#ffffff',
                borderColor: showMobileChat ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)',
                opacity: status === 'connected' ? 1 : 0.4
              }}
            >
              <MessageSquare size={18} />
              {hasNewMessage && (
                <span 
                  style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    right: '2px', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: '#ef4444',
                    border: '2px solid #080a0f',
                    boxShadow: '0 0 8px #ef4444'
                  }}
                />
              )}
            </button>

          </div>
        </div>

        {/* DESKTOP VIEW: Right Chat Card */}
        <div className="liquid-glass live-chat-panel" style={{ minHeight: 'auto', height: '100%' }}>
          <div className="live-chat-messages" style={{ padding: '12px 20px', flex: 1, maxHeight: 'none' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                <strong>⚠️ Safety Notice:</strong> By clicking Start, you agree to our rules. Keep your chat friendly. Ephemeral messaging is not logged in the database.
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div 
                    key={msg.id}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      maxWidth: '85%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div className={`live-msg-bubble ${isMe ? 'live-msg-me' : 'live-msg-other'}`} style={{ padding: '8px 14px', borderRadius: '14px', fontSize: '13px' }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="live-chat-form" style={{ padding: '10px 16px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={status !== 'connected'}
              placeholder={status === 'connected' ? "Type a message..." : "Waiting for match..."}
              className="live-chat-input"
              style={{ opacity: status === 'connected' ? 1 : 0.5 }}
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !chatInput.trim()}
              className="live-btn live-btn-primary"
              style={{ padding: '10px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

      {/* Customizable glass configuration modal */}
      {showConfig && (
        <div className="live-modal-overlay">
          <div className="liquid-glass live-modal-content" style={{ padding: '24px', background: 'rgba(10, 12, 18, 0.95)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: '#60a5fa' }} /> UI Customization
              </h3>
              <button 
                onClick={() => setShowConfig(false)}
                className="live-btn"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              {/* Blur Slider */}
              <div className="live-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Glass Blur Strength</span>
                  <span style={{ color: '#60a5fa' }}>{blurVal}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  value={blurVal} 
                  onChange={(e) => setBlurVal(Number(e.target.value))}
                  className="live-settings-slider"
                />
              </div>

              {/* Opacity Slider */}
              <div className="live-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Glass Opacity</span>
                  <span style={{ color: '#60a5fa' }}>{Math.round(glassOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.01" 
                  max="0.4" 
                  step="0.01"
                  value={glassOpacity} 
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                  className="live-settings-slider"
                />
              </div>

              {/* Border Radius Slider */}
              <div className="live-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Border Radius</span>
                  <span style={{ color: '#60a5fa' }}>{borderRadius}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="48" 
                  value={borderRadius} 
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  className="live-settings-slider"
                />
              </div>

              {/* Spacing Slider */}
              <div className="live-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Section Spacing (Gap)</span>
                  <span style={{ color: '#60a5fa' }}>{gapVal}px</span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="32" 
                  value={gapVal} 
                  onChange={(e) => setGapVal(Number(e.target.value))}
                  className="live-settings-slider"
                />
              </div>

              {/* Tint Color Picker */}
              <div className="live-settings-row" style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '12px', display: 'block' }}>Glass Tint Color</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Preset Colors */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {['#ffffff', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setGlassColorHex(preset)}
                        className={`live-color-btn ${glassColorHex.toLowerCase() === preset.toLowerCase() ? 'live-color-btn-active' : ''}`}
                        style={{ backgroundColor: preset }}
                      />
                    ))}
                  </div>

                  {/* Fully Customizable Native Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '12px' }}>
                    <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                      <input 
                        type="color" 
                        value={glassColorHex}
                        onChange={(e) => setGlassColorHex(e.target.value)}
                        style={{ 
                          position: 'absolute', 
                          top: '-8px', 
                          left: '-8px', 
                          width: '48px', 
                          height: '48px', 
                          border: 'none', 
                          cursor: 'pointer',
                          background: 'transparent'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Custom Color Selector</span>
                      <span style={{ fontSize: '13px', color: 'white', fontWeight: 700, fontFamily: 'monospace' }}>{glassColorHex.toUpperCase()}</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfig(false)}
              className="live-btn live-btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            >
              Apply theme settings
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
