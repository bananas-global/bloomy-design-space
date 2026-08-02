import type { ReactNode } from "react";
import { Icon } from "../Icon.js";

/**
 * Campo, rótulo e erro — espelho de `input/1`, `label/1` e `error/1`.
 *
 * O `input/1` do sistema é **treze cláusulas** casadas por tipo — `checkbox`,
 * `checkgroup`, `slider`, `select`, `textarea`, `switch`, `value_switch`,
 * `rich_text`, `tags`, `custom_select`, `select_search`,
 * `multi_select_search`, `counter` — mais a cláusula final que atende todos os
 * tipos nativos do HTML. Aqui elas viram componentes irmãos com o mesmo nome de
 * lá, porque um componente React com treze modos seria mais difícil de conferir
 * contra o original do que treze componentes.
 *
 * Três coisas do original que sobreviveram à cópia por serem decisões, não
 * acidentes:
 *
 * 1. **O erro é posicionado por fora do fluxo** (`absolute -bottom-6`). O campo
 *    não muda de altura ao errar, então a página não pula — mas o espaço tem de
 *    estar reservado por quem usa.
 * 2. **O rótulo é azul, não cinza** (`text-brand-blue`), e em negrito. É a cor
 *    de marca fazendo trabalho de hierarquia.
 * 3. **O campo tem fundo, não borda visível** (`bg-brand-purple-dark/10` com
 *    borda da mesma cor). A borda só aparece no foco, em `brand-blue`, e no erro,
 *    em `brand-red`.
 *
 * O `hint` é um apêndice colado à direita do campo, com o canto esquerdo reto —
 * é como o sistema mostra unidade ("horas", "R$") sem um segundo campo.
 */

