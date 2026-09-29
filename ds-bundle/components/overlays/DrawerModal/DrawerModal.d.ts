import * as React from 'react';

/**
 * DrawerModal — from bloomy-design-space@0.1.0.
 */
export interface DrawerModalProps {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  placement?: "left" | "right";
  variant?: "extra_small" | "small" | "medium" | "large" | "custom";
  customSize?: string;
  headerClass?: string;
  contentClass?: string;
  customTitle?: CustomTitleSlot;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export declare const DrawerModal: React.ComponentType<DrawerModalProps>;
