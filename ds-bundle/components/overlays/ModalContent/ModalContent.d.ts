import * as React from 'react';

/**
 * ModalContent — from bloomy-design-space@0.1.0.
 */
export interface ModalContentProps {
  title: string;
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}

export declare const ModalContent: React.ComponentType<ModalContentProps>;
