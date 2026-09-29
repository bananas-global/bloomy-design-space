import * as React from 'react';

/**
 * Label — from bloomy-design-space@0.1.0.
 */
export interface LabelProps {
  htmlFor?: string;
  className?: string;
  color?: string;
  children?: React.ReactNode;
}

export declare const Label: React.ComponentType<LabelProps>;