export function Label({
  htmlFor,
  color = "default",
  className,
  children,
}: {
  htmlFor?: string;
  color?: "default" | "purple";
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={[
        "block text-sm/4 font-bold",
        className,
        color === "default" ? "text-[var(--color-brand-blue)]" : "text-[var(--color-purple)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </label>
  );
}

export function FieldError({ message, className }: { message: string; className?: string }) {
  return (
    <p
      className={[
        "mt-1 flex items-baseline gap-1 text-sm leading-6 text-[var(--color-brand-red)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon name="fa-circle-exclamation" className="mt-0.5 h-5 w-5 flex-none" />
      <span className="line-clamp-2" title={message}>
        {message}
      </span>
    </p>
  );
}

function classeIcone(temErro: boolean): string {
  return [
    "h-6 w-6 flex items-center justify-center absolute top-1/2 -translate-y-1/2",
    temErro
      ? "text-[var(--color-brand-red)]"
      : "text-[var(--color-brand-purple-dark)]/60 peer-focus:text-[var(--color-brand-blue)]",
  ].join(" ");
}

/** A cláusula final do `input/1`: todos os tipos nativos do HTML. */
export function Input({
  id,
  label,
  type = "text",
  errors = [],
  leftIcon,
  rightIcon,
  hint,
  className,
  ...rest
}: {
  id?: string;
  label?: string;
  type?: string;
  errors?: string[];
  leftIcon?: string;
  rightIcon?: string;
  /** Apêndice colado à direita: unidade, moeda, sufixo. */
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id">) {
  const temErro = errors.length > 0;

  return (
    <div className={["relative", rest.disabled && "opacity-50", className].filter(Boolean).join(" ")}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className={["relative flex w-full", label && "mt-2"].filter(Boolean).join(" ")}>
        <input
          type={type}
          id={id}
          className={[
            "bg-[var(--color-brand-purple-dark)]/10",
            "border focus:ring-0",
            "block w-full h-12 font-normal text-[var(--color-brand-purple-dark)]/80 placeholder:text-[var(--color-brand-purple-dark)]/60",
            "outline-hidden transition-colors duration-200",
            "peer",
            hint ? "rounded-l-lg" : "rounded-lg",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            type !== "color" && "px-4",
            temErro
              ? "border-[var(--color-brand-red)]"
              : "border-[var(--color-brand-purple-dark)]/10 focus:border-[var(--color-brand-blue)]",
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />

        {leftIcon && (
          <div className={`${classeIcone(temErro)} left-3`}>
            <Icon name={leftIcon} />
          </div>
        )}
        {rightIcon && (
          <div className={`${classeIcone(temErro)} right-3`}>
            <Icon name={rightIcon} />
          </div>
        )}

        {hint && (
          <p className="m-0 flex h-12 items-center justify-center text-nowrap rounded-r-lg border border-l-0 border-transparent bg-[var(--color-brand-purple-dark)]/10 px-4 text-[var(--color-brand-purple-dark)]/80 transition-colors duration-200 peer-focus-within:border-[var(--color-brand-blue)]">
            {hint}
          </p>
        )}
      </div>

      {errors.map((msg) => (
        <FieldError key={msg} className="absolute -bottom-6" message={msg} />
      ))}
    </div>
  );
}

/** `input/1` com `type="textarea"`: fundo mais claro e borda transparente. */
export function Textarea({
  id,
  label,
  errors = [],
  className,
  ...rest
}: {
  id?: string;
  label?: string;
  errors?: string[];
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  const temErro = errors.length > 0;

  return (
    <div className={["relative", rest.disabled && "opacity-50", className].filter(Boolean).join(" ")}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        id={id}
        className={[
          "bg-[var(--color-brand-purple-dark)]/5",
          "border focus:ring-0",
          "block w-full min-h-24 font-normal text-[var(--color-brand-purple-dark)]/80 placeholder:text-[var(--color-brand-purple-dark)]/60",
          "outline-hidden transition-colors duration-200",
          "rounded-lg p-4",
          label && "mt-2",
          temErro
            ? "border-[var(--color-brand-red)]"
            : "border-transparent focus:border-[var(--color-brand-blue)]",
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {errors.map((msg) => (
        <FieldError key={msg} className="absolute -bottom-6" message={msg} />
      ))}
    </div>
  );
}

/**
 * `input/1` com `type="checkbox"`.
 *
 * O rótulo inteiro é a área clicável, e ganha fundo azul quando marcado —
 * `has-[input:checked]:bg-brand-blue/20`. É seleção que se vê de longe.
 */
export function Checkbox({
  id,
  label,
  errors = [],
  className,
  ...rest
}: {
  id?: string;
  label: string;
  errors?: string[];
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id">) {
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <label className="inline-flex items-center gap-3.5 rounded-lg p-4 text-base/4 text-[var(--color-brand-purple-dark)] transition-colors has-[input:checked]:bg-[var(--color-brand-blue)]/20">
        <input
          type="checkbox"
          id={id}
          className="rounded border-2 border-[var(--color-brand-purple-dark)]/10 text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)] focus:ring-0"
          {...rest}
        />
        {label}
      </label>
      {errors.map((msg) => (
        <FieldError key={msg} className="absolute -bottom-6" message={msg} />
      ))}
    </div>
  );
}

/**
 * `input/1` com `type="switch"`.
 *
 * A caixa de seleção real fica em `sr-only peer` e o desenho é uma `<div>` que
 * reage a ela. Quem usa teclado e leitor de tela continua operando uma caixa de
 * seleção de verdade — a chave é só aparência.
 */
export function Switch({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id?: string;
  label?: string;
  checked: boolean;
  onChange?: (marcado: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      {label && <Label>{label}</Label>}

      <label className="inline-block">
        <div className="flex h-12 items-center">
          <input
            id={id}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked)}
          />
          <div
            className={[
              "relative h-6 w-12 cursor-pointer rounded-full border transition-all",
              "after:absolute after:top-[2px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-xl after:transition-all after:content-['']",
              checked
                ? "border-[var(--color-blue-dark)]/60 bg-[var(--color-blue)] after:end-[20px] after:translate-x-full"
                : "border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)] after:start-[2px]",
            ].join(" ")}
          />
        </div>
      </label>
    </div>
  );
}

/** `switch_card/1`: título, descrição e chave formam uma única área clicável. */
export function SwitchCard({
  id,
  name,
  inputValue,
  multiple = false,
  title,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  id: string;
  name: string;
  inputValue?: string;
  multiple?: boolean;
  title: string;
  description: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={["inline-block w-full", disabled && "opacity-50", className].filter(Boolean).join(" ")}
      onClick={(event) => {
        if (disabled || event.target instanceof HTMLInputElement) return;
        onChange?.(!checked);
        document.getElementById(id)?.focus();
      }}
    >
      <div
        className={[
          "flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors delay-100",
          disabled && "cursor-not-allowed",
          checked
            ? "border-[var(--color-brand-blue)]/40 bg-[var(--color-brand-blue)]/10"
            : "border-transparent bg-[var(--color-brand-purple-dark)]/5",
        ].filter(Boolean).join(" ")}
      >
        <div>
          <h3 id={`${id}-title`} className="m-0 font-extrabold text-[var(--color-brand-purple-dark)]">{title}</h3>
          <p id={`${id}-description`} className="m-0 text-sm text-[var(--color-brand-purple-dark)]/60">{description}</p>
        </div>
        <div className="relative">
          <div className="flex h-12 items-center">
            <input
              id={id}
              name={multiple ? `${name}[]` : name}
              value={inputValue ?? "true"}
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              disabled={disabled}
              aria-labelledby={`${id}-title`}
              aria-describedby={`${id}-description`}
              onChange={(event) => onChange?.(event.target.checked)}
            />
            <div
              aria-hidden="true"
              className={[
                "relative h-6 w-12 cursor-pointer rounded-full border transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-brand-blue)]",
                "after:absolute after:top-[2px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-xl after:transition-all after:content-['']",
                checked
                  ? "border-[var(--color-blue-dark)]/60 bg-[var(--color-blue)] after:end-[20px] after:translate-x-full"
                  : "border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)] after:start-[2px]",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
