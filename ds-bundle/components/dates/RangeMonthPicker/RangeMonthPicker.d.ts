import * as React from 'react';

/**
 * RangeMonthPicker — from bloomy-design-space@0.1.0.
 */
export interface RangeMonthPickerProps {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  disable?: string[];
  onChange?: (value: string) => void;
}

export declare const RangeMonthPicker: React.ComponentType<RangeMonthPickerProps>;
