import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./Icon.js";
import { Tag, type TagVariant } from "./Tag.js";
import { MultiSelectSearch } from "./MultiSelectSearch.js";
import { MultiTagSelect } from "./MultiTagSelect.js";
import { RichText, type AiGenerate, type TextPattern } from "./RichText.js";
import { SelectSearch } from "./SelectSearch.js";

/**
 * `core_components.ex` → `input/1`, `label/1`, `error/1`, `input_with_select/1`,
 * `checkgroup/1`, `fake_input/1`, `input_switch_card/1`, `switch_card/1`, e
 * `custom_select_component.ex` → `CustomSelectComponent`.
 *
 * `<Input type="…">` despacha para a mesma cláusula do `input/1`. Os atributos
 * têm o nome do Phoenix em camelCase (`input_class` → `inputClass`); `class` e
 * `for` viram `className` e `htmlFor`.
 *
 * Diferença inevitável: no Phoenix o valor volta pelo `phx-change` do form e o
 * servidor re-renderiza. Aqui cada campo guarda o próprio estado a partir de
 * `value` e avisa por `onChange` — evento nativo nos tipos nativos, o valor nos
 * live components (`select`, `select_search`, `multi_select_search`,
 * `checkgroup`, `tags`, `rich_text`, `slider`). `error/1` se chama `FieldError`
 * porque `Error` sombrearia o construtor global.
 */

export type ClassValue = string | false | null | undefined | 0 | ClassValue[];

/** Lista de classes como a do HEEx: aninhada, com `false`/`nil` descartados. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (Array.isArray(value)) value.forEach(walk);
    else out.push(value);
  };
  values.forEach(walk);
  return out.join(" ");
}

/** O que um `Phoenix.HTML.FormField` entrega ao componente. */
export type FormField = { id: string; name: string; value?: unknown; errors?: string[] };

export type SelectOption = { label: string; value: unknown; color?: string; [key: string]: unknown };
export type SelectGroup = { group: string; items: SelectItem[]; color?: string };
export type SelectItem = SelectOption | SelectGroup;
export type OptionTuple = readonly [string, unknown];

export function isGroup(item: SelectItem): item is SelectGroup {
  return "items" in item && Array.isArray((item as SelectGroup).items);
}

/** `parse_value/1` dos live components de seleção. */
export function parseValue(value: unknown): string {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Estado local que acompanha a prop: a prop manda quando muda (o servidor
 * re-renderizou), o estado manda entre uma mudança e outra (o DOM do navegador).
 */
export function useMirror<T>(value: T): [T, (next: T) => void] {
  const key = JSON.stringify(value ?? null);
  const [state, setState] = useState({ key, value });
  const set = (next: T) => setState({ key, value: next });
  if (state.key !== key) {
    setState({ key, value });
    return [value, set];
  }
  return [state.value, set];
}

/**
 * Posição do painel `fixed` das seleções, como o `computePosition` dos hooks:
 * `bottom-start`, `offset(4)`, `flip` para cima, `shift({padding: 16})` e
 * `size` limitando largura e altura. Medir com `left/top = 0` dá a origem do
 * bloco de contenção, então funciona também dentro de um ancestral com
 * `transform` (o `drawer_modal`).
 */
export function placeFloating(reference: HTMLElement, floating: HTMLElement, container: HTMLElement) {
  const style = floating.style;
  Object.assign(style, { display: "block", visibility: "hidden", left: "0px", top: "0px", maxHeight: "" });
  const origin = floating.getBoundingClientRect();
  const rect = reference.getBoundingClientRect();
  const width = container.clientWidth;
  style.maxWidth = `${width}px`;

  const height = floating.offsetHeight;
  const below = window.innerHeight - rect.bottom - 4;
  const above = rect.top - 4;
  const flip = height > below && above > below;
  const y = flip ? rect.top - 4 - Math.min(height, above) : rect.bottom + 4;
  const w = Math.min(width, floating.offsetWidth);
  const x = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - w - 16));

  Object.assign(style, {
    maxHeight: `${flip ? above : below}px`,
    left: `${x - origin.left}px`,
    top: `${y - origin.top}px`,
    visibility: "visible",
  });
}

