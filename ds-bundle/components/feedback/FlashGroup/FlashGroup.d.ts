import * as React from 'react';

/**
 * FlashGroup — from bloomy-design-space@0.1.0.
 */
export interface FlashGroupProps {
  flash: Partial<Record<FlashKind, ReactNode>>;
  id?: string;
}

export declare const FlashGroup: React.ComponentType<FlashGroupProps>;
