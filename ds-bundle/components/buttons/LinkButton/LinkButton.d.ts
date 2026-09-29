import * as React from 'react';

/**
 * LinkButton — from bloomy-design-space@0.1.0.
 */
export interface LinkButtonProps {
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue";
  className?: string;
  navigate?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}

export declare const LinkButton: React.ComponentType<LinkButtonProps>;
