Pagination from bloomy-design-space. Use via `window.Bloomy.Pagination` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PaginationProps {
  /** Existe no `attr`, mas o original não o usa. */
  path?: string;
  meta: PaginationMeta;
  onPaginate?: (page: number) => void;
  pageParam?: string;
}
```

## Examples

### Inicio

```jsx
() => {
  const [page, setPage] = useState(1);
  return <Pagination meta={{ currentPage: page, totalPages: 12 }} onPaginate={setPage} />;
}
```

### Meio

```jsx
() => <Pagination meta={{ currentPage: 6, totalPages: 12 }} onPaginate={() => {}} />
```

### Fim

```jsx
() => <Pagination meta={{ currentPage: 12, totalPages: 12 }} onPaginate={() => {}} />
```

### PoucasPaginas

```jsx
() => <Pagination meta={{ currentPage: 2, totalPages: 3 }} onPaginate={() => {}} />
```
