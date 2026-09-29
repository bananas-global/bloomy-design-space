import * as React from 'react';

/**
 * Input — from bloomy-design-space@0.1.0.
 * @replaces input
 */
export interface InputProps {
  id?: string;
  name?: string;
  label?: string;
  value?: unknown;
  inputValue?: unknown;
  className?: string;
  inputClass?: string;
  innerClass?: string;
  callback?: (search: string) => SelectItem[];
  removable?: (value: unknown) => (() => void) | null | undefined | false;
  searchAction?: () => void;
  hint?: string;
  color?: "purple" | "default" | "default_darker";
  variant?: "default" | "rounded_left" | "rounded_right";
  leftIcon?: string;
  rightIcon?: string;
  clear?: boolean;
  field?: FormField;
  errors?: string[];
  checked?: boolean;
  prompt?: string;
  options?: readonly (SelectItem | OptionTuple)[];
  createOptions?: readonly SelectItem[];
  classOptions?: string;
  multiple?: boolean;
  errorTag?: Record<string, string>;
  aiGenerate?: AiGenerate;
  patternModule?: string;
  /** Os padrões de texto que `Bloomy.TextPatterns` devolveria para `patternModule`. */
  patterns?: TextPattern[];
  showHeadings?: boolean;
  tagLabel?: string;
  rows?: number;
  cols?: number;
  children?: React.ReactNode;
  style?: CSSProperties;
  type?: "number" | "color" | "hidden" | "text" | "password" | "email" | "checkbox" | "date" | "datetime-local" | "file" | "month" | "tags" | "range" | "slider" | "search" | "select" | (string & {}) /* +13 more */;
  onChange?: ((event: ChangeEvent<HTMLInputElement>) => void) | ((event: ChangeEvent<HTMLTextAreaElement>) => void) | ((value: string | null) => void) | ((values: string[]) => void) | ((html: string) => void);
}

export declare const Input: React.ComponentType<InputProps>;
