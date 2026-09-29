import * as React from 'react';

/**
 * ImageUpload — from bloomy-design-space@0.1.0.
 */
export interface ImageUploadProps {
  upload: UploadConfig;
  previousUrl?: string;
  className?: string;
  text?: string;
  icon?: string;
  /** O arquivo escolhido: o `phx-change` do formulário. */
  onChange?: (file: File) => void;
}

export declare const ImageUpload: React.ComponentType<ImageUploadProps>;
