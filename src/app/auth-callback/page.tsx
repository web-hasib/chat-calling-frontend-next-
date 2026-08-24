'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

import { LoadingLogo } from '../../components/LoadingLogo';

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
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary,#0c0e14)]">
      <LoadingLogo size={90} text="Authenticating..." />
    </div>
  );
};

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary,#0c0e14)]">
        <LoadingLogo size={90} text="Loading authentication..." />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
