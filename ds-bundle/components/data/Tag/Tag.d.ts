import * as React from 'react';

/**
 * Tag — from bloomy-design-space@0.1.0.
 */
export interface TagProps {
  item: string;
  title?: string;
  variant?: "purple" | "light-purple" | "red" | "dark-purple" | "blue" | "green" | "yellow" | "orange" | "light-blue" | "dark-blue" | "cyan" | "light-accent" | "light-red" | "brand";
  className?: string;
  pill?: boolean;
  leftIcon?: string;
  icon?: string;
}

export declare const Tag: React.ComponentType<TagProps>;
