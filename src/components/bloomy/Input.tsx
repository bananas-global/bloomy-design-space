import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
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
  name,
  value,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: {
  id?: string;
  label?: string;
  checked: boolean;
  onChange?: (marcado: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <div className="relative">
      {label && <Label>{label}</Label>}

      <label className="inline-block">
        <div className="flex h-12 items-center">
          {name && <input type="hidden" name={name} value="false" />}
          <input
            id={id}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled}
            name={name}
            value={value}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
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

export type SelectOption = { label: string; value: string };

/**
 * A cláusula `input/1` com `type="select"` usa o `CustomSelectComponent` do
 * sistema: gatilho próprio, opções flutuantes e seleção visível com check.
 * Não é um `<select>` nativo estilizado.
 */
export function Select({
  id: providedId,
  name,
  label,
  ariaLabel,
  prompt = "Selecione uma opção",
  value = "",
  options,
  disabled = false,
  clear = true,
  errors = [],
  className,
  inputClassName,
  onChange,
}: {
  id?: string;
  name?: string;
  label?: string;
  ariaLabel?: string;
  prompt?: string;
  value?: string;
  options: SelectOption[];
  disabled?: boolean;
  clear?: boolean;
  errors?: string[];
  className?: string;
  inputClassName?: string;
  onChange?: (value: string) => void;
}) {
  const generatedId = useId();
  const id = providedId ?? `select-${generatedId.replace(/:/g, "")}`;
  const triggerId = `${id}-trigger`;
  const listboxId = `${id}-options`;
  const errorId = errors.length > 0 ? `${id}-errors` : undefined;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 256 });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function positionMenu() {
    const button = trigger.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = Math.min(menu.current?.offsetHeight ?? 256, 256);
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const opensAbove = below < Math.min(menuHeight, 192) && above > below;
    const top = opensAbove ? Math.max(16, rect.top - menuHeight - 4) : rect.bottom + 4;
    const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - rect.width - 16));

    setPosition({
      left,
      top,
      width: rect.width,
      maxHeight: Math.max(96, opensAbove ? above - 4 : below),
    });
  }

  useLayoutEffect(() => {
    if (open) positionMenu();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    const reposition = () => positionMenu();

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : -1);
    setOpen(true);
  }

  function choose(option: SelectOption) {
    onChange?.(option.value);
    setOpen(false);
    setHighlighted(-1);
    trigger.current?.focus();
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : Math.min(
                Math.max(highlighted + (event.key === "ArrowDown" ? 1 : -1), 0),
                options.length - 1,
              );
      setHighlighted(next);
      menu.current?.querySelector<HTMLElement>(`[data-option-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      const option = options[highlighted];
      if (option) choose(option);
    }
  }

  return (
    <div ref={root} id={id} className={["relative", disabled && "cursor-not-allowed opacity-60", className].filter(Boolean).join(" ")}>
      {label && <Label htmlFor={triggerId}>{label}</Label>}

      <div className={["relative w-full", label && "mt-2"].filter(Boolean).join(" ")}>
        <button
          ref={trigger}
          id={triggerId}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && highlighted >= 0 ? `${id}-option-${highlighted}` : undefined}
          aria-describedby={errorId}
          aria-invalid={errors.length > 0 || undefined}
          data-open={open}
          data-container
          data-value={value}
          disabled={disabled}
          onClick={() => open ? setOpen(false) : openMenu()}
          onKeyDown={keyboard}
          className={[
            "group flex h-12 w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border px-4 text-left",
            "border-[var(--color-brand-purple-dark)]/10 bg-[var(--color-brand-purple-dark)]/10",
            "data-[open=true]:border-[var(--color-brand-blue)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
            "disabled:cursor-not-allowed",
            clear && selected && "pr-20",
            inputClassName,
          ].filter(Boolean).join(" ")}
        >
          <span className={["truncate font-normal", selected ? "text-[var(--color-brand-purple-dark)]/80" : "text-[var(--color-brand-purple-dark)]/60"].join(" ")}>
            {selected?.label ?? prompt}
          </span>
        </button>

        <Icon
          name="fa-chevron-down"
          className={[
            "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2",
            open ? "text-[var(--color-brand-blue)]" : "text-[var(--color-brand-purple-dark)]/40",
          ].join(" ")}
        />

        {clear && selected && !disabled && (
          <button
            type="button"
            title="Limpar seleção"
            aria-label={`Limpar ${label ?? "seleção"}`}
            onClick={() => {
              onChange?.("");
              setOpen(false);
              trigger.current?.focus();
            }}
            className="absolute right-10 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-brand-red)] transition-colors hover:bg-[var(--color-brand-purple-dark)]/10 focus-visible:outline-2 focus-visible:outline-[var(--color-action)]"
          >
            <Icon name="fa-times" />
          </button>
        )}

        <input type="hidden" name={name} value={value} />
      </div>

      {open && (
        <div
          ref={menu}
          data-options-container
          className="fixed z-[9999] overflow-hidden rounded-lg border border-[var(--color-neutral-100)] bg-white shadow"
          style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
        >
          <ul id={listboxId} role="listbox" aria-label={label ?? ariaLabel} className="thin-scrollbar m-0 max-h-64 list-none overflow-y-auto p-4">
            {options.length === 0 && <li className="bg-white px-4 py-2 text-center text-[var(--color-blue-dark)]/80">Nenhuma opção encontrada</li>}
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlighted;
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  data-options
                  data-highlighted={isHighlighted || undefined}
                  onPointerMove={() => setHighlighted(index)}
                  onClick={() => choose(option)}
                  className={[
                    "flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 font-bold text-[var(--color-brand-purple-dark)]/60 transition-colors",
                    isSelected || isHighlighted ? "bg-[var(--color-brand-purple-dark)]/10" : "bg-white hover:bg-[var(--color-brand-purple-dark)]/5",
                  ].join(" ")}
                >
                  <span>{option.label}</span>
                  {isSelected && <Icon name="fa-check" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div id={errorId}>
          {errors.map((message) => <FieldError key={message} className="absolute -bottom-6 font-normal leading-none" message={message} />)}
        </div>
      )}
    </div>
  );
}

/** `input_with_select/1`: dois campos unidos sob o mesmo rótulo visual. */
export function InputWithSelect({ label, textId, textName, textValue, textErrors = [], selectId, selectName, selectValue, selectErrors = [], options, disabled = false, onTextChange, onSelectChange, className }: {
  label?: string; textId: string; textName: string; textValue: string; selectId: string; selectName: string; selectValue: string;
  textErrors?: string[]; selectErrors?: string[]; options: SelectOption[]; disabled?: boolean; onTextChange?: (value: string) => void; onSelectChange?: (value: string) => void; className?: string;
}) {
  const textErrorId = textErrors.length ? `${textId}-errors` : undefined;
  return <div className={["relative", disabled && "opacity-50", className].filter(Boolean).join(" ")}>
    {label && <Label><span>{label}</span></Label>}
    <div className={["relative flex w-full", label && "mt-2"].filter(Boolean).join(" ")}>
      <div className="relative min-w-0 flex-1">
        <input id={textId} name={textName} value={textValue} disabled={disabled} aria-label={label ? `${label}: valor` : undefined} aria-describedby={textErrorId} aria-invalid={textErrors.length ? true : undefined} onChange={(event) => onTextChange?.(event.target.value)} className={["h-12 w-full rounded-l-lg border bg-[var(--color-brand-purple-dark)]/10 px-4 text-[var(--color-brand-purple-dark)]/80 outline-hidden transition-colors focus:border-[var(--color-brand-blue)] focus:ring-0", textErrors.length ? "border-[var(--color-brand-red)]" : "border-[var(--color-brand-purple-dark)]/10"].join(" ")} />
        {textErrors.length > 0 && <div id={textErrorId}>{textErrors.map((message) => <FieldError key={message} className="absolute -bottom-6" message={message} />)}</div>}
      </div>
      <div className="relative min-w-0 flex-1">
        <Select id={selectId} name={selectName} value={selectValue} disabled={disabled} ariaLabel={label ? `${label}: critério` : undefined} errors={selectErrors} options={options} clear={false} inputClassName="rounded-l-none" onChange={onSelectChange} />
      </div>
    </div>
  </div>;
}

/** `fake_input/1`: valor estático com a mesma caixa visual de um campo. */
export function FakeInput({ value, label, labelColor = "default", className, ...rest }: { value: ReactNode; label?: string; labelColor?: "default" | "blue"; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...rest}>
    {label && <p className={["m-0 block text-sm/4 font-bold", labelColor === "blue" ? "text-[var(--color-brand-blue)]" : "text-[var(--color-neutral-400)]"].join(" ")}>{label}</p>}
    <div className={["flex min-h-12 w-full items-center rounded-lg border border-[var(--color-neutral-100)] bg-[var(--color-neutral-500)]/5 px-4 font-normal leading-6 text-[var(--color-neutral-500)]", label && "mt-2"].filter(Boolean).join(" ")}>{value}</div>
  </div>;
}

/** `input_switch_card/1`: estado do campo colore o cartão que contém a chave. */
export function InputSwitchCard({ label, active, children, className }: { label: string; active: boolean | string; children: ReactElement<{ "aria-labelledby"?: string }>; className?: string }) {
  const isActive = active === true || active === "on" || active === "true";
  const generatedId = useId();
  const labelId = `input-switch-card-${generatedId.replace(/:/g, "")}-label`;
  const labelledBy = [children.props["aria-labelledby"], labelId].filter(Boolean).join(" ");
  return <div className={["flex items-center justify-center gap-x-2 rounded-lg border px-2 transition-colors", isActive ? "border-[var(--color-brand-blue)]/40 bg-[var(--color-blue-light)]" : "border-[var(--color-brand-purple-dark)]/10 bg-[var(--color-brand-purple-dark)]/10", className].filter(Boolean).join(" ")}>
    <p id={labelId} className="m-0 font-bold text-[var(--color-brand-purple-dark)]">{label}</p>{cloneElement(children, { "aria-labelledby": labelledBy })}
  </div>;
}
