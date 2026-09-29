import { type FormHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
export type FlashKind = "info" | "error";
/** O mapa `@flash` do LiveView, por `kind`. */
export type FlashMap = Partial<Record<FlashKind, ReactNode>>;
/**
 * `core_components.ex` → `flash/1`.
 * O `phx-click` (`lv:clear-flash` + `hide`) vira estado local: clicar no aviso
 * o esconde e chama o `onClick` recebido.
 */
export declare function Flash({ id, flash, title, kind, children, hidden, onClick, className, ...rest }: {
    id?: string;
    flash?: FlashMap;
    title?: string;
    kind: FlashKind;
    children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">): import("react").JSX.Element | null;
/**
 * `core_components.ex` → `flash_group/1`.
 * Os avisos `client-error` e `server-error` nascem `hidden`; no original quem os
 * mostra é a conexão do LiveView (`phx-disconnected`), que não existe aqui.
 */
export declare function FlashGroup({ flash, id }: {
    flash: FlashMap;
    id?: string;
}): import("react").JSX.Element;
/**
 * `core_components.ex` → `simple_form/1`.
 * `for` e `as` (o changeset e o nome dos parâmetros) não têm equivalente: quem
 * nomeia os campos é o `name` de cada input. Com `disabled`, `onSubmit` e
 * `onChange` são descartados, como `filter_form_events/2` faz com os `phx-*`.
 */
export declare function SimpleForm({ disabled, children, actions, onSubmit, onChange, ...rest }: {
    disabled?: boolean;
    children: ReactNode;
    actions?: ReactNode[];
} & Omit<FormHTMLAttributes<HTMLFormElement>, "children">): import("react").JSX.Element;
