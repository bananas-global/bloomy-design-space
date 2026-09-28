import { useState, type FormHTMLAttributes, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Icon } from "./Icon.js";

export type FlashKind = "info" | "error";

/** O mapa `@flash` do LiveView, por `kind`. */
export type FlashMap = Partial<Record<FlashKind, ReactNode>>;

/**
 * `core_components.ex` → `flash/1`.
 * O `phx-click` (`lv:clear-flash` + `hide`) vira estado local: clicar no aviso
 * o esconde e chama o `onClick` recebido.
 */
export function Flash({
  id,
  flash = {},
  title,
  kind,
  children,
  hidden,
  onClick,
  className,
  ...rest
}: {
  id?: string;
  flash?: FlashMap;
  title?: string;
  kind: FlashKind;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">) {
  const [cleared, setCleared] = useState(false);
  const msg = children ?? flash[kind];
  if (msg == null || msg === false) return null;
  const flashId = id ?? `flash-${kind}`;

  return (
    <div
      id={flashId}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        setCleared(true);
        onClick?.(event);
      }}
      role="alert"
      className={[
        "fixed bottom-8 right-4 mr-2 w-80 sm:w-96 z-50 rounded-lg p-3 shadow-main border-2",
        kind === "info" && "bg-blue-light text-blue-dark border-blue-dark/50",
        kind === "error" && "bg-red-light text-red-dark border-red-dark/50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      hidden={cleared || hidden}
      {...rest}
    >
      {title && (
        <p className="flex items-center gap-1.5 text-sm font-semibold leading-6">
          {kind === "info" && <Icon name="fa-circle-info" />}
          {kind === "error" && <Icon name="fa-circle-exclamation" />}
          {title}
        </p>
      )}
      <p className="mt-2 text-sm leading-5">{msg}</p>
      <button type="button" className="group absolute top-1 right-1 p-2" aria-label="close">
        <Icon name="fa-times" className="h-5 w-5 opacity-40 group-hover:opacity-70" />
      </button>
    </div>
  );
}

/**
 * `core_components.ex` → `flash_group/1`.
 * Os avisos `client-error` e `server-error` nascem `hidden`; no original quem os
 * mostra é a conexão do LiveView (`phx-disconnected`), que não existe aqui.
 */
export function FlashGroup({ flash, id = "flash-group" }: { flash: FlashMap; id?: string }) {
  return (
    <div id={id}>
      <Flash kind="info" title="Sucesso!" flash={flash} />
      <Flash kind="error" title="Erro!" flash={flash} />
      <Flash id="client-error" kind="error" title="We can't find the internet" hidden>
        Attempting to reconnect
        <Icon name="fa-arrows-rotate" className="ml-1 h-3 w-3 animate-spin" />
      </Flash>

      <Flash id="server-error" kind="error" title="Something went wrong!" hidden>
        Hang in there while we get back on track
        <Icon name="fa-arrows-rotate" className="ml-1 h-3 w-3 animate-spin" />
      </Flash>
    </div>
  );
}

/**
 * `core_components.ex` → `simple_form/1`.
 * `for` e `as` (o changeset e o nome dos parâmetros) não têm equivalente: quem
 * nomeia os campos é o `name` de cada input. Com `disabled`, `onSubmit` e
 * `onChange` são descartados, como `filter_form_events/2` faz com os `phx-*`.
 */
export function SimpleForm({
  disabled = false,
  children,
  actions = [],
  onSubmit,
  onChange,
  ...rest
}: {
  disabled?: boolean;
  children: ReactNode;
  actions?: ReactNode[];
} & Omit<FormHTMLAttributes<HTMLFormElement>, "children">) {
  return (
    <form {...rest} onSubmit={disabled ? undefined : onSubmit} onChange={disabled ? undefined : onChange}>
      <fieldset disabled={disabled} className="m-0 w-full min-w-0 space-y-8 border-0 p-0">
        {children}
        {actions.map((action, index) => (
          <div key={index} className="mt-2 flex items-center justify-between gap-6">
            {action}
          </div>
        ))}
      </fieldset>
    </form>
  );
}
