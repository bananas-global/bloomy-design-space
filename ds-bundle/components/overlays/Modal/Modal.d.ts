import * as React from 'react';

/**
 * Modal — from bloomy-design-space@0.1.0.
 * @replaces dialog
 */
export interface ModalProps {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  variant?: "extra_small" | "small" | "medium" | "large" | "custom";
  customSize?: string;
  withPadding?: boolean;
  customTitle?: CustomTitleSlot;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export declare const Modal: React.ComponentType<ModalProps>;
