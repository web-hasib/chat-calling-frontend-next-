'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './SoundboardModal.module.css';
import { Search, Volume2, VolumeX, Clock, Sparkles, Gamepad2, Plus, X, Trash2, Play } from 'lucide-react';
import { soundboardManager, SoundboardItem, DEFAULT_SOUNDS } from '../utils/soundboardManager';
import { useCall } from '../context/CallContext';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundboardModal: React.FC<SoundboardModalProps> = ({ isOpen, onClose }) => {
  const { triggerGroupCallSoundboard } = useCall();
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState(soundboardManager.getVolume());
  const [isMuted, setIsMuted] = useState(soundboardManager.getVolume() === 0);
  const [customSounds, setCustomSounds] = useState<SoundboardItem[]>([]);
  const [frequentlyUsed, setFrequentlyUsed] = useState<SoundboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'freq' | 'custom' | 'discord'>('all');

  // Custom sound upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadEmoji, setUploadEmoji] = useState('🎵');
  const [uploadAudioData, setUploadAudioData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomSounds(soundboardManager.getCustomSounds());
      setFrequentlyUsed(soundboardManager.getFrequentlyUsed());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // If upload modal is open, do not close the main soundboard when interacting with upload modal
      if (showUploadModal) return;

      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUploadModal) {
          setShowUploadModal(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showUploadModal, onClose]);

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    soundboardManager.setVolume(newVol);
  };

  const toggleMuteVolume = () => {
    if (isMuted) {
      const restored = 0.8;
      setVolume(restored);
      setIsMuted(false);
      soundboardManager.setVolume(restored);
    } else {
      setVolume(0);
      setIsMuted(true);
      soundboardManager.setVolume(0);
    }
  };

  const handlePlaySound = (sound: SoundboardItem) => {
    triggerGroupCallSoundboard(sound.id, sound.name, sound.emoji, sound.audioData);
    setFrequentlyUsed(soundboardManager.getFrequentlyUsed());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Sound file is too large (maximum 2MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadAudioData(base64);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, '').slice(0, 20));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomSound = () => {
    if (!uploadName.trim()) {
      alert('Please give your sound a name.');
      return;
    }
    if (!uploadAudioData) {
      alert('Please upload an audio file (.mp3, .wav, .ogg).');
      return;
    }

    const newSound: SoundboardItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: uploadName.trim(),
      emoji: uploadEmoji || '🎵',
      category: 'custom',
      audioData: uploadAudioData,
      isCustom: true,
    };

    const updated = soundboardManager.saveCustomSound(newSound);
    setCustomSounds(updated);
    setShowUploadModal(false);
    setUploadName('');
    setUploadEmoji('🎵');
    setUploadAudioData(null);
  };

  const handleDeleteCustomSound = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = soundboardManager.deleteCustomSound(id);
    setCustomSounds(updated);
  };

  // Filter sounds based on search query
  const query = searchQuery.toLowerCase().trim();
  const filteredFreq = frequentlyUsed.filter(s => s.name.toLowerCase().includes(query));
  const filteredCustom = customSounds.filter(s => s.name.toLowerCase().includes(query));
  const filteredDiscord = DEFAULT_SOUNDS.filter(s => s.name.toLowerCase().includes(query));

  return (
    <>
      <div className={styles.soundboardOverlay} ref={modalRef}>
        {/* Header */}
        <div className={styles.soundboardHeader}>
          <div className={styles.searchWrapper}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Find the perfect sound..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.volumeControl}>
            <button
              type="button"
              onClick={toggleMuteVolume}
              className={styles.muteBtn}
              title={isMuted ? 'Unmute Soundboard' : 'Mute Soundboard'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className={styles.volumeSlider}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          <button
            type="button"
            className={styles.headerCloseBtn}
            onClick={onClose}
            title="Close Soundboard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.soundboardBody}>
          {/* Left category icons */}
          <div className={styles.soundboardSidebar}>
            <button
              type="button"
              className={`${styles.sidebarIconBtn} ${activeTab === 'all' ? styles.sidebarIconBtnActive : ''}`}
              onClick={() => setActiveTab('all')}
              title="All Sounds"
            >
              <Sparkles size={18} />
            </button>
            <button
              type="button"
              className={`${styles.sidebarIconBtn} ${activeTab === 'freq' ? styles.sidebarIconBtnActive : ''}`}
              onClick={() => setActiveTab('freq')}
              title="Frequently Used"
            >
              <Clock size={18} />
            </button>
            <button
              type="button"
              className={`${styles.sidebarIconBtn} ${activeTab === 'custom' ? styles.sidebarIconBtnActive : ''}`}
              onClick={() => setActiveTab('custom')}
              title="Custom Sounds"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className={`${styles.sidebarIconBtn} ${activeTab === 'discord' ? styles.sidebarIconBtnActive : ''}`}
              onClick={() => setActiveTab('discord')}
              title="Preset FX"
            >
              <Gamepad2 size={18} />
            </button>
          </div>

          {/* Sound list & categories */}
          <div className={styles.soundboardList}>
            {/* Frequently Used Section */}
            {(activeTab === 'all' || activeTab === 'freq') && filteredFreq.length > 0 && (
              <div>
                <div className={styles.sectionHeader}>
                  <span>🕒 Frequently Used</span>
                </div>
                <div className={styles.soundGrid}>
                  {filteredFreq.map((sound) => (
                    <button
                      key={`freq_${sound.id}`}
                      type="button"
                      className={styles.soundCard}
                      onClick={() => handlePlaySound(sound)}
                      title={`Play ${sound.name}`}
                    >
                      <span className={styles.soundEmoji}>{sound.emoji}</span>
                      <span className={styles.soundName}>{sound.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Soundboard Section */}
            {(activeTab === 'all' || activeTab === 'custom') && (
              <div>
                <div className={styles.sectionHeader}>
                  <span>✨ Custom Sounds</span>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{customSounds.length} Sounds</span>
                </div>
                <div className={styles.soundGrid}>
                  <button
                    type="button"
                    className={styles.uploadCard}
                    onClick={() => setShowUploadModal(true)}
                    title="Upload Custom Sound"
                  >
                    <Plus size={16} />
                    <span>Add Sound</span>
                  </button>

                  {filteredCustom.map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      className={styles.soundCard}
                      onClick={() => handlePlaySound(sound)}
                      title={`Play ${sound.name}`}
                    >
                      <span className={styles.soundEmoji}>{sound.emoji}</span>
                      <span className={styles.soundName}>{sound.name}</span>
                      <span
                        className={styles.deleteSoundBtn}
                        onClick={(e) => handleDeleteCustomSound(sound.id, e)}
                        title="Delete Sound"
                      >
                        <Trash2 size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default Sounds Section */}
            {(activeTab === 'all' || activeTab === 'discord') && (
              <div>
                <div className={styles.sectionHeader}>
                  <span>🎮 Sound Effects</span>
                </div>
                <div className={styles.soundGrid}>
                  {filteredDiscord.map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      className={styles.soundCard}
                      onClick={() => handlePlaySound(sound)}
                      title={`Play ${sound.name}`}
                    >
                      <span className={styles.soundEmoji}>{sound.emoji}</span>
                      <span className={styles.soundName}>{sound.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Custom Sound Modal */}
      {showUploadModal && (
        <div 
          className={styles.uploadModalBackdrop} 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
            }
          }}
        >
          <div className={styles.uploadModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              <span>Upload Custom Sound</span>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowUploadModal(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalField}>
              <label>Sound Name</label>
              <input
                type="text"
                placeholder="e.g., GG, Victory, Airhorn"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className={styles.modalInput}
                maxLength={24}
                autoFocus
              />
            </div>

            <div className={styles.modalField}>
              <label>Emoji Symbol</label>
              <input
                type="text"
                placeholder="e.g., 🥳, 🎷, 🔥"
                value={uploadEmoji}
                onChange={(e) => setUploadEmoji(e.target.value)}
                className={styles.modalInput}
                maxLength={4}
              />
            </div>

            <div className={styles.modalField}>
              <label>Audio File (.mp3, .wav, .ogg, max 2MB)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className={styles.uploadCard}
                onClick={() => fileInputRef.current?.click()}
                style={{ height: '42px', width: '100%', justifyContent: 'center' }}
              >
                {uploadAudioData ? '✅ Audio File Selected' : '📁 Choose Audio File'}
              </button>
            </div>

            {uploadAudioData && (
              <button
                type="button"
                className={styles.soundCard}
                style={{ justifyContent: 'center', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.35)' }}
                onClick={() => soundboardManager.playSound('test', uploadAudioData)}
              >
                <Play size={14} />
                <span>Test Audio Preview</span>
              </button>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadAudioData(null);
                  setUploadName('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalBtnSave}
                onClick={handleSaveCustomSound}
              >
                Save Sound
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
