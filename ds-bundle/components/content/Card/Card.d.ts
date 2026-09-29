import * as React from 'react';

/**
 * Card — from bloomy-design-space@0.1.0.
 */
export interface CardProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export declare const Card: React.ComponentType<CardProps>;
