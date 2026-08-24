'use client';

import React from 'react';
import { LoadingLogo } from './LoadingLogo';

interface AppLoadingScreenProps {
  size?: number;
  fullScreen?: boolean;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  size = 110,
  fullScreen = true,
}) => {
  return (
    <div 
      className={`appLoadingScreen ${
        fullScreen ? '' : '!relative !inset-auto !w-full !h-full !min-h-[300px]'
      }`}
    >
      <LoadingLogo size={size} showText={false} />
    </div>
  );
};
export default AppLoadingScreen;
