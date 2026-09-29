import * as React from 'react';

/**
 * Dropdown — from bloomy-design-space@0.1.0.
 * @replaces select
 */
export interface DropdownProps {
  id?: string;
  className?: string;
  dropdownClass?: string;
  placement?: "bottom-end" | "bottom-start" | "bottom";
  items: React.ReactNode;
  children: React.ReactNode;
}

export declare const Dropdown: React.ComponentType<DropdownProps>;
