import * as React from 'react';

/**
 * Table — from bloomy-design-space@0.1.0.
 * @replaces table
 */
export interface TableProps {
  id: string;
  className?: string;
  rows: T[];
  rowId?: (row: T) => string;
  rowClick?: (row: T) => void;
  emptyMessage?: string;
  rowItem?: (row: T) => I;
  col: TableCol<I>[];
  action?: ((item: I) => ReactNode)[];
}

export declare const Table: React.ComponentType<TableProps>;
