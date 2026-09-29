import * as React from 'react';

/**
 * InputWithSelect — from bloomy-design-space@0.1.0.
 */
export interface InputWithSelectProps {
  label?: string;
  textField: FormField;
  selectField: FormField;
  options?: readonly (SelectItem | OptionTuple)[];
  disabled?: boolean;
  className?: string;
}

export declare const InputWithSelect: React.ComponentType<InputWithSelectProps>;