/** Abre, fecha, reposiciona e fecha no clique de fora — o miolo dos hooks de seleção. */
export function useFloatingPanel(
  open: boolean,
  setOpen: (open: boolean) => void,
  refs: {
    reference: React.RefObject<HTMLElement | null>;
    container: React.RefObject<HTMLElement | null>;
    panel: React.RefObject<HTMLElement | null>;
  },
  inside: (target: Node) => boolean,
) {
  const place = () => {
    const { reference, container, panel } = refs;
    if (reference.current && container.current && panel.current) {
      placeFloating(reference.current, panel.current, container.current);
    }
  };

  useLayoutEffect(() => {
    if (open) place();
  });

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!inside(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", outside);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("click", outside);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
}

/** Navegação por teclado dos hooks: setas, Tab, Enter escolhe, Esc fecha. */
export function useOptionKeys(
  open: boolean,
  count: number,
  highlight: number,
  setHighlight: (index: number) => void,
  choose: (index: number) => void,
  close: () => void,
  target?: React.RefObject<HTMLElement | null>,
) {
  const state = useRef({ count, highlight, setHighlight, choose, close });
  state.current = { count, highlight, setHighlight, choose, close };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const s = state.current;
      if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(event.key)) event.preventDefault();
      const down = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey);
      const up = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey);
      if (down) s.setHighlight(Math.min(s.highlight + 1, s.count - 1));
      else if (up) s.setHighlight(Math.max(s.highlight - 1, 0));
      else if (event.key === "Enter" && s.highlight >= 0) s.choose(s.highlight);
      else if (event.key === "Escape") s.close();
    };
    const el: HTMLElement | Document = target?.current ?? document;
    el.addEventListener("keydown", onKey as EventListener);
    return () => el.removeEventListener("keydown", onKey as EventListener);
  }, [open]);
}

/** `core_components.ex` → `label/1`. */
export function Label({
  htmlFor,
  className,
  color = "default",
  children,
}: {
  htmlFor?: string;
  className?: string;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx(
        "block text-sm/4 font-bold",
        className,
        color === "default" && "text-brand-blue",
        color === "purple" && "text-purple",
      )}
    >
      {children}
    </label>
  );
}

/** `core_components.ex` → `error/1`. */
export function FieldError({
  className,
  message,
  children,
}: {
  className?: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <p className={cx("mt-1 flex items-baseline gap-1 text-sm leading-6 text-brand-red", className)}>
      <Icon name="fa-circle-exclamation" className="mt-0.5 h-5 w-5 flex-none" />
      <span className="line-clamp-2" title={message}>
        {children ?? message}
      </span>
    </p>
  );
}

function errorList(errors: string[], className: string) {
  return errors.map((msg) => (
    <FieldError key={msg} className={className} message={msg}>
      {msg}
    </FieldError>
  ));
}

type InputType =
  | "checkbox" | "color" | "date" | "datetime-local" | "email" | "file" | "month" | "number"
  | "password" | "tags" | "range" | "slider" | "search" | "select" | "tel" | "text" | "textarea"
  | "time" | "url" | "week" | "switch" | "rich_text" | "hidden" | "select_search"
  | "multi_select_search" | "custom_select" | "value_switch" | "counter" | "checkgroup";

type InputAttrs = {
  id?: string;
  name?: string;
  label?: string;
  value?: unknown;
  inputValue?: unknown;
  className?: string;
  inputClass?: string;
  innerClass?: string;
  callback?: (search: string) => SelectItem[];
  removable?: (value: unknown) => (() => void) | null | undefined | false;
  searchAction?: () => void;
  hint?: string;
  color?: "default" | "default_darker" | "purple";
  variant?: "default" | "rounded_left" | "rounded_right";
  leftIcon?: string;
  rightIcon?: string;
  clear?: boolean;
  field?: FormField;
  errors?: string[];
  checked?: boolean;
  prompt?: string;
  options?: readonly (SelectItem | OptionTuple)[];
  createOptions?: readonly SelectItem[];
  classOptions?: string;
  multiple?: boolean;
  errorTag?: Record<string, string>;
  aiGenerate?: AiGenerate;
  patternModule?: string;
  /** Os padrões de texto que `Bloomy.TextPatterns` devolveria para `patternModule`. */
  patterns?: TextPattern[];
  showHeadings?: boolean;
  tagLabel?: string;
  rows?: number;
  cols?: number;
  children?: ReactNode;
};

type HtmlRest = Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputAttrs | "type" | "onChange" | "defaultValue">;

type NativeType = Exclude<
  InputType,
  "textarea" | "select" | "custom_select" | "select_search" | "slider" | "multi_select_search" | "checkgroup" | "tags" | "rich_text"
>;

export type InputProps = InputAttrs &
  HtmlRest &
  (
    | { type?: NativeType; onChange?: (event: ChangeEvent<HTMLInputElement>) => void }
    | { type: "textarea"; onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void }
    | { type: "select" | "custom_select" | "select_search" | "slider"; onChange?: (value: string | null) => void }
    | { type: "multi_select_search" | "checkgroup" | "tags"; onChange?: (values: string[]) => void }
    | { type: "rich_text"; onChange?: (html: string) => void }
  );

type Assigns = Omit<InputAttrs, "field"> & {
  type: InputType;
  field?: undefined;
  errors: string[];
  errorTag: Record<string, string>;
  color: NonNullable<InputAttrs["color"]>;
  variant: NonNullable<InputAttrs["variant"]>;
  clear: boolean;
  multiple: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (...args: any[]) => void;
  rest: Record<string, unknown>;
};

