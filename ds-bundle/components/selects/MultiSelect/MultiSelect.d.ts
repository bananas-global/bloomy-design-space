import * as React from 'react';

/**
 * MultiSelect — from bloomy-design-space@0.1.0.
 */
export interface MultiSelectProps {
  id: string;
  options?: MultiSelectOption[];
  field: FormField;
  label: string;
  prompt?: string;
  className?: string;
  onChange?: (ids: string[]) => void;
}

export declare const MultiSelect: React.ComponentType<MultiSelectProps>;
