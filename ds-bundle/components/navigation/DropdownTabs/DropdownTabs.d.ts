import * as React from 'react';

/**
 * DropdownTabs — from bloomy-design-space@0.1.0.
 */
export interface DropdownTabsProps {
  id: string;
  /** `[{id, title}]` do original: a lista de `{id, title}` das abas de topo. */
  headers: [string, string][];
  header?: React.ReactNode;
  tab: DropdownTabSlot[];
}

export declare const DropdownTabs: React.ComponentType<DropdownTabsProps>;
