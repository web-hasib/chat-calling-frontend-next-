'use client';
import React from 'react';
import { ArrowLeft, Phone, Video, Info, Users } from 'lucide-react';
import { useCall } from '../../../context/CallContext';

interface ChatHeaderProps {
  activeConvo: any;
  recipientName: string;
  recipientAvatarUrl: string;
  isOnline: boolean;
  showDetails: boolean;
  activeThemeColor: string;
  onBack: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onToggleDetails: () => void;
}

export function ChatHeader({
  activeConvo, recipientName, recipientAvatarUrl, isOnline,
  showDetails, activeThemeColor,
  onBack, onAudioCall, onVideoCall, onToggleDetails,
}: ChatHeaderProps) {
  const { groupCallStatus, joinGroupCall, activeGroupCall, isUserInCallOnOtherDevice, activeCall } = useCall();

  const isCallActive = groupCallStatus?.active && !activeGroupCall;
  const isBusyInCall = isUserInCallOnOtherDevice || !!activeCall || !!activeGroupCall;

  return (
    <div className="px-3 sm:px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center h-[72px] shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer flex md:hidden items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onBack} title="Back to Chats">
          <ArrowLeft size={20} />
        </button>
        <img src={recipientAvatarUrl} alt={recipientName} className="w-8 h-8 rounded-full object-cover" />
        <div className="min-w-0 cursor-pointer" onClick={onToggleDetails}>
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{recipientName}</div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
            {activeConvo?.isGroup ? (
              <>
                <span>{activeConvo.participants?.length || 0} members</span>
                {groupCallStatus?.active && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-500 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active Call
                  </span>
                )}
              </>
            ) : (
              isOnline ? 'Online' : 'Offline'
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* If user is in call on another device, show sleek indicator and hide call buttons */}
        {isUserInCallOnOtherDevice && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            In Call on Another Device
          </span>
        )}

        {/* Dynamic Join Button for active Group Call */}
        {isCallActive && !isUserInCallOnOtherDevice && activeConvo?.isGroup && (
          <button
            onClick={() => joinGroupCall()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-white bg-green-500 hover:bg-green-600 cursor-pointer shadow-md transition-all animate-bounce hover:animate-none"
            title="Join Active Call"
          >
            <Users size={12} />
            <span className="hidden sm:inline">Join Call</span>
            <span className="inline sm:hidden">Join</span>
          </button>
        )}

        {!isCallActive && !isBusyInCall && (
          <>
            <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onAudioCall} title="Audio Call">
              <Phone size={18} />
            </button>
            <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onVideoCall} title="Video Call">
              <Video size={18} />
            </button>
          </>
        )}
        <button
          className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          onClick={onToggleDetails}
          title="Chat Details & Customization"
          style={showDetails ? { color: activeThemeColor, backgroundColor: 'var(--bg-tertiary)' } : undefined}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
