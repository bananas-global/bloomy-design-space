import * as React from 'react';

/**
 * WeekSelector — from bloomy-design-space@0.1.0.
 */
export interface WeekSelectorProps {
  event: (value: { first: string; last: string; }) => void;
  range: { first: string; last: string; };
  className?: string;
}

export declare const WeekSelector: React.ComponentType<WeekSelectorProps>;
