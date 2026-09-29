import * as React from 'react';

/**
 * RadioCards — from bloomy-design-space@0.1.0.
 */
export interface RadioCardsProps {
  id: string;
  value?: string;
  name?: string;
  title?: string;
  option: { id: string; title: string; subtitle?: string; badge?: string; icon?: string; children?: ReactNode; }[];
  /** O `phx-click="select-option"` com `phx-value-value`. */
  onChange?: (value: string) => void;
}

export declare const RadioCards: React.ComponentType<RadioCardsProps>;
