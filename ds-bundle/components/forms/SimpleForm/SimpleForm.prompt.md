SimpleForm from bloomy-design-space. Use via `window.Bloomy.SimpleForm` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `simple_form/1`.
`for` e `as` (o changeset e o nome dos parâmetros) não têm equivalente: quem
nomeia os campos é o `name` de cada input. Com `disabled`, `onSubmit` e
`onChange` são descartados, como `filter_form_events/2` faz com os `phx-*`.

## Props

```ts
interface SimpleFormProps {
  disabled?: boolean;
  children: React.ReactNode;
  actions?: ReactNode[];
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
