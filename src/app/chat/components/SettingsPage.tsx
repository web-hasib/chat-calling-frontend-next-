import React, { useEffect, useState } from 'react';
import { Moon, Sun, Plus, Link2, LogOut, Bell, Volume2, Music, PhoneCall, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/dropdown-menu';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  MESSAGE_TONES,
  CALL_TONES,
  playMessageNotificationSound,
  playCallRingtone,
  MessageTonePreset,
  CallTonePreset
} from '../../../utils/notifications';

interface SettingsPageProps {
  user: any;
  theme: 'dark' | 'light';
  toggleTheme: (t: 'dark' | 'light') => void;
  openEditProfile: () => void;
  openCreateGroup: () => void;
  openJoinGroup: () => void;
  logout: () => void;
  onClose: () => void;
  updateProfile: (data: {
    pushNotificationsEnabled?: boolean;
    soundEffectsEnabled?: boolean;
    messageTone?: string;
    callTone?: string;
  }) => Promise<void>;
}

export function SettingsPage({
  user,
  theme,
  toggleTheme,
  openEditProfile,
  openCreateGroup,
  openJoinGroup,
  logout,
  onClose,
  updateProfile,
}: SettingsPageProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [permissionState, setPermissionState] = useState<string>('default');
  const [messageTone, setMessageTone] = useState<MessageTonePreset>('chime');
  const [callTone, setCallTone] = useState<CallTonePreset>('classic');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const savedNotif = user.pushNotificationsEnabled !== false;
      const savedSound = user.soundEffectsEnabled !== false;
      const savedMsgTone = (user.messageTone as MessageTonePreset) || 'chime';
      const savedCallTone = (user.callTone as CallTonePreset) || 'classic';
      
      setNotificationsEnabled(savedNotif);
      setSoundEnabled(savedSound);
      setMessageTone(savedMsgTone);
      setCallTone(savedCallTone);
      setPermissionState(getNotificationPermissionStatus());
      
      // Keep localStorage in sync with database values
      localStorage.setItem('push_notifications_enabled', savedNotif ? 'true' : 'false');
      localStorage.setItem('sound_effects_enabled', savedSound ? 'true' : 'false');
      localStorage.setItem('message_tone_preset', savedMsgTone);
      localStorage.setItem('call_tone_preset', savedCallTone);
    }
  }, [user]);

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      setPermissionState(granted ? 'granted' : 'denied');
      if (granted) {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
  };

  const handleSelectMessageTone = (tone: MessageTonePreset) => {
    setMessageTone(tone);
    playMessageNotificationSound(tone);
  };

  const handleSelectCallTone = (tone: CallTonePreset) => {
    setCallTone(tone);
    playCallRingtone(tone);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        pushNotificationsEnabled: notificationsEnabled,
        soundEffectsEnabled: soundEnabled,
        messageTone,
        callTone,
      });
      localStorage.setItem('push_notifications_enabled', notificationsEnabled ? 'true' : 'false');
      localStorage.setItem('sound_effects_enabled', soundEnabled ? 'true' : 'false');
      localStorage.setItem('message_tone_preset', messageTone);
      localStorage.setItem('call_tone_preset', callTone);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save settings to API', err);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMessageToneObj = MESSAGE_TONES.find(t => t.id === messageTone) || MESSAGE_TONES[0];
  const selectedCallToneObj = CALL_TONES.find(t => t.id === callTone) || CALL_TONES[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto z-40 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-6">

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold animate-in slide-in-from-top-3">
            Settings saved successfully!
          </div>
        )}

        <div className="flex items-center justify-between pb-6 border-b border-[var(--border-color)]/40 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={user?.name || 'User'}
                className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)]/30"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--accent-success)] border-2 border-[var(--bg-primary)] rounded-full" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight truncate">{user?.name || 'Your Name'}</h2>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">@{user?.username || 'username'}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={openEditProfile}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]/50 hover:bg-[var(--border-color)]/30 transition-colors shrink-0 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-0.5">Appearance</span>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]/45 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 min-w-[150px]">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Interface Theme</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}</div>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <label className="plane-switch select-none">
                <input 
                  type="checkbox" 
                  checked={theme === 'dark'}
                  onChange={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
                />
                <div>
                  <div>
                    <svg viewBox="0 0 13 13">
                      <path d="M1.55989957,5.41666667 L5.51582215,5.41666667 L4.47015462,0.108333333 L4.47015462,0.108333333 C4.47015462,0.0634601974 4.49708054,0.0249592654 4.5354546,0.00851337035 L4.57707145,0 L5.36229752,0 C5.43359776,0 5.50087375,0.028779451 5.55026392,0.0782711996 L5.59317877,0.134368264 L7.13659662,2.81558333 L8.29565964,2.81666667 C8.53185377,2.81666667 8.72332694,3.01067661 8.72332694,3.25 C8.72332694,3.48932339 8.53185377,3.68333333 8.29565964,3.68333333 L7.63589819,3.68225 L8.63450135,5.41666667 L11.9308317,5.41666667 C12.5213171,5.41666667 13,5.90169152 13,6.5 C13,7.09830848 12.5213171,7.58333333 11.9308317,7.58333333 L8.63450135,7.58333333 L7.63589819,9.31666667 L8.29565964,9.31666667 C8.53185377,9.31666667 8.72332694,9.51067661 8.72332694,9.75 C8.72332694,9.98932339 8.53185377,10.1833333 8.29565964,10.1833333 L7.13659662,10.1833333 L5.59317877,12.8656317 C5.55725264,12.9280353 5.49882018,12.9724157 5.43174295,12.9907056 L5.36229752,13 L4.57707145,13 L4.55610333,12.9978962 C4.51267695,12.9890959 4.48069792,12.9547924 4.47230803,12.9134397 L4.47223088,12.8704208 L5.51582215,7.58333333 L1.55989957,7.58333333 L0.891288881,8.55114605 C0.853775374,8.60544678 0.798421006,8.64327676 0.73629202,8.65879796 L0.672314689,8.66666667 L0.106844414,8.66666667 L0.0715243949,8.66058466 L0.0715243949,8.66058466 C0.0297243066,8.6457608 0.00275502199,8.60729104 0,8.5651586 L0.00593007386,8.52254537 L0.580855011,6.85813984 C0.64492547,6.67265611 0.6577034,6.47392717 0.619193545,6.28316421 L0.580694768,6.14191703 L0.00601851064,4.48064746 C0.00203480725,4.4691314 0,4.45701613 0,4.44481314 C0,4.39994001 0.0269259152,4.36143908 0.0652999725,4.34499318 L0.106916826,4.33647981 L0.672546853,4.33647981 C0.737865848,4.33647981 0.80011301,4.36066329 0.848265401,4.40322477 L0.89131128,4.45169723 L1.55989957,5.41666667 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="street-middle"></span>
                  <span className="cloud"></span>
                  <span className="cloud two"></span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-0.5">Groups</span>
          <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]/45 divide-y divide-[var(--border-color)]/40 overflow-hidden">
            <button
              type="button"
              onClick={openCreateGroup}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors border-none bg-transparent cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Plus size={16} />
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Create New Group</div>
              </div>
            </button>
            <button
              type="button"
              onClick={openJoinGroup}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors border-none bg-transparent cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Link2 size={16} />
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Join Group with Code</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-0.5">Notifications & Sound</span>
          <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]/45 divide-y divide-[var(--border-color)]/40 overflow-hidden">
            
            <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-[200px] pr-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Bell size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Desktop Notifications</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                    {permissionState === 'denied' ? 'Blocked by browser settings' : 'Get notified of new incoming messages'}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => handleToggleNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)] border border-[var(--border-color)]/40" />
              </label>
            </div>

            <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-[200px] pr-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Volume2 size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Sound Effects</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Play dynamic sound tones on messages and calls</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => handleToggleSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)] border border-[var(--border-color)]/40" />
              </label>
            </div>

            {soundEnabled && (
              <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-[200px] pr-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Music size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">Message Tone</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Customize incoming text sound</div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)]/50 rounded-lg text-xs text-[var(--text-primary)] outline-none hover:bg-[var(--border-color)]/20 transition-all cursor-pointer">
                    <span>{selectedMessageToneObj.name}</span>
                    <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[var(--bg-secondary)] border-[var(--border-color)]">
                  {MESSAGE_TONES.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleSelectMessageTone(t.id)}
                      className="flex items-center justify-between gap-4 text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer py-2 px-3 rounded-md"
                    >
                      <div className="flex flex-col">
                        <span>{t.name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">{t.desc}</span>
                      </div>
                      {messageTone === t.id && <Check size={14} className="text-blue-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {soundEnabled && (
            <div className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-[200px] pr-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <PhoneCall size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Call Ringtone</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Customize incoming call ring</div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)]/50 rounded-lg text-xs text-[var(--text-primary)] outline-none hover:bg-[var(--border-color)]/20 transition-all cursor-pointer">
                  <span>{selectedCallToneObj.name}</span>
                  <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[var(--bg-secondary)] border-[var(--border-color)]">
                    {CALL_TONES.map((t) => (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => handleSelectCallTone(t.id)}
                        className="flex items-center justify-between gap-4 text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-pointer py-2 px-3 rounded-md"
                      >
                        <div className="flex flex-col">
                          <span>{t.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">{t.desc}</span>
                        </div>
                        {callTone === t.id && <Check size={14} className="text-emerald-500" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-0.5">Account</span>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]/45 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <LogOut size={16} />
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">Sign Out</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-color)]/40 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
