import * as React from 'react';

/**
 * LazyTabs — from bloomy-design-space@0.1.0.
 */
export interface LazyTabsProps {
  id: string;
  tabs: Maybe<LazyTabEntry>[];
  opts?: { card?: boolean; };
  activeTab?: string;
  header?: React.ReactNode;
}

export declare const LazyTabs: React.ComponentType<LazyTabsProps>;
