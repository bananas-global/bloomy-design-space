import * as React from 'react';

/**
 * FakeInput — from bloomy-design-space@0.1.0.
 */
export interface FakeInputProps {
  value?: React.ReactNode;
  label?: string;
  labelColor?: "default" | "blue";
  rightIcon?: string;
  className?: string;
  children?: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}

export declare const FakeInput: React.ComponentType<FakeInputProps>;
