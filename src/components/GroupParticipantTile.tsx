'use client';

import React from 'react';
import styles from './CallOverlay.module.css';
import { useAudioActivity } from '../hooks/useAudioActivity';

interface GroupParticipantTileProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  stream?: MediaStream | null;
  hasVideo: boolean;
  isMuted: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isFootRaised?: boolean;
  isFocused?: boolean;
  onClick?: () => void;
  getDiscordAdaptiveBg: (userId: string) => string;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
}

export const GroupParticipantTile: React.FC<GroupParticipantTileProps> = React.memo(({
  userId,
  name,
  avatarUrl,
  stream,
  hasVideo,
  isMuted,
  isScreenSharing,
  isHandRaised,
  isFootRaised,
  isFocused,
  onClick,
  getDiscordAdaptiveBg,
  onVideoRef,
}) => {
  const isSpeaking = useAudioActivity(stream || null, isMuted);

  return (
    <div
      className={`${styles.groupVideoTile} ${isSpeaking ? styles.speakingGlow : ''}`}
      onClick={onClick}
      title={`Click to focus ${name}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {hasVideo && stream ? (
        <video
          autoPlay
          playsInline
          className={styles.groupVideoEl}
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
            }
            onVideoRef?.(el);
          }}
        />
      ) : (
        <div
          className={styles.groupVideoPlaceholder}
          style={{ backgroundColor: getDiscordAdaptiveBg(userId) }}
        >
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name || userId}`}
            alt={name}
            className={styles.groupPlaceholderAvatar}
          />
        </div>
      )}

      {/* Label and Indicators */}
      <div className={styles.groupTileLabel}>
        {isSpeaking && <span className={styles.speakingWaveDot} />}
        {isScreenSharing && '💻 '}
        {name}
        {isScreenSharing && ' (Sharing Screen)'}
        {isHandRaised && ' 🖐️'}
        {isFootRaised && ' 🦶'}
        {isMuted && ' 🔇'}
      </div>
    </div>
  );
});

GroupParticipantTile.displayName = 'GroupParticipantTile';
