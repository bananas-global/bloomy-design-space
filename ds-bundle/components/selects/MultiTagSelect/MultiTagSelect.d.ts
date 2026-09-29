import * as React from 'react';

/**
 * MultiTagSelect — from bloomy-design-space@0.1.0.
 */
export interface MultiTagSelectProps {
  id?: string;
  name: string;
  value?: string[];
  readonly?: boolean;
  onChange?: (items: string[]) => void;
}

export declare const MultiTagSelect: React.ComponentType<MultiTagSelectProps>;
