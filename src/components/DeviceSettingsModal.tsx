'use client';

import React, { useEffect, useState } from 'react';
import styles from './CallOverlay.module.css';
import { Mic, Video, Volume2, X } from 'lucide-react';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudioInput?: (deviceId: string) => void;
  onSelectVideoInput?: (deviceId: string) => void;
  onSelectAudioOutput?: (deviceId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isFootRaised?: boolean;
  onToggleFootRaise?: () => void;
  onAdminMuteAll?: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
  isFullscreen,
  onToggleFullscreen,
  isFootRaised,
  onToggleFootRaise,
  onAdminMuteAll,
  isScreenSharing,
  onToggleScreenShare,
}) => {
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

  return (
    <div className={styles.settingsModalOverlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsHeader}>
          <h3 className={styles.settingsTitle}>Audio & Video Settings</h3>
          <button
            onClick={onClose}
            className={styles.modalCloseBtn}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Microphone */}
        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>
            <Mic size={16} /> Microphone (Audio Input)
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
        <div className={styles.settingsGroup}>
          <label className={styles.settingsLabel}>
            <Video size={16} /> Camera (Video Input)
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

        {/* Speakers (Audio Output) */}
        {audioOutputs.length > 0 && (
          <div className={styles.settingsGroup}>
            <label className={styles.settingsLabel}>
              <Volume2 size={16} /> Speaker (Audio Output)
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

        {/* Additional Call Actions */}
        {(onToggleFullscreen || onToggleFootRaise || onAdminMuteAll || onToggleScreenShare) && (
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              More Controls
            </span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {onToggleScreenShare && (
                <button
                  type="button"
                  onClick={() => { onToggleScreenShare(); onClose(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '14px',
                    background: isScreenSharing ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isScreenSharing ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255,255,255,0.14)',
                    color: isScreenSharing ? '#c7d2fe' : '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <span>💻</span> {isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                </button>
              )}
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={() => { onToggleFullscreen(); onClose(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                </button>
              )}

              {onToggleFootRaise && (
                <button
                  type="button"
                  onClick={() => { onToggleFootRaise(); onClose(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '14px',
                    background: isFootRaised ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isFootRaised ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.14)',
                    color: isFootRaised ? '#e9d5ff' : '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>🦶</span> {isFootRaised ? 'Lower Foot' : 'Raise Foot'}
                </button>
              )}

              {onAdminMuteAll && (
                <button
                  type="button"
                  onClick={() => { onAdminMuteAll(); onClose(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.16)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#fca5a5',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <Mic size={15} /> Mute Everyone
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
