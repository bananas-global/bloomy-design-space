import { type FormEventHandler, type ReactNode } from "react";
import { Icon } from "./Icon.js";

export type FlashKind = "info" | "error";

/** Aviso temporário — espelho acessível de `flash/1`. */
export function Flash({
  id,
  kind,
  title,
  children,
  onDismiss,
  hidden = false,
}: {
  id?: string;
  kind: FlashKind;
  title?: string;
  children: ReactNode;
  onDismiss: () => void;
  hidden?: boolean;
}) {
  return (
    <div
      id={id ?? `flash-${kind}`}
      role="alert"
      hidden={hidden}
      className={[
        "fixed bottom-8 right-4 z-50 mr-2 w-80 rounded-lg border-2 p-3 shadow-[var(--shadow-main)] sm:w-96",
        kind === "info"
          ? "border-[var(--color-blue-dark)]/50 bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]"
          : "border-[var(--color-red-dark)]/50 bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
      ].join(" ")}
    >
      {title && (
        <p className="m-0 flex items-center gap-1.5 text-sm font-semibold leading-6">
          <Icon name={kind === "info" ? "fa-circle-info" : "fa-circle-exclamation"} />
          {title}
        </p>
      )}
      <div className="mt-2 text-sm leading-5">{children}</div>
      <button
        type="button"
        className="group absolute right-1 top-1 rounded p-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-blue)]"
        aria-label="Fechar"
        onClick={onDismiss}
      >
        <Icon name="fa-times" className="h-5 w-5 opacity-40 group-hover:opacity-70" />
      </button>
    </div>
  );
}

/** Os quatro avisos globais de `flash_group/1`, inclusive a conexão. */
export function FlashGroup({
  id = "flash-group",
  info,
  error,
  connection = "connected",
  onDismiss,
}: {
  id?: string;
  info?: ReactNode;
  error?: ReactNode;
  connection?: "connected" | "client-error" | "server-error";
  onDismiss: (kind: FlashKind | "connection") => void;
}) {
  return (
    <div id={id}>
      {info && <Flash kind="info" title="Sucesso!" onDismiss={() => onDismiss("info")}>{info}</Flash>}
      {error && <Flash kind="error" title="Erro!" onDismiss={() => onDismiss("error")}>{error}</Flash>}
      <Flash id="client-error" kind="error" title="We can't find the internet" hidden={connection !== "client-error"} onDismiss={() => onDismiss("connection")}>
        Attempting to reconnect <Icon name="fa-arrows-rotate" className="ml-1 h-3 w-3 animate-spin" />
      </Flash>
      <Flash id="server-error" kind="error" title="Something went wrong!" hidden={connection !== "server-error"} onDismiss={() => onDismiss("connection")}>
        Hang in there while we get back on track <Icon name="fa-arrows-rotate" className="ml-1 h-3 w-3 animate-spin" />
      </Flash>
    </div>
  );
}

/** Formulário, `fieldset` e faixa de ações de `simple_form/1`. */
export function SimpleForm({
  disabled = false,
  actions,
  children,
  className,
  onSubmit,
  onChange,
  ...rest
}: {
  disabled?: boolean;
  actions?: ReactNode;
  children: ReactNode;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, "children">) {
  const blockedSubmit: FormEventHandler<HTMLFormElement> = (event) => event.preventDefault();

  return (
    <form
      className={className}
      onSubmit={disabled ? blockedSubmit : onSubmit}
      onChange={disabled ? undefined : onChange}
      {...rest}
    >
      <fieldset disabled={disabled} className="m-0 w-full min-w-0 space-y-8 border-0 p-0">
        {children}
        {actions && <div className="mt-2 flex items-center justify-between gap-6">{actions}</div>}
      </fieldset>
    </form>
  );
}
