Flash from bloomy-design-space. Use via `window.Bloomy.Flash` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `flash/1`.
O `phx-click` (`lv:clear-flash` + `hide`) vira estado local: clicar no aviso
o esconde e chama o `onClick` recebido.

## Props

```ts
interface FlashProps {
  id?: string;
  flash?: Partial<Record<FlashKind, ReactNode>>;
  title?: string;
  kind: "info" | "error";
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

## Examples

### ComTituloInfo

```jsx
() => (
  <Palco>
  <Flash kind="info" title="Sucesso!">Programa estruturado salvo.</Flash>
  </Palco>
)
```

### ErroComTitulo

```jsx
() => (
  <Palco>
  <Flash kind="error" title="Erro!">Não foi possível salvar o programa.</Flash>
  </Palco>
)
```

### SemTitulo

```jsx
() => (
  <Palco>
    <Flash kind="info">Plano de intervenção enviado para a supervisão.</Flash>
  </Palco>
)
```

## Related

`FlashGroup`
