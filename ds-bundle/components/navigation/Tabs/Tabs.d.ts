import * as React from 'react';

/**
 * Tabs — from bloomy-design-space@0.1.0.
 */
export interface TabsProps {
  id: string;
  className?: string;
  contentClass?: string;
  tab: TabSlot[];
}

export declare const Tabs: React.ComponentType<TabsProps>;
