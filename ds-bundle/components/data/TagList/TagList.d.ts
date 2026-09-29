import * as React from 'react';

/**
 * TagList — from bloomy-design-space@0.1.0.
 */
export interface TagListProps {
  items: string[];
  limit?: number;
  variant?: "light-purple" | "red" | "blue" | "orange" | "light-blue";
  className?: string;
}

export declare const TagList: React.ComponentType<TagListProps>;
