'use client';

import React from 'react';

interface LoadingLogoProps {
  size?: number;
  text?: string;
  showText?: boolean;
  className?: string;
}

export const LoadingLogo: React.FC<LoadingLogoProps> = ({
  size = 80,
  text,
  showText = true,
  className = '',
}) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      style={{ userSelect: 'none' }}
    >
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Ambient Pulsing Glow behind the logo */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(6, 182, 212, 0.2) 60%, transparent 100%)',
            transform: 'scale(1.15)',
          }}
        />

        {/* SVG Animated Logo */}
        <svg 
          viewBox="0 0 200 200" 
          width={size} 
          height={size}
          className="relative z-10 transition-transform duration-300"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="llBubbleGrad" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>

            <linearGradient id="llOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.9" />
            </linearGradient>

            <filter id="llGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4F46E5" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* 1. Outer Concentric Orbit Ring (Smooth 360 Spin) */}
          <g>
            <circle 
              cx="100" 
              cy="100" 
              r="88" 
              fill="none" 
              stroke="url(#llOrbitGrad)" 
              strokeWidth="2.5" 
              strokeDasharray="28 18 10 18"
              strokeLinecap="round"
              opacity="0.8"
            />
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="0 100 100" 
              to="360 100 100" 
              dur="5s" 
              repeatCount="indefinite" 
            />
          </g>

          {/* 2. Main Chat Bubble (Centered at 100, 100) */}
          <g filter="url(#llGlow)">
            <path 
              d="M 100 28 
                 C 139.7 28, 172 60.3, 172 100 
                 C 172 139.7, 139.7 172, 100 172 
                 C 86.8 172, 74.4 168.4, 63.8 162.2 
                 L 38 170 
                 L 46.2 144.8 
                 C 34.8 132.5, 28 116.9, 28 100 
                 C 28 60.3, 60.3 28, 100 28 Z" 
              fill="url(#llBubbleGrad)" 
            />
          </g>

          {/* 3. Upper Gloss Highlight */}
          <path 
            d="M 100 32 
               C 136 32, 166 61, 168 97 
               C 152 56, 110 40, 52 46 
               C 65 37, 81 32, 100 32 Z" 
            fill="#FFFFFF" 
            fillOpacity="0.18" 
          />

          {/* 4. Floating Phone Handset & Animated Waves */}
          <g>
            {/* Smooth Handset Float Up/Down */}
            <animateTransform 
              attributeName="transform" 
              type="translate" 
              values="0,0; 0,-3; 0,0" 
              dur="2.2s" 
              repeatCount="indefinite" 
            />

            {/* Centered Handset Path */}
            <g transform="translate(62, 62) scale(3.16)">
              <path 
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" 
                fill="#FFFFFF" 
              />
            </g>

            {/* Signal Wave 1 (Inner Arc) with pulsating opacity & scale */}
            <path 
              d="M 124 72 A 20 20 0 0 1 144 92" 
              fill="none" 
              stroke="#FFFFFF" 
              strokeWidth="3.5" 
              strokeLinecap="round"
            >
              <animate 
                attributeName="opacity" 
                values="0.2; 1; 0.2" 
                dur="1.5s" 
                repeatCount="indefinite" 
              />
              <animate 
                attributeName="stroke-width" 
                values="2.5; 4.2; 2.5" 
                dur="1.5s" 
                repeatCount="indefinite" 
              />
            </path>

            {/* Signal Wave 2 (Outer Arc) */}
            <path 
              d="M 132 58 A 36 36 0 0 1 158 84" 
              fill="none" 
              stroke="#FFFFFF" 
              strokeWidth="3" 
              strokeLinecap="round"
            >
              <animate 
                attributeName="opacity" 
                values="0.1; 0.9; 0.1" 
                dur="1.5s" 
                begin="0.3s" 
                repeatCount="indefinite" 
              />
              <animate 
                attributeName="stroke-width" 
                values="2; 3.6; 2" 
                dur="1.5s" 
                begin="0.3s" 
                repeatCount="indefinite" 
              />
            </path>
          </g>

          {/* 5. Green Online / Live Badge with Pulsing Ring */}
          <g>
            {/* Pulsing Green Halo */}
            <circle cx="152" cy="50" r="7" fill="#22C55E" opacity="0.5">
              <animate 
                attributeName="r" 
                values="6; 11; 6" 
                dur="1.8s" 
                repeatCount="indefinite" 
              />
              <animate 
                attributeName="opacity" 
                values="0.6; 0; 0.6" 
                dur="1.8s" 
                repeatCount="indefinite" 
              />
            </circle>
            {/* Solid Dot */}
            <circle cx="152" cy="50" r="6.5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2.5" />
          </g>
        </svg>
      </div>

      {/* Loading Text & Animated Dots */}
      {showText && (
        <div className="flex items-center gap-1.5 text-sm font-medium tracking-wide text-zinc-400">
          <span>{text || 'Connecting'}</span>
          <span className="flex gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      )}
    </div>
  );
};
export default LoadingLogo;
