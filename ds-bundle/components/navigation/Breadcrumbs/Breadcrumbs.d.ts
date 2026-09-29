import * as React from 'react';

/**
 * Breadcrumbs — from bloomy-design-space@0.1.0.
 */
export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  onNavigate?: (to: string) => void;
}

export declare const Breadcrumbs: React.ComponentType<BreadcrumbsProps>;
