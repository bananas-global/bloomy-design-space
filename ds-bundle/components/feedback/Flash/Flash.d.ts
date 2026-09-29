import * as React from 'react';

/**
 * Flash — from bloomy-design-space@0.1.0.
 */
export interface FlashProps {
  id?: string;
  flash?: Partial<Record<FlashKind, ReactNode>>;
  title?: string;
  kind: "info" | "error";
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export declare const Flash: React.ComponentType<FlashProps>;
