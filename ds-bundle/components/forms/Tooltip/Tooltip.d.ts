import * as React from 'react';

/**
 * Tooltip — from bloomy-design-space@0.1.0.
 */
export interface TooltipProps {
  id: string;
  placement?: "left" | "right" | "bottom" | "top";
  tooltipClass?: string;
  triggerClass?: string;
  tooltipTrigger: boolean | { active?: "true" | "false"; children: ReactNode; } | React.ReactNode;
  tooltipContent: React.ReactNode;
}

export declare const Tooltip: React.ComponentType<TooltipProps>;
