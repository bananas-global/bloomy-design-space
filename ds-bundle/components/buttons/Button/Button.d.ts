import * as React from 'react';

/**
 * Button — from bloomy-design-space@0.1.0.
 * @replaces button
 */
export interface ButtonProps {
  type?: "button" | "submit" | "reset";
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue" | "green" | "yellow";
  size?: "small" | "medium" | "normal";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: "regular" | "solid";
  title?: string;
  notificationBadge?: boolean;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}

export declare const Button: React.ComponentType<ButtonProps>;
