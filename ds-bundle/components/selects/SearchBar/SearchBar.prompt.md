SearchBar from bloomy-design-space. Use via `window.Bloomy.SearchBar` (bundle loaded from the root `_ds_bundle.js`).

A barra de busca do painel, comum a `SelectSearch` e `MultiSelectSearch`.

## Props

```ts
interface SearchBarProps {
  id: string;
  errors: string[];
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement>;
  search: string;
  onSearch: (search: string) => void;
  searchAction?: () => void;
}
```
