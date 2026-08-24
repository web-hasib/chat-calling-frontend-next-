'use client';

import React from 'react';
import styles from './CallOverlay.module.css';
import { Users, Mic, MicOff, X as CloseIcon } from 'lucide-react';

interface Participant {
  userId: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalParticipants: number;
  myUser: { id?: string; name?: string; avatarUrl?: string } | null;
  myGroupRole?: string | null;
  isGroupScreenSharing: boolean;
  isHandRaised: boolean;
  isFootRaised: boolean;
  isGroupMuted: boolean;
  sortedParticipants: Participant[];
  groupRemoteStreams: Map<string, MediaStream>;
  groupMutedUserIds: Set<string>;
  groupCallScreenSharingStates: Record<string, boolean>;
  groupCallHandRaisedStates: Record<string, boolean>;
  groupCallFootRaisedStates: Record<string, boolean>;
  onFocusUser: (userId: string | null) => void;
  onAdminMuteUser: (userId: string) => void;
  onAdminUnmuteUser: (userId: string) => void;
  onAdminMuteAll: () => void;
  onToggleMyMute?: () => void;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  isOpen,
  onClose,
  totalParticipants,
  myUser,
  myGroupRole,
  isGroupScreenSharing,
  isHandRaised,
  isFootRaised,
  isGroupMuted,
  sortedParticipants,
  groupRemoteStreams,
  groupMutedUserIds,
  groupCallScreenSharingStates,
  groupCallHandRaisedStates,
  groupCallFootRaisedStates,
  onFocusUser,
  onAdminMuteUser,
  onAdminUnmuteUser,
  onAdminMuteAll,
  onToggleMyMute,
}) => {
  if (!isOpen) return null;

  const isAdmin = myGroupRole === 'CREATOR' || myGroupRole === 'ADMIN' || myGroupRole === 'MODERATOR';

  return (
    <div className={styles.participantsModalOverlay} onClick={onClose}>
      <div className={styles.participantsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.participantsHeader}>
          <h3 className={styles.participantsTitle}>
            <Users size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Participants ({totalParticipants})</span>
          </h3>
          <button className={styles.closeModalBtn} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.participantsList}>
          {/* Local User Row (Always First) */}
          <div className={styles.participantRow}>
            <div className={styles.participantInfo}>
              <div style={{ position: 'relative' }}>
                <img
                  src={myUser?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${myUser?.name || 'You'}`}
                  alt={myUser?.name || 'You'}
                  className={styles.participantAvatar}
                />
                <span className={styles.liveIndicator} title="Live">●</span>
              </div>
              <div className={styles.participantMeta}>
                <span className={styles.participantName}>
                  You
                  {isGroupScreenSharing && <span className={styles.screenShareBadge} title="Sharing Screen">💻 Sharing Screen</span>}
                  {isHandRaised && <span className={styles.raiseIndicator} title="Hand Raised">🖐️</span>}
                  {isFootRaised && <span className={styles.raiseIndicator} title="Foot Raised">🦶</span>}
                </span>
                <span
                  className={`${styles.participantRoleBadge} ${
                    myGroupRole === 'CREATOR'
                      ? styles.roleCreator
                      : myGroupRole === 'ADMIN'
                      ? styles.roleAdmin
                      : myGroupRole === 'MODERATOR'
                      ? styles.roleModerator
                      : styles.roleMember
                  }`}
                >
                  {myGroupRole || 'MEMBER'}
                </span>
              </div>
            </div>
            <div className={styles.participantControls}>
              {onToggleMyMute ? (
                <button
                  className={`${styles.adminMuteUserBtn} ${isGroupMuted ? styles.mutedUserBtn : styles.activeUserBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMyMute();
                  }}
                  title={isGroupMuted ? 'Click to Unmute Yourself' : 'Click to Mute Yourself'}
                >
                  {isGroupMuted ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              ) : (
                isGroupMuted ? (
                  <span className={styles.muteIndicator} title="Muted">
                    <MicOff size={15} />
                  </span>
                ) : (
                  <span className={styles.activeIndicator} title="Speaking">
                    <Mic size={15} />
                  </span>
                )
              )}
            </div>
          </div>

          {/* Remote Rows */}
          {sortedParticipants.map((p) => {
            const isMuted = groupMutedUserIds.has(p.userId);
            const isSharingScreen = groupCallScreenSharingStates[p.userId] || false;
            const pHandRaised = groupCallHandRaisedStates[p.userId] || false;
            const pFootRaised = groupCallFootRaisedStates[p.userId] || false;

            return (
              <div
                key={p.userId}
                className={`${styles.participantRow} ${styles.participantRowClickable} ${pHandRaised ? styles.participantRowRaised : ''}`}
                onClick={() => {
                  onFocusUser(p.userId);
                  onClose();
                }}
              >
                <div className={styles.participantInfo}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`}
                      alt={p.name}
                      className={styles.participantAvatar}
                    />
                    <span className={styles.liveIndicator} title="Live">●</span>
                  </div>
                  <div className={styles.participantMeta}>
                    <span className={styles.participantName}>
                      {p.name}
                      {isSharingScreen && <span className={styles.screenShareBadge} title="Sharing Screen">💻 Sharing Screen</span>}
                      {pHandRaised && <span className={styles.raiseIndicator} title="Hand Raised">🖐️</span>}
                      {pFootRaised && <span className={styles.raiseIndicator} title="Foot Raised">🦶</span>}
                    </span>
                    <span
                      className={`${styles.participantRoleBadge} ${
                        p.role === 'CREATOR'
                          ? styles.roleCreator
                          : p.role === 'ADMIN'
                          ? styles.roleAdmin
                          : p.role === 'MODERATOR'
                          ? styles.roleModerator
                          : styles.roleMember
                      }`}
                    >
                      {p.role || 'MEMBER'}
                    </span>
                  </div>
                </div>
                <div className={styles.participantControls}>
                  {isAdmin ? (
                    <button
                      className={`${styles.adminMuteUserBtn} ${isMuted ? styles.mutedUserBtn : styles.activeUserBtn}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMuted) {
                          onAdminUnmuteUser(p.userId);
                        } else {
                          onAdminMuteUser(p.userId);
                        }
                      }}
                      title={isMuted ? 'Click to Unmute User' : 'Click to Mute User'}
                    >
                      {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  ) : (
                    isMuted ? (
                      <span className={styles.muteIndicator} title="Muted">
                        <MicOff size={15} />
                      </span>
                    ) : (
                      <span className={styles.activeIndicator} title="Active">
                        <Mic size={15} />
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className={styles.adminMuteAllSection}>
            <button className={styles.adminMuteAllBtn} onClick={onAdminMuteAll}>
              <MicOff size={16} />
              <span>Mute Everyone</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
