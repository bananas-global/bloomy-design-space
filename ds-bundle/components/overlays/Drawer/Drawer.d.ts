import * as React from 'react';

/**
 * Drawer — from bloomy-design-space@0.1.0.
 */
export interface DrawerProps {
  currentPath?: string;
  className?: string;
  item: DrawerItem[];
  /** `data-collapsed` do `aside`: `true` é a barra estreita (e zero no celular). */
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (to: string) => void;
}

export declare const Drawer: React.ComponentType<DrawerProps>;
