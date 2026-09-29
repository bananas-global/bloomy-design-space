import * as React from 'react';

/**
 * MonthPicker — from bloomy-design-space@0.1.0.
 */
export interface MonthPickerProps {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  onChange?: (value: string) => void;
}

export declare const MonthPicker: React.ComponentType<MonthPickerProps>;
