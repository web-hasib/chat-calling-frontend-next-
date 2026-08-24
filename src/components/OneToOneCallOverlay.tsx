'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './CallOverlay.module.css';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoOn, VideoOff, Monitor, Settings, Volume2, Smartphone, Shield } from 'lucide-react';
import { DeviceSettingsModal } from './DeviceSettingsModal';
import { startIncomingCallRingtoneLoop, stopIncomingCallRingtoneLoop } from '../utils/notifications';

interface OneToOneCallOverlayProps {
  activeCall: {
    type: 'AUDIO' | 'VIDEO';
    status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'busy' | 'declined' | 'ended';
    role: 'caller' | 'receiver';
    peerName?: string;
    peerAvatar?: string;
  };
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  isMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  formatTime: (sec: number) => string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export const OneToOneCallOverlay: React.FC<OneToOneCallOverlayProps> = ({
  activeCall,
  localStream,
  remoteStream,
  callDuration,
  isMuted,
  isVideoMuted,
  isScreenSharing,
  formatTime,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}) => {
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Mobile environment & Audio routing states
  const [isMobile, setIsMobile] = useState(false);
  const [isSpeakerphone, setIsSpeakerphone] = useState(activeCall.type === 'VIDEO');
  const [isNearEar, setIsNearEar] = useState(false);

  // PIP Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDocked, setIsDocked] = useState<'left' | 'right' | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Detect mobile / touch environment
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Screen WakeLock during active calls
  useEffect(() => {
    let wakeLock: any = null;
    const requestWake = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && activeCall.status === 'connected') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch {}
      }
    };
    requestWake();

