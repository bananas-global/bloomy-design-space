import * as React from 'react';

/**
 * Timer — from bloomy-design-space@0.1.0.
 */
export interface TimerProps {
  customService: TimerCustomService;
  /** Relógio de referência (ISO). O componente não lê a hora do sistema; conta a partir daqui. */
  now: string;
  className?: string;
  onNavigate?: (to: string) => void;
}

export declare const Timer: React.ComponentType<TimerProps>;
