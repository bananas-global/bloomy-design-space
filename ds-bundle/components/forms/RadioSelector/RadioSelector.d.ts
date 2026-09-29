import * as React from 'react';

/**
 * RadioSelector — from bloomy-design-space@0.1.0.
 */
export interface RadioSelectorProps {
  label?: string;
  className?: string;
  field: FormField;
  variant?: "purple" | "default";
  radio: { value: string; title?: string; label?: string; icon?: string; warningNumber?: number; disabled?: boolean; }[];
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export declare const RadioSelector: React.ComponentType<RadioSelectorProps>;
