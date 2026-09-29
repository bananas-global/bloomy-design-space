import * as React from 'react';

/**
 * MultiSelectSearch — from bloomy-design-space@0.1.0.
 */
export interface MultiSelectSearchProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name: string;
  prompt?: string;
  label?: string;
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  leftIcon?: string;
  searchAction?: () => void;
  classOptions?: string;
  value?: string[];
  onChange?: (values: string[]) => void;
}

export declare const MultiSelectSearch: React.ComponentType<MultiSelectSearchProps>;
