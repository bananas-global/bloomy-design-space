import * as React from 'react';

/**
 * CheckboxGroup — from bloomy-design-space@0.1.0.
 */
export interface CheckboxGroupProps {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  checkbox: { value: string; label: string; disable?: boolean; }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export declare const CheckboxGroup: React.ComponentType<CheckboxGroupProps>;
