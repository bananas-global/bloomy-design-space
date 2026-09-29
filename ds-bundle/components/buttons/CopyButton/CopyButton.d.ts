import * as React from 'react';

/**
 * CopyButton — from bloomy-design-space@0.1.0.
 */
export interface CopyButtonProps {
  id: string;
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue" | "green";
  size?: "small" | "normal";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  title?: string;
  textToCopy: string;
  children: React.ReactNode;
  style?: CSSProperties;
}

export declare const CopyButton: React.ComponentType<CopyButtonProps>;
