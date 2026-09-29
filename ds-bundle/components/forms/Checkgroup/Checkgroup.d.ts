import * as React from 'react';

/**
 * Checkgroup — from bloomy-design-space@0.1.0.
 */
export interface CheckgroupProps {
  color?: "purple" | "default" | "default_darker";
  className?: string;
  children?: React.ReactNode;
  name?: string;
  value?: unknown;
  id?: string;
  checked?: boolean;
  multiple?: boolean;
  label?: string;
  inputValue?: unknown;
  inputClass?: string;
  innerClass?: string;
  callback?: (search: string) => SelectItem[];
  removable?: (value: unknown) => (() => void) | null | undefined | false;
  searchAction?: () => void;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  clear?: boolean;
  field?: FormField;
  errors?: string[];
  prompt?: string;
  options?: readonly (SelectItem | OptionTuple)[];
  createOptions?: readonly SelectItem[];
  classOptions?: string;
  errorTag?: Record<string, string>;
  aiGenerate?: AiGenerate;
  patternModule?: string;
  /** Os padrões de texto que `Bloomy.TextPatterns` devolveria para `patternModule`. */
  patterns?: TextPattern[];
  showHeadings?: boolean;
  tagLabel?: string;
  rows?: number;
  cols?: number;
  variant?: "purple" | "default";
  disabled?: boolean;
  form?: string;
  readOnly?: boolean;
  onChange?: (values: string[]) => void;
}

export declare const Checkgroup: React.ComponentType<CheckgroupProps>;
