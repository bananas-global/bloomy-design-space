ImageUpload from bloomy-design-space. Use via `window.Bloomy.ImageUpload` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `image_upload/1`. O `live_img_preview` da última
entrada vira um `<img>` com `URL.createObjectURL` do arquivo escolhido.

## Props

```ts
interface ImageUploadProps {
  upload: UploadConfig;
  previousUrl?: string;
  className?: string;
  text?: string;
  icon?: string;
  /** O arquivo escolhido: o `phx-change` do formulário. */
  onChange?: (file: File) => void;
}
```
