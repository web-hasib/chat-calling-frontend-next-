'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string; 
  avatarUrl: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password?: string) => Promise<void>;
  signup: (email: string, name: string, username: string, password?: string) => Promise<void>;
  updateProfile: (data: {
    name?: string;
    username?: string;
    avatarUrl?: string;
    pushNotificationsEnabled?: boolean;
    soundEffectsEnabled?: boolean;
    messageTone?: string;
    callTone?: string;
  }) => Promise<void>;
  logout: () => void;
  setOAuthToken: (token: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const clearError = () => setError(null);

  const login = async (emailOrUsername: string, password?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(body.message || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      router.push('/chat');
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, name: string, username: string, password?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(body.message || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      router.push('/chat');
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: {
    name?: string;
    username?: string;
    avatarUrl?: string;
    pushNotificationsEnabled?: boolean;
    soundEffectsEnabled?: boolean;
    messageTone?: string;
    callTone?: string;
  }) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(body.message || `Request failed with status ${res.status}`);
      }

      const responseData = await res.json();
      localStorage.setItem('user', JSON.stringify(responseData.user));
      setUser(responseData.user);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
      throw e;
    }
  };

  const setOAuthToken = async (jwtToken: string) => {
    try {
      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);

      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      const matchedUser = {
        id: payload.sub,
        email: payload.email || 'oauth-user@example.com',
        name: 'OAuth User',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=oauth`,
      };

      localStorage.setItem('user', JSON.stringify(matchedUser));
      setUser(matchedUser);
      router.push('/chat');
    } catch (e) {
      setError('OAuth authentication failed. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, signup, updateProfile, logout, setOAuthToken, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
