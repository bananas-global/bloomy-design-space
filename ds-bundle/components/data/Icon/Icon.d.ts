import * as React from 'react';

/**
 * Icon — from bloomy-design-space@0.1.0.
 */
export interface IconProps {
  /** O nome como está no monólito: `fa-users`, ou `fa-solid fa-bullhorn`. */
  name: string;
  /** `regular` é o padrão do sistema. Ignorado quando o nome já traz o estilo. */
  type?: "regular" | "solid";
  className?: string;
}

export declare const Icon: React.ComponentType<IconProps>;
