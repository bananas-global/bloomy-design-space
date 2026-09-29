import * as React from 'react';

/**
 * RichText — from bloomy-design-space@0.1.0.
 */
export interface RichTextProps {
  id: string;
  name?: string;
  value?: string;
  readonly?: string;
  disabled?: boolean;
  aiGenerate?: AiGenerate;
  className?: string;
  patternModule?: string;
  patterns?: TextPattern[];
  showHeadings?: boolean;
  onChange?: (html: string) => void;
}

export declare const RichText: React.ComponentType<RichTextProps>;
