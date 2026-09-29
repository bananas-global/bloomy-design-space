import * as React from 'react';

/**
 * Avatar — from bloomy-design-space@0.1.0.
 */
export interface AvatarProps {
  imageUrl?: string;
  size?: "extra_small" | "small" | "medium" | "extra_medium" | "large" | "extra_large" | "custom";
  shape?: "round" | "square";
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export declare const Avatar: React.ComponentType<AvatarProps>;
