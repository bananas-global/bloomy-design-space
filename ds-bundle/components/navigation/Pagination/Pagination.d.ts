import * as React from 'react';

/**
 * Pagination — from bloomy-design-space@0.1.0.
 */
export interface PaginationProps {
  /** Existe no `attr`, mas o original não o usa. */
  path?: string;
  meta: PaginationMeta;
  onPaginate?: (page: number) => void;
  pageParam?: string;
}

export declare const Pagination: React.ComponentType<PaginationProps>;
