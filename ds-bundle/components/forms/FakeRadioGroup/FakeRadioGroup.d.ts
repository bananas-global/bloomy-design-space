import * as React from 'react';

/**
 * FakeRadioGroup — from bloomy-design-space@0.1.0.
 */
export interface FakeRadioGroupProps {
  label?: string;
  selectedValue?: unknown;
  variant?: "purple" | "default";
  className?: string;
  radio: { name: string; value: unknown; label: string; }[];
}

export declare const FakeRadioGroup: React.ComponentType<FakeRadioGroupProps>;
