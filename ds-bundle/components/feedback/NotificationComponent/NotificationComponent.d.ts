import * as React from 'react';

/**
 * NotificationComponent — from bloomy-design-space@0.1.0.
 */
export interface NotificationComponentProps {
  notifications?: UserNotification[];
  /** Padrão: as não lidas de `notifications`. */
  unreadCount?: number;
  onNavigate?: (to: string) => void;
}

export declare const NotificationComponent: React.ComponentType<NotificationComponentProps>;
