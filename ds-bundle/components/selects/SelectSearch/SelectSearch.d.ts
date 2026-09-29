import * as React from 'react';

/**
 * SelectSearch — from bloomy-design-space@0.1.0.
 */
export interface SelectSearchProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name?: string;
  prompt?: string;
  label?: string;
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  searchAction?: () => void;
  leftIcon?: string;
  className?: string;
  classOptions?: string;
  value?: unknown;
  onChange?: (value: string | null) => void;
}

export declare const SelectSearch: React.ComponentType<SelectSearchProps>;