const ATTR_KEYS = [
  "id", "name", "label", "value", "inputValue", "className", "inputClass", "innerClass", "callback",
  "removable", "searchAction", "hint", "color", "variant", "leftIcon", "rightIcon", "clear", "field",
  "errors", "checked", "prompt", "options", "createOptions", "classOptions", "multiple", "errorTag",
  "aiGenerate", "patternModule", "patterns", "showHeadings", "tagLabel", "children", "type", "onChange",
] as const;

/** A primeira cláusula do `input/1`: desmonta o `field` em id, nome, valor e erros. */
function assign(props: InputProps): Assigns {
  const source = props as Record<string, unknown>;
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (!(ATTR_KEYS as readonly string[]).includes(key)) rest[key] = source[key];
  }
  const multiple = props.multiple ?? false;
  const base: Assigns = {
    ...(props as InputAttrs),
    type: props.type ?? "text",
    field: undefined,
    errors: props.errors ?? [],
    errorTag: props.errorTag ?? {},
    color: props.color ?? "default",
    variant: props.variant ?? "default",
    clear: props.clear ?? true,
    multiple,
    onChange: props.onChange,
    rest,
  };
  const field = props.field;
  if (!field) return base;
  const errors = field.errors ?? [];
  return {
    ...base,
    id: props.id ?? field.id,
    errors,
    name: props.name ?? (multiple ? `${field.name}[]` : field.name),
    value: props.value !== undefined ? props.value : field.value,
    errorTag: errors.length === 0 ? {} : { "with-error": "true" },
  };
}

function normalizeValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function asList(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  return (Array.isArray(value) ? value : [value]).map(String);
}

function toPairs(options: InputAttrs["options"]): { label: string; value: unknown }[] {
  return (options ?? []).map((option) =>
    Array.isArray(option) ? { label: option[0], value: option[1] } : (option as SelectOption),
  );
}

/** A cláusula `select` só converte tuplas `{label, value}`; mapas e grupos passam direto. */
function selectOptions(options: InputAttrs["options"]): SelectItem[] {
  const list = options ?? [];
  if (list.length > 0 && Array.isArray(list[0])) {
    return list.map((option) => {
      const [label, value] = option as OptionTuple;
      return { label, value };
    });
  }
  return list as SelectItem[];
}

export function Input(props: InputProps) {
  const a = assign(props);
  switch (a.type) {
    case "checkbox": return <CheckboxInput {...a} />;
    case "checkgroup": return <CheckgroupInput {...a} />;
    case "slider": return <SliderInput {...a} />;
    case "select": return <SelectInput {...a} />;
    case "textarea": return <TextareaInput {...a} />;
    case "switch": return <SwitchInput {...a} />;
    case "value_switch": return <ValueSwitchInput {...a} />;
    case "rich_text": return <RichTextInput {...a} />;
    case "tags": return <TagsInput {...a} />;
    case "custom_select": return <CustomSelectInput {...a} />;
    case "select_search": return <SelectSearchInput {...a} />;
    case "multi_select_search": return <MultiSelectSearchInput {...a} />;
    case "counter": return <CounterInput {...a} />;
    default: return <DefaultInput {...a} />;
  }
}

function CheckboxInput(a: Assigns) {
  const initial = a.checked ?? (a.value === true || a.value === "true");
  const [checked, setChecked] = useMirror(initial);
  return (
    <div className={cx("relative", a.className)}>
      <label className="inline-flex items-center gap-3.5 rounded-lg p-4 text-brand-purple-dark has-[input:checked]:bg-brand-blue/20 transition-colors text-base/4">
        <input type="hidden" name={a.name} value="false" />
        <input
          type="checkbox"
          id={a.id}
          name={a.name}
          value={a.inputValue ? String(a.inputValue) : "true"}
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
            a.onChange?.(event);
          }}
          className="rounded border-2 border-brand-purple-dark/10 checked:border-brand-blue text-brand-blue focus:ring-0"
          {...a.rest}
          {...a.errorTag}
        />
        {a.label}
      </label>
      {errorList(a.errors, "absolute -bottom-6")}
    </div>
  );
}

function CheckgroupInput(a: Assigns) {
  const [values, setValues] = useMirror(asList(a.value));
  const toggle = (value: string) => {
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    setValues(next);
    a.onChange?.(next);
  };
  return (
    <div className={cx("relative", a.className)}>
      <Label color={a.color} htmlFor={a.id}>{a.label}</Label>
      <div className={cx("flex flex-col items-start gap-2 mt-2", a.innerClass)}>
        {toPairs(a.options).map(({ label, value }) => {
          const removable = a.removable?.(value);
          const key = String(value);
          return (
            <label
              key={key}
              className={cx(
                "relative",
                "inline-flex items-center gap-3.5 rounded-lg p-4 text-neutral-900 transition-colors text-base/4",
                removable && "pr-10",
                a.color === "purple" && "has-[input:checked]:bg-purple/20",
                a.color === "default" && "has-[input:checked]:bg-blue-light",
              )}
            >
              <input
                type="checkbox"
                id={`${a.id ?? ""}-${a.name ?? ""}-${key}`}
                name={a.name}
                value={key}
                checked={values.includes(key)}
                onChange={() => toggle(key)}
                className={cx(
                  "rounded border-neutral-100 checked:border-blue focus:ring-0",
                  a.color === "purple" && "text-purple",
                  a.color === "default" && "text-blue",
                )}
                {...a.rest}
                {...a.errorTag}
              />
              {label}
              {removable && (
                <button
                  type="button"
                  aria-label={`Remover ${label}`}
                  onClick={removable}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-purple"
                >
                  <Icon name="fa-times" className="size-3" />
                </button>
              )}
            </label>
          );
        })}
      </div>
      {errorList(a.errors, "absolute -bottom-6")}
    </div>
  );
}

