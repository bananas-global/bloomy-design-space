import * as React from 'react';

/**
 * Progress — from bloomy-design-space@0.1.0.
 */
export interface ProgressProps {
  value: number;
  variant?: "purple" | "default" | "error" | "accent";
  showPercentage?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
}

export declare const Progress: React.ComponentType<ProgressProps>;
