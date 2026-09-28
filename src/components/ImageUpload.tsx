import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button.js";

export type ImageUploadProps = {
  id?: string;
  name: string;
  previousUrl?: string;
  accept?: string;
  text?: string;
  icon?: string;
  className?: string;
  onFileChange?: (file: File) => void;
};

/** `image_upload/1`: imagem circular, ação tint e input de arquivo escondido. */
export function ImageUpload({
  id,
  name,
  previousUrl,
  accept = ".jpg,.jpeg,.png",
  text = "Adicionar Foto",
  icon = "fa-add",
  className,
  onFileChange,
}: ImageUploadProps) {
  const generatedId = useId();
  const inputId = id ?? `image-upload-${generatedId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const [preview, setPreview] = useState<{ url: string; fileName: string }>();

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function selectFile(file: File | undefined) {
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = nextUrl;
    setPreview({ url: nextUrl, fileName: file.name });
    onFileChange?.(file);
  }

  const visibleUrl = preview?.url ?? previousUrl;
  const statusId = `${inputId}-status`;

  return (
    <div id={`${inputId}-wrapper`} className={["flex items-center gap-4", className].filter(Boolean).join(" ")}>
      <div className="h-20 w-20 rounded-full bg-[var(--color-blue-light)] border-[3px] border-[color:rgb(88_186_218/0.6)]">
        {visibleUrl && (
          <img
            src={visibleUrl}
            alt={preview ? `Pré-visualização de ${preview.fileName}` : "Imagem atual"}
            className="w-full h-full inset-0 object-cover rounded-full"
          />
        )}
      </div>

      <Button
        type="button"
        variant="tint"
        rightIcon={icon}
        aria-controls={inputId}
        aria-describedby={statusId}
        onClick={() => inputRef.current?.click()}
      >
        {text}
      </Button>

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={text}
        onChange={(event) => selectFile(event.currentTarget.files?.[0])}
      />
      <span id={statusId} role="status" className="sr-only">
        {preview ? `${preview.fileName} selecionado.` : ""}
      </span>
    </div>
  );
}
