import type { UploadConfig } from "./FileUploader.js";
/**
 * `core_components.ex` → `image_upload/1`. O `live_img_preview` da última
 * entrada vira um `<img>` com `URL.createObjectURL` do arquivo escolhido.
 */
export declare function ImageUpload({ upload, previousUrl, className, text, icon, onChange, }: {
    upload: UploadConfig;
    previousUrl?: string;
    className?: string;
    text?: string;
    icon?: string;
    /** O arquivo escolhido: o `phx-change` do formulário. */
    onChange?: (file: File) => void;
}): import("react").JSX.Element;
