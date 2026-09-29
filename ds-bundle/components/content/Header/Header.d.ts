import * as React from 'react';

/**
 * Header — from bloomy-design-space@0.1.0.
 */
export interface HeaderProps {
  className?: string;
  variant?: "small" | "large" | "default";
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export declare const Header: React.ComponentType<HeaderProps>;
