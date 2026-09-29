DateNavigator from bloomy-design-space. Use via `window.Bloomy.DateNavigator` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `date_navigator/1`. Como no original, o texto inicial
sai do `Calendar.strftime` em inglês ("30 Jul 2026") e passa ao português do
hook na primeira mudança; `disable` só desliga as setas; e `phx-update="ignore"`
faz o componente ignorar `date` depois de montado.

## Props

```ts
interface DateNavigatorProps {
  date: string;
  className?: string;
  field: FormField;
  disable?: boolean;
  id?: string;
  onChange?: (date: string) => void;
}
```
