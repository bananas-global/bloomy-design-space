import * as React from 'react';

/**
 * SwitchCard — from bloomy-design-space@0.1.0.
 */
export interface SwitchCardProps {
  id?: string;
  field: FormField;
  inputValue?: unknown;
  className?: string;
  multiple?: boolean;
  title: string;
  description: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export declare const SwitchCard: React.ComponentType<SwitchCardProps>;
