'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const CallbackHandler: React.FC = () => {
  const searchParams = useSearchParams();
  const { setOAuthToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setOAuthToken(token);
    }
  }, [searchParams, setOAuthToken]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-secondary)',
      fontSize: '16px'
    }}>
      Authenticating... Please wait.
    </div>
  );
};

export default function AuthCallback() {
  return (
    <Suspense fallback={<div>Loading authentication...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
