FileUploader from bloomy-design-space. Use via `window.Bloomy.FileUploader` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FileUploaderProps {
  upload: UploadConfig;
  target?: unknown;
  rest?: InputHTMLAttributes<HTMLInputElement>;
  validateEntryDone?: boolean;
  variant?: "default" | "simplified";
  entriesFirst?: boolean;
  /** Os arquivos escolhidos: o `phx-change` do formulário. */
  onChange?: (files: File[]) => void;
  /** O `cancel-upload` com `phx-value-ref`. */
  onCancel?: (ref: string) => void;
}
```