function SliderInput(a: Assigns) {
  const options = toPairs(a.options);
  const initial = Math.max(0, options.findIndex((option) => option.value === a.value));
  const [index, setIndex] = useMirror(initial);
  const maxIdx = options.length - 1;
  return (
    <div className={cx("gap-4 space-y-4", a.className)}>
      {a.label && (
        <h2 className="text-xl text-brand-purple-dark font-bold">
          {a.label}
          {a.tagLabel && <Tag item={a.tagLabel} variant={a.color as TagVariant} />}
        </h2>
      )}
      <div className="w-full px-20 relative items-center">
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={index}
            step="1"
            id={a.name}
            className="w-full h-3 bg-brand-blue/10 rounded-lg appearance-none relative z-20 -ml-[0.70rem]"
            style={{ width: "calc(100% + 1.5rem)" }}
            name={a.name}
            disabled={Boolean(a.rest.disabled)}
            onChange={(event) => {
              const next = Number(event.target.value);
              setIndex(next);
              a.onChange?.(normalizeValue(options[next]?.value) ?? null);
            }}
          />
          <div className="relative w-full -mt-5 h-2">
            {options.map((option, idx) => (
              <div
                key={String(option.value)}
                className="absolute w-2 h-2 bg-brand-blue/50 rounded-full"
                style={{ left: `${(idx * 100) / maxIdx}%`, transform: "translateX(-50%)", top: "50%" }}
              />
            ))}
          </div>
        </div>
        <div className="relative w-full mt-4 h-6">
          {options.map((option, idx) => (
            <label
              key={String(option.value)}
              className="absolute text-center"
              style={{ left: `${(idx * 100) / maxIdx}%`, transform: "translateX(-50%)", top: 0 }}
            >
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      <CustomSelect
        id={a.id ?? a.name ?? ""}
        label={a.label}
        options={selectOptions(a.options)}
        createOptions={a.createOptions}
        errors={a.errors}
        name={a.name}
        value={a.value}
        variant={a.variant}
        color={a.color}
        disabled={Boolean(a.rest.readOnly || a.rest.disabled)}
        classOptions={a.classOptions}
        prompt={a.prompt ?? ""}
        errorTag={a.errorTag}
        inputClass={a.inputClass}
        clear={a.clear}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

function TextareaInput(a: Assigns) {
  const controlled = a.onChange !== undefined;
  const value = normalizeValue(a.value);
  return (
    <div className={cx("relative", Boolean(a.rest.disabled) && "opacity-50", a.className)}>
      {a.label && <Label htmlFor={a.id}>{a.label}</Label>}
      <textarea
        id={a.id}
        name={a.name}
        {...(controlled ? { value: value ?? "", onChange: a.onChange } : { defaultValue: value })}
        className={cx(
          "bg-brand-purple-dark/5",
          "border border-transparent focus:border-brand-blue focus:ring-0",
          "block w-full min-h-24 font-normal text-brand-purple-dark/80 placeholder:text-brand-purple-dark/60",
          "outline-hidden transition-colors duration-200 focus:border-brand-blue",
          "rounded-lg p-4",
          a.label && "mt-2",
          a.errors.length === 0 && "border-transparent focus:border-brand-blue",
          a.errors.length > 0 && "border-brand-red",
        )}
        rows={a.rows}
        cols={a.cols}
        {...(a.rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        {...a.errorTag}
      />
      {errorList(a.errors, "absolute -bottom-6")}
    </div>
  );
}

function switchTrack(activated: boolean) {
  return cx(
    "relative w-12 h-6 border rounded-full transition-all cursor-pointer",
    "after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all after:shadow-xl",
    !activated && "bg-neutral-50 border-neutral-100 after:start-[2px]",
    activated && "bg-blue border-blue-dark/60 after:translate-x-full after:end-[20px]",
  );
}

function SwitchInput(a: Assigns) {
  const [activated, setActivated] = useMirror([true, "on", "true"].includes(a.value as never));
  return (
    <div className="relative">
      {a.label && <Label>{a.label}</Label>}
      <label className="inline-block">
        <div className="h-12 flex items-center">
          <Input
            id={a.id}
            type="checkbox"
            className="sr-only peer"
            name={a.name}
            checked={activated}
            onChange={(event) => {
              setActivated(event.target.checked);
              a.onChange?.(event);
            }}
            {...(a.rest as HtmlRest)}
          />
          <div className={switchTrack(activated)} />
        </div>
      </label>
      {errorList(a.errors, "absolute -bottom-5 font-normal leading-none")}
    </div>
  );
}

function ValueSwitchInput(a: Assigns) {
  const own = normalizeValue(a.inputValue) ?? "";
  const [activated, setActivated] = useMirror(asList(a.value).includes(own));
  return (
    <div className="relative">
      {a.label && <Label>{a.label}</Label>}
      <label className="inline-block">
        <div className="h-12 flex items-center">
          <input
            type="checkbox"
            className="sr-only peer"
            name={`${a.name ?? ""}[]`}
            value={own}
            checked={activated}
            onChange={(event) => {
              setActivated(event.target.checked);
              a.onChange?.(event);
            }}
            {...a.rest}
          />
          <div className={switchTrack(activated)} />
        </div>
      </label>
      {errorList(a.errors, "absolute -bottom-5 font-normal leading-none")}
    </div>
  );
}

function RichTextInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      {a.label && <Label className="mb-2">{a.label}</Label>}
      <RichText
        className={a.className}
        id={a.id ?? ""}
        name={a.name}
        value={normalizeValue(a.value)}
        readonly={a.rest.readOnly ? "true" : ""}
        disabled={Boolean(a.rest.disabled)}
        aiGenerate={a.aiGenerate}
        patternModule={a.patternModule}
        patterns={a.patterns}
        showHeadings={a.showHeadings}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

function TagsInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      {a.label && <Label className="mb-2">{a.label}</Label>}
      <MultiTagSelect
        id={a.id}
        name={a.name ?? ""}
        value={asList(a.value)}
        readonly={Boolean(a.rest.readOnly)}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

function CustomSelectInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      <CustomSelect
        id={a.id ?? ""}
        label={a.label}
        options={(a.options ?? []) as SelectItem[]}
        createOptions={a.createOptions}
        errors={a.errors}
        name={a.name}
        value={a.value}
        disabled={Boolean(a.rest.disabled)}
        classOptions={a.classOptions}
        prompt={a.prompt ?? ""}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

function SelectSearchInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      <SelectSearch
        id={a.id ?? ""}
        label={a.label}
        options={(a.options ?? []) as SelectItem[]}
        createOptions={a.createOptions}
        callback={a.callback}
        errors={a.errors}
        name={a.name}
        value={a.value}
        disabled={Boolean(a.rest.disabled)}
        classOptions={a.classOptions}
        prompt={a.prompt ?? ""}
        className={a.className}
        leftIcon={a.leftIcon}
        searchAction={a.searchAction}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

function MultiSelectSearchInput(a: Assigns) {
  return (
    <div className={cx("relative", a.className)}>
      <MultiSelectSearch
        id={a.id ?? ""}
        label={a.label}
        options={(a.options ?? []) as SelectItem[]}
        createOptions={a.createOptions}
        callback={a.callback}
        errors={a.errors}
        name={a.name ?? ""}
        value={asList(a.value)}
        disabled={Boolean(a.rest.disabled)}
        classOptions={a.classOptions}
        prompt={a.prompt ?? ""}
        leftIcon={a.leftIcon}
        searchAction={a.searchAction}
        onChange={a.onChange}
      />
      {errorList(a.errors, "absolute -bottom-6 font-normal leading-none")}
    </div>
  );
}

/**
 * O HEEx emite `type="counter"` antes de `type="number"`; o navegador fica com o
 * primeiro, que é inválido, e o campo vira texto. Aqui sai `type="text"`.
 */
function CounterInput(a: Assigns) {
  const [value, setValue] = useMirror(normalizeValue(a.value) ?? "");
  const max = a.rest.max !== undefined ? Number(a.rest.max) : undefined;
  const update = (next: string) => {
    setValue(next);
    a.onChange?.({ target: { value: next, name: a.name } } as ChangeEvent<HTMLInputElement>);
  };
  const step = (delta: number) => {
    const current = Number.isNaN(Number(value)) ? 0 : Number(value);
    const next = current + delta;
    if (max && next >= max) return update(String(max));
    update(String(next < 0 ? 0 : next));
  };
  return (
    <div id={`${a.id ?? ""}counter-input`} className={cx("relative", a.className)}>
      <Label htmlFor={a.id}>{a.label}</Label>
      <div className={cx("flex w-full relative h-12", a.label && "mt-2")}>
        <button
          data-dec
          type="button"
          onClick={() => step(-1)}
          className="text-blue absolute left-4 top-1/2 -translate-y-1/2 hover:bg-blue-light/50 rounded-full h-6 w-6"
        >
          <Icon name="fa-minus" />
        </button>
        <input
          type="text"
          name={a.name}
          id={a.id}
          data-input
          value={value}
          onChange={(event) => update(Number.isNaN(Number(event.target.value)) ? event.target.value.replace(/\D/g, "") : event.target.value)}
          className={cx(
            "block w-full h-12 text-center border font-normal text-neutral-900 placeholder:text-neutral-500",
            "border-neutral-100 focus:border-blue focus:ring-0",
            "outline-hidden transition-colors duration-200 focus:border-blue disabled:bg-neutral-900/[0.02] rounded-lg",
            a.errors.length === 0 && "border-neutral-100 focus:border-blue",
            a.errors.length > 0 && "border-red",
          )}
          {...a.rest}
          {...a.errorTag}
        />
        <button
          data-inc
          type="button"
          onClick={() => step(1)}
          className="text-blue absolute right-4 top-1/2 -translate-y-1/2 hover:bg-blue-light/50 rounded-full h-6 w-6"
        >
          <Icon name="fa-plus" />
        </button>
      </div>
      {errorList(a.errors, "absolute -bottom-6")}
    </div>
  );
}

function inputIconClass(errors: string[]) {
  return cx(
    "h-6 w-6 flex items-center justify-center absolute top-1/2 -translate-y-1/2",
    errors.length === 0 && "text-brand-purple-dark/60 peer-focus:text-brand-blue",
    errors.length > 0 && "text-brand-red",
  );
}

/** A última cláusula: todos os tipos nativos do HTML. */
function DefaultInput(a: Assigns) {
  const controlled = a.onChange !== undefined || a.type === "hidden";
  const value = normalizeValue(a.value);
  return (
    <div className={cx("relative", Boolean(a.rest.disabled) && "opacity-50", a.type === "hidden" && "hidden", a.className)}>
      <Label htmlFor={a.id}>{a.label}</Label>
      <div className={cx("flex w-full relative", a.label && "mt-2")}>
        <input
          type={a.type}
          name={a.name}
          id={a.id}
          {...(controlled ? { value: value ?? "", onChange: a.onChange } : { defaultValue: value })}
          className={cx(
            "bg-brand-purple-dark/10",
            "border border-brand-purple-dark/10 focus:border-brand-blue focus:ring-0",
            "block w-full h-12 font-normal text-brand-purple-dark/80 placeholder:text-brand-purple-dark/60",
            "outline-hidden transition-colors duration-200 focus:border-brand-blue",
            "peer",
            a.inputClass,
            a.hint ? "rounded-l-lg" : "rounded-lg",
            a.leftIcon && "pl-10",
            a.rightIcon && "pr-10",
            a.type !== "color" && "px-4",
            a.errors.length === 0 && "border-brand-purple-dark/10 focus:border-brand-blue",
            a.errors.length > 0 && "border-brand-red",
          )}
          {...a.rest}
          {...a.errorTag}
        />
        {a.leftIcon && (
          <div className={cx(inputIconClass(a.errors), "left-3")}>
            <Icon name={a.leftIcon} />
          </div>
        )}
        {a.rightIcon && (
          <div className={cx(inputIconClass(a.errors), "right-3")}>
            <Icon name={a.rightIcon} />
          </div>
        )}
        {a.hint && (
          <p
            className={cx(
              "h-12 rounded-r-lg border-l-0 border border-transparent peer-focus-within:border-brand-blue px-4 bg-brand-purple-dark/10 text-nowrap",
              "transition-colors duration-200",
              "flex items-center justify-center",
              "text-brand-purple-dark/80",
            )}
          >
            {a.hint}
          </p>
        )}
      </div>
      {errorList(a.errors, "absolute -bottom-6")}
    </div>
  );
}

/** `core_components.ex` → `input_with_select/1`. */
export function InputWithSelect({
  label,
  textField,
  selectField,
  options = [],
  disabled = false,
  className,
}: {
  label?: string;
  textField: FormField;
  selectField: FormField;
  options?: readonly (SelectItem | OptionTuple)[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("relative", disabled && "opacity-50", className)}>
      <Label>{label}</Label>
      <div className={cx("flex w-full relative", label && "mt-2")}>
        <Input field={textField} disabled={disabled} className="flex-1" inputClass="rounded-r-none!" />
        <Input
          type="select"
          options={options}
          field={selectField}
          disabled={disabled}
          className="flex-1"
          clear={false}
          inputClass="rounded-l-none! bg-brand-purple-dark/10!"
        />
      </div>
    </div>
  );
}

/**
 * `core_components.ex` → `checkgroup/1`. Repassa `variant`, mas a cláusula
 * `checkgroup` do `input/1` lê `color` — no original a variante não tem efeito.
 */
export function Checkgroup({
  variant = "default",
  ...props
}: Omit<InputAttrs, "variant"> & {
  variant?: "default" | "purple";
  disabled?: boolean;
  form?: string;
  readOnly?: boolean;
  onChange?: (values: string[]) => void;
}) {
  void variant;
  return <Input {...props} multiple type="checkgroup" />;
}

/** `core_components.ex` → `fake_input/1`. */
export function FakeInput({
  value,
  label,
  labelColor = "default",
  rightIcon,
  className,
  ...rest
}: {
  value?: ReactNode;
  label?: string;
  labelColor?: "default" | "blue";
  rightIcon?: string;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  return (
    <div className={className} {...rest}>
      {label && (
        <p
          className={cx(
            "block text-sm/4 font-bold",
            labelColor === "default" && "text-neutral-400",
            labelColor === "blue" && "text-brand-blue",
          )}
        >
          {label}
        </p>
      )}
      <div
        className={cx(
          "block w-full min-h-12 rounded-lg font-normal px-4 leading-6",
          "bg-neutral-500/5 text-neutral-500 ",
          "border border-neutral-100",
          "flex items-center justify-between gap-x-4",
          label && "mt-2",
        )}
      >
        {value}
        {rightIcon && (
          <div>
            <Icon name={rightIcon} />
          </div>
        )}
      </div>
    </div>
  );
}

/** `core_components.ex` → `input_switch_card/1`. */
export function InputSwitchCard({
  label,
  active,
  className,
  children,
}: {
  label: string;
  active: FormField;
  className?: string;
  children?: ReactNode;
}) {
  const isActive = [true, "on", "true"].includes(active.value as never);
  return (
    <div
      className={cx(
        "flex items-center justify-center gap-x-2 rounded-lg px-2 border transition-colors",
        !isActive && "bg-brand-purple-dark/10 border-brand-purple-dark/10",
        isActive && "bg-blue-light border-blue/40",
        className,
      )}
    >
      <p className="text-brand-purple-dark font-bold">{label}</p>
      {children}
    </div>
  );
}

/**
 * `core_components.ex` → `switch_card/1`. Como no original, `multiple` e
 * `inputValue` são aceitos mas não chegam à chave, que recebe só o `field`.
 */
export function SwitchCard({
  field,
  className,
  title,
  description,
  onChange,
}: {
  id?: string;
  field: FormField;
  inputValue?: unknown;
  className?: string;
  multiple?: boolean;
  title: string;
  description: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [activated, setActivated] = useMirror([true, "on", "true"].includes(field.value as never));
  return (
    <label className={cx("inline-block w-full", className)} htmlFor={field.id}>
      <div
        className={cx(
          "p-3 flex items-center justify-between rounded-xl border transition-colors delay-100",
          activated && "bg-brand-blue/10 border-brand-blue/40",
          !activated && "bg-brand-purple-dark/5 border-transparent",
        )}
      >
        <div>
          <h3 className="text-brand-purple-dark font-extrabold">{title}</h3>
          <p className="text-sm text-brand-purple-dark/60">{description}</p>
        </div>
        <Input
          type="switch"
          field={{ ...field, value: activated }}
          onChange={(event) => {
            setActivated(event.target.checked);
            onChange?.(event);
          }}
        />
      </div>
    </label>
  );
}

/* ---------- custom_select_component.ex ---------- */

function findSelectedLabel(options: readonly SelectItem[], value: unknown): string | undefined {
  for (const item of options) {
    if (isGroup(item)) {
      const found = findSelectedLabel(item.items, value);
      if (found !== undefined) return found;
    } else if (item.value === value || item.value === String(value)) {
      return item.label;
    }
  }
  return undefined;
}

export function flattenOptions(options: readonly SelectItem[]): SelectOption[] {
  return options.flatMap((item) => (isGroup(item) ? flattenOptions(item.items) : [item]));
}

function emptyValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

/** `custom_select_component.ex` → `BloomyWeb.CustomSelectComponent`. */
export function CustomSelect({
  id,
  options = [],
  createOptions = [],
  name,
  prompt = "",
  label,
  disabled = false,
  errorTag = {},
  inputClass,
  clear = true,
  value: valueProp,
  onChange,
}: {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name?: string;
  prompt?: string;
  label?: string;
  disabled?: boolean;
  errorTag?: Record<string, string>;
  inputClass?: string;
  clear?: boolean;
  value?: unknown;
  variant?: string;
  color?: string;
  classOptions?: string;
  onChange?: (value: string | null) => void;
}) {
  const [value, setValue] = useMirror<unknown>(valueProp);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const selectedLabel = emptyValue(value) ? undefined : findSelectedLabel([...createOptions, ...options], value);
  const flat = flattenOptions(options);

  const close = () => setOpen(false);
  const choose = (option: SelectOption) => {
    const next = parseValue(option.value);
    setValue(next);
    onChange?.(next);
    close();
    setHighlight(-1);
  };

  useFloatingPanel(open, setOpen, { reference: root, container, panel }, (target) =>
    Boolean(panel.current?.contains(target) || container.current?.contains(target)),
  );
  useOptionKeys(open, flat.length, highlight, setHighlight, (index) => flat[index] && choose(flat[index]), close);
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  let counter = 0;
  // Como no `option_item/1`: no topo cada item usa a própria cor; dentro de um
  // grupo, a cor do grupo.
  const renderItems = (items: readonly SelectItem[], passed?: string, top = true): ReactNode[] =>
    items.map((item, index) => {
      const color = (top ? item.color : passed) ?? "purple";
      if (isGroup(item)) {
        return (
          <GroupItems key={`g-${item.group}`} group={item} color={color}>
            {renderItems(item.items, item.color, false)}
          </GroupItems>
        );
      }
      const flatIndex = counter++;
      const selected = parseValue(item.value) === parseValue(value);
      return (
        <li
          key={`${index}-${parseValue(item.value)}`}
          data-options
          data-index={index}
          data-highlighted={flatIndex === highlight ? "true" : undefined}
          className={cx(
            "px-4 py-2 transition-colors rounded-lg font-bold",
            color === "purple" && "text-brand-purple-dark/60",
            color === "orange" && "text-brand-orange-dark",
            color === "red" && "text-red-dark",
            (selected && [
              color === "purple" && "bg-brand-purple-dark/10",
              color === "orange" && "bg-brand-orange-dark/10",
              color === "red" && "bg-red-dark/10",
            ]) || [
              "bg-white",
              color === "purple" && "hover:bg-brand-purple-dark/5 data-[highlighted]:bg-brand-purple-dark/10",
              color === "orange" && "hover:bg-brand-orange-dark/5 data-[highlighted]:bg-brand-orange-dark/10",
              color === "red" && "hover:bg-red-dark/5 data-[highlighted]:bg-red-dark/10",
            ],
            "flex justify-between items-center",
            "cursor-pointer",
          )}
          onClick={() => choose(item)}
        >
          {item.label}
          {selected && <Icon name="fa-check" />}
        </li>
      );
    });

  return (
    <div id={id} className={cx(disabled && "opacity-60 cursor-not-allowed")}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        ref={root}
        className="relative w-full"
        id={`input-container-${id}`}
        data-input-name={name}
        data-disabled={disabled ? "true" : "false"}
      >
        <div
          ref={container}
          data-container
          className={cx(
            "relative flex items-center",
            "px-4 rounded-lg flex items-center justify-between h-12 cursor-pointer overflow-hidden",
            "bg-brand-purple-dark/10",
            "border border-brand-purple-dark/10 data-[open=true]:border-brand-blue",
            "group",
            inputClass,
            label && "mt-2",
          )}
          data-open={open ? "true" : "false"}
          onClick={(event) => {
            const fieldset = root.current?.closest("fieldset");
            if (disabled || fieldset?.disabled) return;
            if ((event.target as HTMLElement).closest("button[data-ignore-open]")) return;
            setHighlight(-1);
            setOpen(!open);
          }}
        >
          <p className={cx("font-normal truncate", (selectedLabel && "text-brand-purple-dark/80") || "text-brand-purple-dark/60")}>
            {selectedLabel || prompt}
          </p>
          <div className="flex items-center gap-2">
            {clear && !emptyValue(value) && (
              <button
                disabled={disabled}
                type="button"
                title="Limpar seleção"
                className="transition-all hover:bg-brand-purple-dark/10 w-6 rounded-full"
                data-ignore-open
                onClick={() => {
                  setValue(null);
                  onChange?.(null);
                  close();
                }}
              >
                <Icon className="text-brand-red" name="fa-times" />
              </button>
            )}
            <Icon className="text-brand-purple-dark/40 group-data-[open=true]:text-brand-blue" name="fa-chevron-down" />
          </div>
        </div>

        <input type="hidden" name={name} value={parseValue(value)} {...errorTag} />

        <div
          ref={panel}
          data-options-container
          className={cx(
            "bg-white rounded-lg overflow-hidden",
            "border border-neutral-100 shadow",
            "fixed left-0 right-0 z-[9999] will-change-transform",
          )}
          style={{ display: open ? "block" : "none" }}
        >
          <ul className="p-4 max-h-64 overflow-y-auto thin-scrollbar">
            {options.length === 0 && <li className="px-4 py-2 bg-white text-blue-dark/80 text-center">Nenhuma opção encontrada</li>}
            {renderItems(options)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GroupItems({ group, color, children }: { group: SelectGroup; color: string; children: ReactNode }) {
  return (
    <>
      <li
        className={cx(
          "text-xs font-bold py-1 uppercase",
          color === "purple" && "text-brand-purple-dark/60",
          color === "orange" && "text-orange",
          color === "red" && "text-brand-red",
        )}
      >
        {group.group}
      </li>
      {group.items.length === 0 && (
        <li className="px-4 py-2 bg-white text-blue-dark/80 text-center">Nenhuma opção encontrada</li>
      )}
      {children}
    </>
  );
}
