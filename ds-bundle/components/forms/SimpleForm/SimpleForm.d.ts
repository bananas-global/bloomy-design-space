import * as React from 'react';

/**
 * SimpleForm — from bloomy-design-space@0.1.0.
 */
export interface SimpleFormProps {
  disabled?: boolean;
  children: React.ReactNode;
  actions?: ReactNode[];
  className?: string;
  id?: string;
  style?: CSSProperties;
}

export declare const SimpleForm: React.ComponentType<SimpleFormProps>;
