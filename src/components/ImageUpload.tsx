import { useEffect, useRef, useState } from "react";
import { Button } from "./Button.js";
import { cx } from "./Input.js";
import type { UploadConfig } from "./FileUploader.js";

/**
 * `core_components.ex` → `image_upload/1`. O `live_img_preview` da última
 * entrada vira um `<img>` com `URL.createObjectURL` do arquivo escolhido.
 */
export function ImageUpload({
  upload,
  previousUrl,
  className,
  text = "Adicionar Foto",
  icon = "fa-add",
  onChange,
}: {
  upload: UploadConfig;
  previousUrl?: string;
  className?: string;
  text?: string;
  icon?: string;
  /** O arquivo escolhido: o `phx-change` do formulário. */
  onChange?: (file: File) => void;
}) {
  const [image, setImage] = useState<string>();
  const objectUrl = useRef<string | undefined>(undefined);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  return (
    <div className={cx("flex items-center gap-4", className)}>
      <div className="h-20 w-20 rounded-full bg-blue-light border-[3px] border-brand-blue/60">
        {image ? (
          <img src={image} className="w-full h-full inset-0 object-cover rounded-full" />
        ) : (
          previousUrl && <img src={previousUrl} className="w-full h-full inset-0 object-cover rounded-full" />
        )}
      </div>

      <Button type="button" variant="tint" rightIcon={icon} onClick={() => document.getElementById(upload.ref)?.click()}>
        {text}
      </Button>

      <input
        type="file"
        id={upload.ref}
        name={upload.name}
        accept={upload.accept}
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = URL.createObjectURL(file);
          setImage(objectUrl.current);
          onChange?.(file);
        }}
      />
    </div>
  );
}
