'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ sideOffset = 6, style, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    style={{
      zIndex: 100,
      borderRadius: '9999px',
      border: '1px solid #ef4444',
      backgroundColor: 'var(--bg-secondary)',
      padding: '4px 12px',
      fontSize: '12px',
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      pointerEvents: 'auto',
      ...style,
    }}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
