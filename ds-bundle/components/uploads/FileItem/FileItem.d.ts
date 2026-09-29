import * as React from 'react';

/**
 * FileItem — from bloomy-design-space@0.1.0.
 */
export interface FileItemProps {
  fileName: string;
  size: number;
  url?: string;
  removeEvent?: (id: unknown) => void;
  removeId?: unknown;
  target?: unknown;
  category?: "normal" | "certificate" | "administrative" | "clinical" | "personal";
  variant?: "default" | "simplified";
}

export declare const FileItem: React.ComponentType<FileItemProps>;
