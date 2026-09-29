import * as React from 'react';

/**
 * BrandInput — from bloomy-design-space@0.1.0.
 */
export interface BrandInputProps {
  id?: string;
  name?: string;
  value?: unknown;
  className?: string;
  color?: "white" | "dark-purple";
  type?: "text" | "password" | "email";
  field?: FormField;
  errors?: string[];
  errorTag?: Record<string, string>;
  children?: React.ReactNode;
  style?: CSSProperties;
}

export declare const BrandInput: React.ComponentType<BrandInputProps>;