    return () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch {}
      }
    };
  }, [activeCall.status]);

  // Audio output routing (Speakerphone vs Earpiece)
  const applyAudioSink = useCallback(async (speaker: boolean) => {
    try {
      const targetEl = activeCall.type === 'VIDEO' ? remoteVideoElRef.current : remoteAudioElRef.current;
      if (!targetEl) return;

      if (!('setSinkId' in HTMLMediaElement.prototype)) return;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      if (audioOutputs.length === 0) return;

      let chosenDevice = null;
      if (speaker) {
        chosenDevice =
          audioOutputs.find(
            (d) =>
              d.label.toLowerCase().includes('speaker') ||
              d.label.toLowerCase().includes('loudspeaker') ||
              d.deviceId === 'default'
          ) || audioOutputs[0];
      } else {
        chosenDevice =
          audioOutputs.find(
            (d) =>
              d.label.toLowerCase().includes('earpiece') ||
              d.label.toLowerCase().includes('headset') ||
              d.label.toLowerCase().includes('phone') ||
              d.label.toLowerCase().includes('internal')
          ) ||
          audioOutputs.find((d) => d.deviceId !== 'default') ||
          audioOutputs[0];
      }

      if (chosenDevice?.deviceId && typeof (targetEl as any).setSinkId === 'function') {
        await (targetEl as any).setSinkId(chosenDevice.deviceId);
      }
    } catch (err) {
      console.warn('[AudioSink] Failed to set sink ID:', err);
    }
  }, [activeCall.type]);

  const handleToggleSpeakerphone = () => {
    const nextSpeaker = !isSpeakerphone;
    setIsSpeakerphone(nextSpeaker);
    applyAudioSink(nextSpeaker);
  };

  const startClientPosRef = useRef({ x: 0, y: 0 });
  const didDragMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    didDragMovedRef.current = false;
    startClientPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const movedDist = Math.hypot(e.clientX - startClientPosRef.current.x, e.clientY - startClientPosRef.current.y);
    if (movedDist > 6) {
      didDragMovedRef.current = true;
    }

    let newX = e.clientX - dragStartRef.current.x;
    let newY = e.clientY - dragStartRef.current.y;

    const padding = 16;
    const pipWidth = 110;

    const minX = -(window.innerWidth - pipWidth - padding);
    const maxX = pipWidth + 20;
    const minY = -window.innerHeight + 160 + padding;
    const maxY = padding;

    newX = Math.max(minX - 30, Math.min(newX, maxX + 30));
    newY = Math.max(minY, Math.min(newY, maxY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const padding = 16;
    const pipWidth = 110;
    const minX = -(window.innerWidth - pipWidth - padding);

    // If tapped without dragging, and is currently docked -> undock immediately
    if (!didDragMovedRef.current) {
      if (isDocked) {
        if (isDocked === 'left') {
          setPosition(prev => ({ ...prev, x: minX + 20 }));
        } else {
          setPosition(prev => ({ ...prev, x: 0 }));
        }
        setIsDocked(null);
      }
      return;
    }

    if (position.x <= minX + 60) {
      setIsDocked('left');
      setPosition(prev => ({ ...prev, x: minX - pipWidth + 22 }));
    } else if (position.x >= 20) {
      setIsDocked('right');
      setPosition(prev => ({ ...prev, x: pipWidth + 20 - 22 }));
    } else {
      setIsDocked(null);
    }
  };

  const handlePipClick = (e: React.MouseEvent) => {
    if (isDocked) {
      e.stopPropagation();
      const padding = 16;
      const pipWidth = 110;
      const minX = -(window.innerWidth - pipWidth - padding);
      if (isDocked === 'left') {
        setPosition(prev => ({ ...prev, x: minX + 20 }));
      } else {
        setPosition(prev => ({ ...prev, x: 0 }));
      }
      setIsDocked(null);
    }
  };

  useEffect(() => {
    if (localVideoElRef.current && localStream) {
      localVideoElRef.current.srcObject = localStream;
      localVideoElRef.current.play().catch(() => {});
    }
  }, [localStream, activeCall.status, isVideoMuted]);

  useEffect(() => {
    if (remoteVideoElRef.current && remoteStream) {
      remoteVideoElRef.current.srcObject = remoteStream;
      remoteVideoElRef.current.play().catch(() => {});
      applyAudioSink(isSpeakerphone);
    }
  }, [remoteStream, activeCall.status, applyAudioSink, isSpeakerphone]);

  useEffect(() => {
    if (remoteAudioElRef.current && remoteStream) {
      remoteAudioElRef.current.srcObject = remoteStream;
      remoteAudioElRef.current.play().catch(() => {});
      applyAudioSink(isSpeakerphone);
    }
  }, [remoteStream, activeCall.status, applyAudioSink, isSpeakerphone]);

  useEffect(() => {
    if (activeCall.status === 'ringing' && activeCall.role === 'receiver') {
      startIncomingCallRingtoneLoop();
    } else {
      stopIncomingCallRingtoneLoop();
    }
    return () => {
      stopIncomingCallRingtoneLoop();
    };
  }, [activeCall.status, activeCall.role]);

  const isRinging = activeCall.status === 'ringing';
  const isConnected = activeCall.status === 'connected';

  if (activeCall.type === 'VIDEO' && isConnected) {
    return (
      <div className={styles.videoContainer}>
        {/* Live Call Timer */}
        <div className={styles.timerOverlay}>
          <div className={styles.timerDot} />
          <span>{formatTime(callDuration)}</span>
        </div>

        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoElRef}
          autoPlay
          playsInline
          className={styles.remoteVideo}
        />

        {/* Local Video (Floating Drag-and-Drop PIP) */}
        {!isVideoMuted && (
          <video
            ref={localVideoElRef}
            autoPlay
            playsInline
            muted
            className={`${styles.localVideo} ${isDocked ? styles.localVideoDocked : ''}`}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handlePipClick}
            title={isDocked ? 'Click to show preview' : undefined}
          />
        )}

        {/* Call controls overlay */}
        <div className={styles.videoControls}>
          <button
            className={isMuted ? styles.videoBtnMuted : styles.videoBtn}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            className={isVideoMuted ? styles.videoBtnMuted : styles.videoBtn}
            onClick={onToggleVideo}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff size={20} /> : <VideoOn size={20} />}
          </button>

          {isMobile ? (
            <button
              className={isSpeakerphone ? styles.videoBtnActive : styles.videoBtn}
              onClick={handleToggleSpeakerphone}
              title={isSpeakerphone ? 'Speakerphone (Loudspeaker)' : 'Earpiece'}
            >
              {isSpeakerphone ? <Volume2 size={20} /> : <Smartphone size={20} />}
            </button>
          ) : (
            <button
              className={isScreenSharing ? styles.videoBtnActive : styles.videoBtn}
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor size={20} />
            </button>
          )}

          <button
            className={showSettingsModal ? styles.videoBtnActive : styles.videoBtn}
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            title="Audio & Video Settings"
          >
            <Settings size={20} />
          </button>

          <button className={styles.videoBtnEnd} onClick={onEnd} title="End Call">
            <PhoneOff size={20} />
          </button>
        </div>

        <DeviceSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      {/* Optional Proximity Ear Screen Guard when near ear */}
      {isNearEar && isConnected && (
        <div className={styles.proximityScreenLock} onClick={() => setIsNearEar(false)}>
          <Shield size={36} style={{ marginBottom: '8px', opacity: 0.6 }} />
          <span>Screen Locked Near Ear</span>
          <span style={{ fontSize: '11px', marginTop: '4px', opacity: 0.5 }}>Tap screen to unlock</span>
        </div>
      )}

      <div className={styles.panel}>
        {/* Live Call Timer (audio connected) */}
        {isConnected && activeCall.type === 'AUDIO' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px', color: 'var(--text-secondary)', marginBottom: '-10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
            <span>{formatTime(callDuration)}</span>
          </div>
        )}

        <img
          src={activeCall.peerAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeCall.peerName || 'peer'}`}
          alt="Peer avatar"
          className={isRinging ? styles.ringingAvatar : styles.avatar}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <h2 className={styles.name}>{activeCall.peerName || 'Peer User'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            {activeCall.type === 'VIDEO' ? (
              <VideoOn size={16} style={{ color: 'var(--accent-primary, #3b82f6)' }} />
            ) : (
              <Phone size={14} style={{ color: 'var(--accent-success, #22c55e)' }} />
            )}
            <span
              className={styles.status}
              style={{
                margin: 0,
                fontSize: '13px',
                color: activeCall.status === 'busy' || activeCall.status === 'declined' || activeCall.status === 'ended'
                  ? '#ef4444'
                  : undefined,
              }}
            >
              {activeCall.status === 'ringing'
                ? activeCall.role === 'caller'
                  ? `${activeCall.type === 'VIDEO' ? 'Video' : 'Audio'} Call Ringing...`
                  : `Incoming ${activeCall.type === 'VIDEO' ? 'Video' : 'Audio'} Call...`
                : activeCall.status === 'connecting'
                ? 'Connecting...'
                : activeCall.status === 'busy'
                ? 'User is busy on another call'
                : activeCall.status === 'declined'
                ? 'Call declined'
                : activeCall.status === 'ended'
                ? 'Call ended'
                : `Connected (${activeCall.type === 'VIDEO' ? 'Video' : 'Audio'} Call)`}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          {activeCall.status === 'busy' || activeCall.status === 'declined' || activeCall.status === 'ended' ? null : (
            isRinging && activeCall.role === 'receiver' ? (
              <>
                <button
                  className={`${styles.btn} ${styles.btnAnswer}`}
                  onClick={onAccept}
                  title="Answer Call"
                >
                  <Phone size={24} />
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDecline}`}
                  onClick={onReject}
                  title="Decline Call"
                >
                  <PhoneOff size={24} />
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {isConnected && activeCall.type === 'AUDIO' && (
                  <>
                    <button
                      className={`${styles.btn} ${isMuted ? styles.btnDecline : styles.btn}`}
                      style={{ background: isMuted ? undefined : 'rgba(255,255,255,0.1)', color: isMuted ? 'white' : 'var(--text-primary)' }}
                      onClick={onToggleMute}
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    {/* Mobile Speakerphone Toggle */}
                    {isMobile && (
                      <button
                        className={isSpeakerphone ? styles.speakerBtnActive : styles.speakerBtn}
                        onClick={handleToggleSpeakerphone}
                        title={isSpeakerphone ? 'Speakerphone On' : 'Earpiece Mode'}
                      >
                        {isSpeakerphone ? <Volume2 size={22} /> : <Smartphone size={22} />}
                        <span>{isSpeakerphone ? 'Speaker' : 'Earpiece'}</span>
                      </button>
                    )}

                    {/* Ear protect mode toggle for mobile */}
                    {isMobile && (
                      <button
                        className={styles.speakerBtn}
                        onClick={() => setIsNearEar(true)}
                        title="Lock screen while holding near ear"
                      >
                        <Shield size={20} />
                        <span>Ear Lock</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  className={`${styles.btn} ${styles.btnDecline}`}
                  onClick={activeCall.role === 'caller' && isRinging ? onReject : onEnd}
                  title="End Call"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            )
          )}
        </div>

        {/* Hidden audio element to play remote stream in audio call */}
        {isConnected && activeCall.type === 'AUDIO' && (
          <audio
            ref={remoteAudioElRef}
            autoPlay
            playsInline
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

