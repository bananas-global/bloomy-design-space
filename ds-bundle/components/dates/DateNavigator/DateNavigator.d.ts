import * as React from 'react';

/**
 * DateNavigator — from bloomy-design-space@0.1.0.
 */
export interface DateNavigatorProps {
  date: string;
  className?: string;
  field: FormField;
  disable?: boolean;
  id?: string;
  onChange?: (date: string) => void;
}

export declare const DateNavigator: React.ComponentType<DateNavigatorProps>;
