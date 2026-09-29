import * as React from 'react';

/**
 * HealthCareLayout — from bloomy-design-space@0.1.0.
 */
export interface HealthCareLayoutProps {
  currentPath?: string;
  currentHealthCareUser?: HealthCareUser;
  currentUnit?: string;
  onNavigate?: (to: string) => void;
  flash?: React.ReactNode;
  children: React.ReactNode;
}

export declare const HealthCareLayout: React.ComponentType<HealthCareLayoutProps>;
