RichText from bloomy-design-space. Use via `window.Bloomy.RichText` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface RichTextProps {
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
```
