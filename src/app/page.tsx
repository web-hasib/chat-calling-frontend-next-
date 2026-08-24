'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, Phone, Video, Users, Shield, Zap, 
  Globe, Bell, Palette, Mic, Monitor, Smartphone,
  ArrowRight, ChevronDown
} from 'lucide-react';

export default function LandingPage() {
  const { token } = useAuth();

  // Enable scroll on landing page (globals.css sets overflow:hidden for chat layout)
  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  const features = [
    { icon: <MessageSquare size={18} />, title: 'Real-Time Messaging', desc: 'Text, images, videos, audio, and documents with read receipts and typing indicators.' },
    { icon: <Phone size={18} />, title: '1:1 Audio Calls', desc: 'Peer-to-peer audio calls with WebRTC and real-time media state sync.' },
    { icon: <Video size={18} />, title: '1:1 Video Calls', desc: 'HD video calls with camera toggle, screen sharing, and full-screen UI.' },
    { icon: <Users size={18} />, title: 'Group Calls (100+)', desc: 'Agora RTC powered group calls with admin controls, in-call chat and emoji reactions.' },
    { icon: <Shield size={18} />, title: 'OAuth Authentication', desc: 'Google & GitHub OAuth, JWT tokens, bcrypt hashing, session persistence.' },
    { icon: <Zap size={18} />, title: 'WebSocket Events', desc: 'Socket.IO for instant delivery, presence updates, and typing indicators.' },
    { icon: <Palette size={18} />, title: 'Custom Themes', desc: 'Per-conversation colors, dark/light mode, dynamic call backgrounds.' },
    { icon: <Mic size={18} />, title: 'Voice Messages', desc: 'Record voice notes with waveform visualization and inline playback.' },
    { icon: <Globe size={18} />, title: 'Group Chat', desc: 'Group conversations with member management, admin controls, and shared media.' },
    { icon: <Bell size={18} />, title: 'Push Notifications', desc: 'Browser notifications for messages and calls when the tab is inactive.' },
    { icon: <Monitor size={18} />, title: 'Screen Sharing', desc: 'Share screen in 1:1 and group calls with automatic layout adaptation.' },
    { icon: <Smartphone size={18} />, title: 'PWA & Mobile', desc: 'Installable PWA with responsive design for mobile and desktop.' },
  ];

  const techStack = [
    'Next.js 16', 'NestJS', 'PostgreSQL (Neon)', 'Prisma', 'Socket.IO',
    'WebRTC', 'Agora RTC', 'Cloudinary', 'Passport.js', 'JWT',
  ];

  const ctaLink = token ? '/chat' : '/auth';
  const ctaText = token ? 'Go to Chat' : 'Get Started';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-primary)] selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border-color)] h-14 flex items-center px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded bg-[var(--accent-primary)] flex items-center justify-center text-white flex-shrink-0">
              <Phone size={15} />
            </div>
            <span className="text-sm sm:text-base font-bold whitespace-nowrap tracking-tight text-[var(--text-primary)]">
              Minimal Chat
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <a href="#features" className="hidden sm:inline text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-underline">
              Features
            </a>
            <a href="#tech" className="hidden sm:inline text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-underline">
              Stack
            </a>
            <Link href={ctaLink} className="text-xs font-semibold text-white no-underline bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] px-3 py-1.5 rounded transition-colors flex items-center gap-1 whitespace-nowrap">
              {ctaText} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center flex flex-col items-center">
        <span className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Open Source • Full Stack • Real-Time
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 text-[var(--text-primary)]">
          Real-Time Chat &amp; <span className="text-[var(--accent-primary)]">Calling Platform</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-lg mb-8">
          A clean, modular messaging application featuring 1:1 and group video/audio calls, 
          real-time messaging, screen sharing, dynamic themes, and secure OAuth credentials.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href={ctaLink} className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-white no-underline bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] px-5 py-2.5 rounded transition-colors inline-flex items-center justify-center gap-1.5">
            {ctaText} <ArrowRight size={14} />
          </Link>
          <a href="#features" className="w-full sm:w-auto text-xs sm:text-sm font-medium text-[var(--text-secondary)] no-underline bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] px-5 py-2.5 rounded transition-colors inline-flex items-center justify-center gap-1.5">
            Explore Features <ChevronDown size={14} />
          </a>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-md mt-16 pt-6 pb-2 border-t border-[var(--border-color)]">
          <div className="text-center">
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">12+</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Features</div>
          </div>
          <div className="text-center border-l border-r border-[var(--border-color)]">
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">100</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Max Group</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">10+</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Techs</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-12 border-t border-[var(--border-color)]">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 text-[var(--text-primary)]">Features</h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center mb-8 max-w-sm mx-auto">
          Everything needed for modern communication, optimized for stability.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div key={i} className="p-4 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0 text-[var(--accent-primary)]">
                {f.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold mb-0.5 text-[var(--text-primary)] truncate">{f.title}</h3>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed m-0">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="max-w-4xl mx-auto px-4 py-12 border-t border-[var(--border-color)] text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-1 text-[var(--text-primary)]">Tech Stack</h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6">
          Standard tools and architectures used under the hood.
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto">
          {techStack.map((t, i) => (
            <span key={i} className="text-xs font-medium px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-xl mx-auto px-4 py-16 text-center border-t border-[var(--border-color)]">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[var(--text-primary)]">Ready to Connect?</h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6">
          Create an account and start high-quality calls in seconds.
        </p>
        <Link href={ctaLink} className="text-xs sm:text-sm font-semibold text-white no-underline bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] px-6 py-2.5 rounded transition-colors inline-flex items-center gap-1.5">
          {token ? 'Go to Chat' : 'Get Started Free'} <ArrowRight size={14} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--accent-primary)] flex items-center justify-center text-white">
              <Phone size={12} />
            </div>
            <span className="text-xs sm:text-sm font-semibold">Minimal Chat</span>
          </div>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] m-0">
            Next.js • NestJS • WebRTC • Agora
          </p>
        </div>
      </footer>
    </div>
  );
}
