'use client';

import React, { useEffect, useState } from 'react';
import styles from './CallOverlay.module.css';
import { 
  Mic, 
  Video, 
  Volume2, 
  X, 
  Sliders, 
  Layers, 
  Sparkles, 
  Users, 
  Monitor, 
  Smile, 
  MessageSquare, 
  Maximize, 
  RotateCcw,
  ShieldAlert
} from 'lucide-react';

export interface DockSettings {
  showParticipants: boolean;
  showHandRaise: boolean;
  showScreenShare: boolean;
  showReactions: boolean;
  showSoundboard: boolean;
  showChat: boolean;
}

export const DEFAULT_DOCK_SETTINGS: DockSettings = {
  showParticipants: true,
  showHandRaise: true,
  showScreenShare: true,
  showReactions: true,
  showSoundboard: true,
  showChat: true,
};

const DOCK_SETTINGS_STORAGE_KEY = 'chat_calling_dock_preferences';

export const getSavedDockSettings = (): DockSettings => {
  if (typeof window === 'undefined') return DEFAULT_DOCK_SETTINGS;
  try {
    const saved = localStorage.getItem(DOCK_SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_DOCK_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Error reading dock settings:', err);
  }
  return DEFAULT_DOCK_SETTINGS;
};

export const saveDockSettings = (settings: DockSettings) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DOCK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Error saving dock settings:', err);
  }
};

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudioInput?: (deviceId: string) => void;
  onSelectVideoInput?: (deviceId: string) => void;
  onSelectAudioOutput?: (deviceId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isHandRaised?: boolean;
  onToggleHandRaise?: () => void;
  isFootRaised?: boolean;
  onToggleFootRaise?: () => void;
  onAdminMuteAll?: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  // Dock settings & modal launch actions
  dockSettings?: DockSettings;
  onUpdateDockSettings?: (newSettings: DockSettings) => void;
  onOpenParticipants?: () => void;
  onOpenSoundboard?: () => void;
  onOpenChat?: () => void;
  totalParticipants?: number;
  isVideoCall?: boolean;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
  isFullscreen,
  onToggleFullscreen,
  isHandRaised,
  onToggleHandRaise,
  isFootRaised,
  onToggleFootRaise,
  onAdminMuteAll,
  isScreenSharing,
  onToggleScreenShare,
  dockSettings = DEFAULT_DOCK_SETTINGS,
  onUpdateDockSettings,
  onOpenParticipants,
  onOpenSoundboard,
  onOpenChat,
  totalParticipants,
  isVideoCall = true,
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'dock' | 'tools'>('devices');
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('chat_calling_audio_in') || '' : '';
  });
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('chat_calling_video_in') || '' : '';
  });
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('chat_calling_audio_out') || '' : '';
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const aIns = devices.filter((d) => d.kind === 'audioinput');
        const vIns = devices.filter((d) => d.kind === 'videoinput');
        const aOuts = devices.filter((d) => d.kind === 'audiooutput');

        setAudioInputs(aIns);
        setVideoInputs(vIns);
        setAudioOutputs(aOuts);

        const savedAIn = localStorage.getItem('chat_calling_audio_in');
        const savedVIn = localStorage.getItem('chat_calling_video_in');
        const savedAOut = localStorage.getItem('chat_calling_audio_out');

        if (savedAIn && aIns.some(d => d.deviceId === savedAIn)) {
          setSelectedAudioInput(savedAIn);
        } else if (aIns.length && !selectedAudioInput) {
          setSelectedAudioInput(aIns[0].deviceId);
        }

        if (savedVIn && vIns.some(d => d.deviceId === savedVIn)) {
          setSelectedVideoInput(savedVIn);
        } else if (vIns.length && !selectedVideoInput) {
          setSelectedVideoInput(vIns[0].deviceId);
        }

        if (savedAOut && aOuts.some(d => d.deviceId === savedAOut)) {
          setSelectedAudioOutput(savedAOut);
        } else if (aOuts.length && !selectedAudioOutput) {
          setSelectedAudioOutput(aOuts[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate media devices:', err);
      }
    };

    loadDevices();
  }, [isOpen, selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  if (!isOpen) return null;

  const handleToggleDockItem = (key: keyof DockSettings) => {
    const updated = {
      ...dockSettings,
      [key]: !dockSettings[key],
    };
    saveDockSettings(updated);
    onUpdateDockSettings?.(updated);
  };

  const handleResetDock = () => {
    saveDockSettings(DEFAULT_DOCK_SETTINGS);
    onUpdateDockSettings?.(DEFAULT_DOCK_SETTINGS);
  };

  return (
    <div className={styles.settingsModalOverlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.settingsHeader}>
          <h3 className={styles.settingsTitle}>Call Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseBtn}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '4px', display: 'flex' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.settingsTabNav}>
          <button
            type="button"
            className={`${styles.settingsTabBtn} ${activeTab === 'devices' ? styles.settingsTabBtnActive : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <Sliders size={14} />
            <span>Devices</span>
          </button>
          <button
            type="button"
            className={`${styles.settingsTabBtn} ${activeTab === 'dock' ? styles.settingsTabBtnActive : ''}`}
            onClick={() => setActiveTab('dock')}
          >
            <Layers size={14} />
            <span>Dock Items</span>
          </button>
          <button
            type="button"
            className={`${styles.settingsTabBtn} ${activeTab === 'tools' ? styles.settingsTabBtnActive : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Sparkles size={14} />
            <span>All Features</span>
          </button>
        </div>

        {/* TAB 1: Devices */}
        {activeTab === 'devices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Microphone */}
            <div className={styles.settingsGroup}>
              <label className={styles.settingsLabel}>
                <Mic size={16} style={{ color: '#818cf8' }} /> Microphone (Audio Input)
              </label>
              <select
                className={styles.settingsSelect}
                value={selectedAudioInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAudioInput(val);
                  try { localStorage.setItem('chat_calling_audio_in', val); } catch {}
                  onSelectAudioInput?.(val);
                }}
              >
                {audioInputs.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera */}
            {isVideoCall && (
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>
                  <Video size={16} style={{ color: '#818cf8' }} /> Camera (Video Input)
                </label>
                <select
                  className={styles.settingsSelect}
                  value={selectedVideoInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedVideoInput(val);
                    try { localStorage.setItem('chat_calling_video_in', val); } catch {}
                    onSelectVideoInput?.(val);
                  }}
                >
                  {videoInputs.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speakers (Audio Output) */}
            {audioOutputs.length > 0 && (
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>
                  <Volume2 size={16} style={{ color: '#818cf8' }} /> Speaker (Audio Output)
                </label>
                <select
                  className={styles.settingsSelect}
                  value={selectedAudioOutput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAudioOutput(val);
                    try { localStorage.setItem('chat_calling_audio_out', val); } catch {}
                    onSelectAudioOutput?.(val);
                  }}
                >
                  {audioOutputs.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Speaker ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Dock Customization */}
        {activeTab === 'dock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                Customize which buttons appear in your call dock:
              </span>
              <button
                type="button"
                onClick={handleResetDock}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px',
                }}
                title="Reset to default dock configuration"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            <div className={styles.dockToggleList}>
              {/* Participants */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon}>
                    <Users size={16} />
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Participants Button</span>
                    <span className={styles.dockToggleDesc}>View & manage participant list</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showParticipants}
                    onChange={() => handleToggleDockItem('showParticipants')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              {/* Hand Raise */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon} style={{ background: 'rgba(250, 204, 21, 0.15)', color: '#facc15' }}>
                    🖐️
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Raise Hand Button</span>
                    <span className={styles.dockToggleDesc}>Signal speaker with hand raise</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showHandRaise}
                    onChange={() => handleToggleDockItem('showHandRaise')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              {/* Screen Share */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                    <Monitor size={16} />
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Screen Share Button</span>
                    <span className={styles.dockToggleDesc}>Present display or window</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showScreenShare}
                    onChange={() => handleToggleDockItem('showScreenShare')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              {/* Reactions */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                    <Smile size={16} />
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Emoji Reactions Button</span>
                    <span className={styles.dockToggleDesc}>Floating animated reactions</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showReactions}
                    onChange={() => handleToggleDockItem('showReactions')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              {/* Soundboard */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                    <Volume2 size={16} />
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Soundboard Button</span>
                    <span className={styles.dockToggleDesc}>Play sound effects & custom audio</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showSoundboard}
                    onChange={() => handleToggleDockItem('showSoundboard')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>

              {/* Chat */}
              <div className={styles.dockToggleItem}>
                <div className={styles.dockToggleInfo}>
                  <div className={styles.dockToggleIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <MessageSquare size={16} />
                  </div>
                  <div className={styles.dockToggleMeta}>
                    <span className={styles.dockToggleTitle}>Meeting Chat Button</span>
                    <span className={styles.dockToggleDesc}>In-meeting text & media messages</span>
                  </div>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={dockSettings.showChat}
                    onChange={() => handleToggleDockItem('showChat')}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: All Features & Modals */}
        {activeTab === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              Direct access to all meeting tools and modals:
            </span>

            <div className={styles.quickActionsGrid}>
              {/* Participants */}
              {onOpenParticipants && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onOpenParticipants();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: '#818cf8' }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Participants</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                      {totalParticipants ? `${totalParticipants} in call` : 'View list'}
                    </div>
                  </div>
                </button>
              )}

              {/* Soundboard */}
              {onOpenSoundboard && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onOpenSoundboard();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: '#c084fc' }}>
                    <Volume2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Soundboard</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Play audio FX</div>
                  </div>
                </button>
              )}

              {/* Meeting Chat */}
              {onOpenChat && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onOpenChat();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: '#34d399' }}>
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Meeting Chat</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>In-call chat</div>
                  </div>
                </button>
              )}

              {/* Screen Share */}
              {onToggleScreenShare && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onToggleScreenShare();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: isScreenSharing ? '#818cf8' : '#60a5fa' }}>
                    <Monitor size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Screen Share</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                      {isScreenSharing ? 'Stop sharing' : 'Start share'}
                    </div>
                  </div>
                </button>
              )}

              {/* Raise Hand */}
              {onToggleHandRaise && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onToggleHandRaise();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ fontSize: '16px' }}>
                    🖐️
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Hand Raise</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                      {isHandRaised ? 'Lower hand' : 'Raise hand'}
                    </div>
                  </div>
                </button>
              )}

              {/* Raise Foot */}
              {onToggleFootRaise && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onToggleFootRaise();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ fontSize: '16px' }}>
                    🦶
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Foot Raise</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                      {isFootRaised ? 'Lower foot' : 'Raise foot'}
                    </div>
                  </div>
                </button>
              )}

              {/* Fullscreen */}
              {onToggleFullscreen && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  onClick={() => {
                    onClose();
                    onToggleFullscreen();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: '#f59e0b' }}>
                    <Maximize size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Fullscreen</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                      {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    </div>
                  </div>
                </button>
              )}

              {/* Admin Mute All */}
              {onAdminMuteAll && (
                <button
                  type="button"
                  className={styles.quickActionCard}
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
                  onClick={() => {
                    onClose();
                    onAdminMuteAll();
                  }}
                >
                  <div className={styles.quickActionIcon} style={{ color: '#ef4444' }}>
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fca5a5' }}>Mute Everyone</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Admin action</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
