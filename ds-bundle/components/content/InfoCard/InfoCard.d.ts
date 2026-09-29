import * as React from 'react';

/**
 * InfoCard — from bloomy-design-space@0.1.0.
 */
export interface InfoCardProps {
  title?: string;
  info?: string;
  variant: "blue" | "green" | "info" | "orange" | "accent";
  className?: string;
  icon?: string;
}

export declare const InfoCard: React.ComponentType<InfoCardProps>;
