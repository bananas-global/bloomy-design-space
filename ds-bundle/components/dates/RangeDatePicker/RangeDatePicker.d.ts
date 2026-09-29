import * as React from 'react';

/**
 * RangeDatePicker — from bloomy-design-space@0.1.0.
 */
export interface RangeDatePickerProps {
  id?: string;
  label?: string;
  static?: boolean;
  field: FormField;
  className?: string;
  disable?: string[];
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  clear?: boolean;
  onChange?: (value: string) => void;
}

export declare const RangeDatePicker: React.ComponentType<RangeDatePickerProps>;
