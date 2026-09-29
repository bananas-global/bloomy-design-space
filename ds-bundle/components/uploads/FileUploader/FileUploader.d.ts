import * as React from 'react';

/**
 * FileUploader — from bloomy-design-space@0.1.0.
 */
export interface FileUploaderProps {
  upload: UploadConfig;
  target?: unknown;
  rest?: InputHTMLAttributes<HTMLInputElement>;
  validateEntryDone?: boolean;
  variant?: "default" | "simplified";
  entriesFirst?: boolean;
  /** Os arquivos escolhidos: o `phx-change` do formulário. */
  onChange?: (files: File[]) => void;
  /** O `cancel-upload` com `phx-value-ref`. */
  onCancel?: (ref: string) => void;
}

export declare const FileUploader: React.ComponentType<FileUploaderProps>;
