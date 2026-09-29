import * as React from 'react';

/**
 * SearchBar — from bloomy-design-space@0.1.0.
 */
export interface SearchBarProps {
  id: string;
  errors: string[];
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement>;
  search: string;
  onSearch: (search: string) => void;
  searchAction?: () => void;
}

export declare const SearchBar: React.ComponentType<SearchBarProps>;
