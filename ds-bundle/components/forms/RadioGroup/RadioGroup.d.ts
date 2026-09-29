import * as React from 'react';

/**
 * RadioGroup — from bloomy-design-space@0.1.0.
 */
export interface RadioGroupProps {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  variant?: "purple" | "default";
  radio: { value: string; label: string; disabled?: boolean; removable?: () => void; }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export declare const RadioGroup: React.ComponentType<RadioGroupProps>;
