import * as React from 'react';

/**
 * CustomSelect — from bloomy-design-space@0.1.0.
 */
export interface CustomSelectProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name?: string;
  prompt?: string;
  label?: string;
  disabled?: boolean;
  errorTag?: Record<string, string>;
  inputClass?: string;
  clear?: boolean;
  value?: unknown;
  variant?: string;
  color?: string;
  classOptions?: string;
  onChange?: (value: string | null) => void;
}

export declare const CustomSelect: React.ComponentType<CustomSelectProps>;
