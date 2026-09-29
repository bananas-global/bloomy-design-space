import * as React from 'react';

/**
 * ButtonTabs — from bloomy-design-space@0.1.0.
 */
export interface ButtonTabsProps {
  id: string;
  size?: "small" | "normal";
  className?: string;
  tab: ButtonTabSlot[];
  actions?: React.ReactNode;
}

export declare const ButtonTabs: React.ComponentType<ButtonTabsProps>;
