import { useId, useState, type ReactNode } from "react";
import { Icon } from "../Icon.js";
import { FieldError, Label } from "./Input.js";

/**
 * Escolha — espelho de `radio_group/1`, `radio_selector/1` e `checkbox_group/1`.
 *
 * Os três resolvem o mesmo problema com formas diferentes, e a diferença
 * importa: o `radio_group` é uma lista de opções soltas; o `radio_selector` é
 * uma barra segmentada, do tipo que troca de aba.
 *
 * **Uma coisa do `radio_selector` que copiei mesmo achando estranha.** A opção
 * marcada recebe `has-[input:checked]:text-brand-blue/30` no rótulo externo —
 * texto azul a 30% de opacidade. O texto interno tem a própria regra
 * (`peer-checked:text-brand-blue-dark`) e ganha, então na prática o 30% não
 * aparece. É classe morta, não defeito visível, e está registrada no achado 106
 * porque some no dia em que alguém mexer no `span`.
 */

export type ChoiceVariant = "default" | "purple";

export type Opcao = {
  value: string;
  label?: string;
  icon?: string;
  title?: string;
  disabled?: boolean;
  /** Bolinha vermelha com número, no canto superior esquerdo. */
  warningNumber?: number;
};

/** `checkgroup/1`: variante múltipla vertical de `input/1`. */
export function Checkgroup({ id, label, name, values, options, errors = [], variant = "default", disabled, onChange, className, innerClassName }: {
  id: string; label?: string; name: string; values?: string[]; options: Opcao[]; errors?: string[]; variant?: ChoiceVariant;
  disabled?: boolean; onChange?: (values: string[]) => void; className?: string; innerClassName?: string;
}) {
  const selected = values ?? [];
  const fieldName = `${name}[]`;
  const resolvedName = `${fieldName}[]`;
  // O wrapper original aceita `variant`, mas a cláusula interna consulta
  // `color`; a variante é inerte. Mantemos o atributo sem inventar efeito.
  void variant;
  const errorId = errors.length ? `${id}-errors` : undefined;
  const toggle = (value: string) => onChange?.(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <fieldset className={["relative min-w-0 border-0 p-0", className].filter(Boolean).join(" ")} aria-describedby={errorId}>
    {label && <legend className="text-sm/4 font-bold text-[var(--color-brand-blue)]">{label}</legend>}
    <div className={["mt-2 flex flex-col items-start gap-2", innerClassName].filter(Boolean).join(" ")}>
      {options.map((option) => <label key={option.value} className="inline-flex items-center gap-3.5 rounded-lg p-4 text-base/4 text-[var(--color-neutral-900)] transition-colors has-[input:checked]:bg-[var(--color-blue-light)]">
        <input type="checkbox" id={`${id}-${fieldName}-${option.value}`} name={resolvedName} value={option.value} checked={selected.includes(option.value)} disabled={disabled || option.disabled} onChange={() => toggle(option.value)} className="rounded border-[var(--color-neutral-100)] text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)] focus:ring-0" />
        {option.label}
      </label>)}
    </div>
    {errors.length > 0 && <div id={errorId}>{errors.map((message) => <FieldError key={message} className="absolute -bottom-6" message={message} />)}</div>}
  </fieldset>;
}

/** `fake_radio_group/1`: somente o valor atual permanece habilitado. */
export function FakeRadioGroup({ id, label, selectedValue, options, variant = "default", className }: {
  id: string; label?: string; selectedValue?: string; options: (Opcao & { name: string })[]; variant?: ChoiceVariant; className?: string;
}) {
  return <fieldset className={["min-w-0 border-0 p-0", className].filter(Boolean).join(" ")}>
    {label && <legend className={["text-sm/4 font-bold", variant === "purple" ? "text-[var(--color-purple)]" : "text-[var(--color-brand-blue)]"].join(" ")}>{label}</legend>}
    <div className="mt-2 w-full space-x-2">
      {options.map((option, index) => <label key={`${option.name}-${option.value}`} className={["inline-flex cursor-pointer items-center gap-3.5 rounded-lg p-4 text-base/4 text-[var(--color-neutral-900)] transition-colors", variant === "purple" ? "has-[input:checked]:bg-[var(--color-purple)]/20" : "has-[input:checked]:bg-[var(--color-blue-light)]"].join(" ")}>
        <input type="radio" name={option.name} id={`${id}-${option.name}-${index}`} value={option.value} checked={option.value === selectedValue} disabled={option.value !== selectedValue} readOnly className={["border-[var(--color-neutral-100)] focus:ring-0", variant === "purple" ? "text-[var(--color-purple)] checked:border-[var(--color-purple)]" : "text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)]"].join(" ")} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}

/** `radio_group/1`: opções soltas, a marcada ganha fundo. */
export function RadioGroup({
  label,
  name,
  value,
  options,
  variant = "default",
  onChange,
  className,
}: {
  label?: string;
  name: string;
  value?: string;
  options: Opcao[];
  variant?: ChoiceVariant;
  onChange?: (valor: string) => void;
  className?: string;
}) {
  const base = useId();

  return (
    <div className={className}>
      {label && <Label color={variant}>{label}</Label>}

      <div className="mt-2 w-full space-x-2">
        {options.map((op, i) => (
          <label
            key={op.value}
            htmlFor={`${base}-${i}`}
            className={[
              "inline-flex cursor-pointer items-center gap-3.5 rounded-lg p-4 text-base/4 transition-colors",
              variant === "purple"
                ? "has-[input:checked]:bg-[var(--color-purple)]/20"
                : "has-[input:checked]:bg-[var(--color-brand-blue)]/20",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              id={`${base}-${i}`}
              value={op.value}
              checked={value === op.value}
              disabled={op.disabled}
              onChange={() => onChange?.(op.value)}
              className={[
                "border-[var(--color-neutral-100)] focus:ring-0",
                variant === "purple"
                  ? "text-[var(--color-purple)] checked:border-[var(--color-purple)]"
                  : "text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)]",
              ].join(" ")}
            />
            <span>{op.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * `radio_selector/1`: barra segmentada.
 *
 * A marcada ganha fundo e uma linha superior por dentro (`shadow-top-inset`),
 * que é o que dá o efeito de aba pressionada.
 */
export function RadioSelector({
  label,
  name,
  value,
  options,
  variant = "default",
  onChange,
  className,
}: {
  label?: string;
  name: string;
  value?: string;
  options: Opcao[];
  variant?: ChoiceVariant;
  onChange?: (valor: string) => void;
  className?: string;
}) {
  const base = useId();

  return (
    <div>
      {label && <Label color={variant}>{label}</Label>}
      <div
        className={[
          "space-x-1.5 rounded-lg bg-[var(--color-brand-purple-dark)]/10 p-1.5",
          label && "mt-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {options.map((op, i) => (
          <label
            key={op.value}
            htmlFor={`${base}-${i}`}
            title={op.title}
            className="relative inline-flex h-10 cursor-pointer items-center rounded-lg px-3 text-base/4 text-[var(--color-neutral-900)] has-[input:checked]:bg-[var(--color-brand-blue)]/40 has-[input:checked]:shadow-[var(--shadow-top-inset)]"
          >
            <input
              type="radio"
              name={name}
              id={`${base}-${i}`}
              value={op.value}
              checked={value === op.value}
              disabled={op.disabled}
              onChange={() => onChange?.(op.value)}
              className="peer hidden"
            />
            {op.label && (
              <span className="text-lg font-bold text-[var(--color-brand-purple-dark)]/40 peer-checked:text-[var(--color-brand-blue-dark)] peer-disabled:opacity-40">
                {op.label}
              </span>
            )}
            {op.icon && (
              <Icon
                name={op.icon}
                className="text-lg text-[var(--color-brand-purple-dark)]/40 peer-checked:text-[var(--color-brand-blue-dark)] peer-disabled:opacity-40"
              />
            )}
            {op.warningNumber !== undefined && op.warningNumber > 0 && (
              <span className="absolute -left-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-red)] text-xs font-bold text-white">
                {op.warningNumber}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/** `checkbox_group/1`: escolha múltipla, com a mesma anatomia do rádio. */
export function CheckboxGroup({
  label,
  name,
  values,
  options,
  onChange,
  className,
}: {
  label: string;
  name: string;
  values: string[];
  options: Opcao[];
  onChange?: (valores: string[]) => void;
  className?: string;
}) {
  const base = useId();

  const alternar = (valor: string) =>
    onChange?.(values.includes(valor) ? values.filter((v) => v !== valor) : [...values, valor]);

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2 w-full space-x-2">
        {options.map((op, i) => (
          <label
            key={op.value}
            htmlFor={`${base}-${i}`}
            className="inline-flex cursor-pointer items-center gap-3.5 rounded-lg p-4 text-base/4 transition-colors has-[input:checked]:bg-[var(--color-brand-blue)]/20"
          >
            <input
              type="checkbox"
              name={name}
              id={`${base}-${i}`}
              value={op.value}
              checked={values.includes(op.value)}
              disabled={op.disabled}
              onChange={() => alternar(op.value)}
              className="rounded border-[var(--color-neutral-100)] text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)] focus:ring-0"
            />
            <span>{op.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * `tooltip/1`: dica ancorada, escura, aparecendo no passar do mouse.
 *
 * No sistema um hook posiciona e mostra. Aqui o gatilho é o próprio elemento e
 * a dica responde a mouse **e a foco** — quem navega por teclado também precisa
 * dela, e é o que o menu recolhido usa para dizer o nome do item.
 */
export function Tooltip({
  id,
  content,
  children,
  className,
}: {
  id: string;
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div
      id={id}
      className={["relative inline-block", className].filter(Boolean).join(" ")}
      onMouseEnter={() => setVisivel(true)}
      onMouseLeave={() => setVisivel(false)}
      onFocus={() => setVisivel(true)}
      onBlur={() => setVisivel(false)}
    >
      {children}
      {visivel && (
        <div
          role="tooltip"
          className="absolute z-[80] w-max rounded bg-[var(--color-neutral-900)] px-2 py-1 text-sm text-white"
        >
          {content}
        </div>
      )}
    </div>
  );
}
