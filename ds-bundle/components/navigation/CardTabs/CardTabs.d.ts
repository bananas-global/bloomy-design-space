import * as React from 'react';

/**
 * CardTabs — from bloomy-design-space@0.1.0.
 */
export interface CardTabsProps {
  id: string;
  header: React.ReactNode;
  tab: CardTabSlot[];
  children?: React.ReactNode;
}

export declare const CardTabs: React.ComponentType<CardTabsProps>;
