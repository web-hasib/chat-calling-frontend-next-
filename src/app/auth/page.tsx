'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const { login, signup, error, clearError, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'login') {
      if (!emailOrUsername || !password) return;
      await login(emailOrUsername.trim(), password);
    } else {
      if (!email || !name || !username || !password) return;
      await signup(email.trim(), name.trim(), username.trim().toLowerCase(), password);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    clearError();
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-5 py-10"
      style={{ background: 'radial-gradient(circle at top right, var(--bg-secondary), var(--bg-primary))' }}
    >
      <div className="w-full max-w-[440px] p-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col gap-7 animate-[fadeIn_0.4s_ease]">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors w-fit mb-1.5 no-underline">
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-center">Minimal Chat</h1>
          <p className="text-[var(--text-secondary)] text-sm text-center">
            {mode === 'login' ? 'Sign in to start messaging & calling' : 'Create an account to get started'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-[13px] leading-relaxed animate-[fadeIn_0.2s_ease]">
            <span>{error}</span>
            <button onClick={clearError} className="bg-transparent border-none text-red-300 text-sm cursor-pointer shrink-0 opacity-70 hover:opacity-100 transition-opacity" aria-label="Dismiss">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-1 border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => { setMode('login'); clearError(); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all border-none ${
              mode === 'login'
                ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-sm'
                : 'bg-transparent text-[var(--text-secondary)]'
            }`}
          >Sign In</button>
          <button
            type="button"
            onClick={() => { setMode('signup'); clearError(); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all border-none ${
              mode === 'signup'
                ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-sm'
                : 'bg-transparent text-[var(--text-secondary)]'
            }`}
          >Sign Up</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'login' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Email or Username</label>
                <input
                  type="text" placeholder="Username or email" value={emailOrUsername}
                  onChange={(e) => { setEmailOrUsername(e.target.value); clearError(); }}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                  required disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full px-4 py-3 pr-11 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                    required disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 bg-transparent border-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center p-1 rounded transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Display Name</label>
                <input type="text" placeholder="Your Name" value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                  required disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Username</label>
                <input type="text" placeholder="e.g. john_doe" value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError(); }}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                  pattern="^[a-zA-Z0-9_]{3,15}$" title="Username must be 3-15 alphanumeric characters or underscores"
                  required disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Email Address</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                  required disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full px-4 py-3 pr-11 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] transition-colors"
                    required minLength={6} disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 bg-transparent border-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center p-1 rounded transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 text-[var(--text-muted)] text-xs">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          Or connect via
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* OAuth */}
        <div className="flex flex-col gap-3">
          <button onClick={() => handleOAuth('google')} disabled={loading}
            className="w-full py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-sm font-medium cursor-pointer flex items-center justify-center gap-2.5 hover:bg-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button onClick={() => handleOAuth('github')} disabled={loading}
            className="w-full py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-sm font-medium cursor-pointer flex items-center justify-center gap-2.5 hover:bg-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
