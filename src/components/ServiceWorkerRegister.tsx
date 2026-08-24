'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../utils/notifications';

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
};
