import * as React from 'react';

/**
 * BrandButton — from bloomy-design-space@0.1.0.
 */
export interface BrandButtonProps {
  type?: "button" | "submit" | "reset";
  color?: "purple" | "light-purple" | "red";
  size?: "small" | "normal";
  variant?: "default" | "tint";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}

export declare const BrandButton: React.ComponentType<BrandButtonProps>;
