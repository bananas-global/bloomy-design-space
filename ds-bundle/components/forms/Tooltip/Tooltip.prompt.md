Tooltip from bloomy-design-space. Use via `window.Bloomy.Tooltip` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `tooltip/1`. Como o hook `Tooltip`: o conteúdo vai
para o `body`, aparece no `mouseenter` do gatilho quando `active` é `"true"`
e é posicionado com `offset(4)`, `flip` e `shift({padding: 8})`.

## Props

```ts
interface TooltipProps {
  id: string;
  placement?: "left" | "right" | "bottom" | "top";
  tooltipClass?: string;
  triggerClass?: string;
  tooltipTrigger: boolean | { active?: "true" | "false"; children: ReactNode; } | React.ReactNode;
  tooltipContent: React.ReactNode;
}
```

## Examples

### DicaRight

```jsx
() => {
  useHover("tip-right");
  return (
    <div className="flex justify-center pt-16">
      <Tooltip id="tip-right" tooltipTrigger={<Button variant="tint" size="medium">Mapa</Button>} tooltipContent="Mapa da Unidade" />
    </div>
  );
}
```

### DicaTop

```jsx
() => {
  useHover("tip-top");
  return (
    <div className="flex justify-center pt-16">
      <Tooltip id="tip-top" placement="top" tooltipTrigger={<Button variant="outline" size="medium">Programa</Button>} tooltipContent="Programa estruturado" />
    </div>
  );
}
```

### Gatilhos

```jsx
() => (
  <div className="flex gap-4">
    <Tooltip id="tip-g1" tooltipTrigger={<Button variant="tint" size="medium">Passe o mouse</Button>} tooltipContent="Mapa da Unidade" />
    <Tooltip id="tip-g2" placement="top" tooltipTrigger={<Button variant="outline" size="medium">Acima</Button>} tooltipContent="Programa estruturado" />
  </div>
)
```
