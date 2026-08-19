'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';
import { Eye, EyeOff } from 'lucide-react';

export default function Home() {
  const { login, signup, error, clearError, loading } = useAuth();
  
  // mode: 'login' | 'signup'
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
    } else if (mode === 'signup') {
      if (!email || !name || !username || !password) return;
      await signup(email.trim(), name.trim(), username.trim().toLowerCase(), password);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    clearError();
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Minimal Chat</h1>
          <p className={styles.subtitle}>
            {mode === 'login' ? 'Sign in to start messaging & calling' : 'Create an account to get started'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button className={styles.errorClose} onClick={clearError} aria-label="Dismiss">✕</button>
          </div>
        )}

        {/* Tab Selection */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'login' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('login'); clearError(); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('signup'); clearError(); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'login' && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email or Username</label>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={emailOrUsername}
                  onChange={(e) => { setEmailOrUsername(e.target.value); clearError(); }}
                  className={styles.input}
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className={styles.passwordInput}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Display Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                  className={styles.input}
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError(); }}
                  className={styles.input}
                  pattern="^[a-zA-Z0-9_]{3,15}$"
                  title="Username must be 3-15 alphanumeric characters or underscores"
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className={styles.input}
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className={styles.passwordInput}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className={styles.divider}>Or connect via</div>

        {/* Social Logins */}
        <div className={styles.oauthContainer}>
          <button onClick={() => handleOAuth('google')} className={styles.btnOauth} disabled={loading}>
            Continue with Google
          </button>
          <button onClick={() => handleOAuth('github')} className={styles.btnOauth} disabled={loading}>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
