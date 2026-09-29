import * as React from 'react';

/**
 * FormGrid — from bloomy-design-space@0.1.0.
 */
export interface FormGridProps {
  className?: string;
  variant?: "small" | "medium";
  children: React.ReactNode;
}

export declare const FormGrid: React.ComponentType<FormGridProps>;
