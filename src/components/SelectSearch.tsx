import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import {
  Label,
  cx,
  flattenOptions,
  isGroup,
  useFloatingPanel,
  useMirror,
  useOptionKeys,
  type SelectGroup,
  type SelectItem,
  type SelectOption,
} from "./Input.js";

/**
 * `select_search_component.ex` → `BloomyWeb.SelectSearchComponent`.
 *
 * `callback(search)` devolve as opções da busca, como o `{:ok, options}` do
 * original; sem `callback` a lista fica como veio.
 */

export type SearchColor = "purple" | "orange" | "red" | string;

/** A barra de busca do painel, comum a `SelectSearch` e `MultiSelectSearch`. */
export function SearchBar({
  id,
  errors,
  disabled,
  inputRef,
  search,
  onSearch,
  searchAction,
}: {
  id: string;
  errors: string[];
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  onSearch: (search: string) => void;
  searchAction?: () => void;
}) {
  return (
    <div className="p-4 flex items-center gap-2 border-b border-brand-purple-dark/10">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          name={`search_${id}`}
          data-input
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className={cx(
            "w-full block px-4 h-12 rounded-lg border font-normal text-neutral-900 placeholder:text-neutral-500",
            "focus:ring-0",
            "outline-hidden transition-colors duration-200 focus:border-blue disabled:bg-neutral-900/[0.02]",
            errors.length === 0 && "border-neutral-100 focus:border-blue",
            errors.length > 0 && "border-red",
            "peer pr-10",
          )}
          disabled={disabled}
          autoComplete="off"
        />
        <Icon
          name="fa-search"
          className="block w-4 h-4 absolute top-4 right-4 text-neutral-100 peer-focus:text-blue transition-colors duration-200"
        />
      </div>
      <Button type="button" variant="tint" title="Limpar busca" onClick={() => onSearch("")}>
        <Icon name="fa-broom" className="block w-4 h-4 self-center" />
      </Button>
      {searchAction && (
        <Button type="button" title="Busca avançada" onClick={searchAction}>
          <Icon name="fa-filter" className="block w-4 h-4 self-center" />
        </Button>
      )}
    </div>
  );
}

/** `option_item/1` com grupos aninhados, compartilhado pelas duas buscas. */
export function renderSearchItems(
  items: readonly SelectItem[],
  opts: {
    highlight: number;
    isSelected: (option: SelectOption) => boolean;
    onChoose: (option: SelectOption) => void;
    withRed: boolean;
  },
): ReactNode[] {
  let counter = 0;
  const walk = (list: readonly SelectItem[], passed: string | undefined, top: boolean, depth: number): ReactNode[] =>
    list.map((item, index) => {
      const color = (top ? item.color : passed) ?? "purple";
      if (isGroup(item)) {
        return (
          <SearchGroup key={`g-${depth}-${item.group}`} group={item} color={color} depth={depth} withRed={opts.withRed}>
            {walk(item.items, item.color, false, depth + 1)}
          </SearchGroup>
        );
      }
      const flatIndex = counter++;
      const selected = opts.isSelected(item);
      const red = opts.withRed && color === "red";
      return (
        <li
          key={`${depth}-${index}-${String(item.value)}`}
          data-options
          data-index={index}
          data-highlighted={flatIndex === opts.highlight ? "true" : undefined}
          className={cx(
            "px-4 py-2 transition-colors rounded-lg font-bold",
            depth > 1 && "ml-6",
            color === "purple" && "text-brand-purple-dark/60",
            color === "orange" && "text-brand-orange-dark",
            red && "text-brand-red-dark",
            (selected && [
              color === "purple" && "bg-brand-purple-dark/10",
              color === "orange" && "bg-brand-orange-dark/10",
              red && "bg-brand-red-dark/10",
            ]) || [
              "bg-white",
              color === "purple" && "hover:bg-brand-purple-dark/5 data-[highlighted]:bg-brand-purple-dark/10",
              color === "orange" && "hover:bg-brand-orange-dark/5 data-[highlighted]:bg-brand-orange-dark/10",
              red && "hover:bg-brand-red-dark/5 data-[highlighted]:bg-brand-red-dark/10",
            ],
            "flex justify-between items-center",
            "cursor-pointer",
          )}
          onClick={() => opts.onChoose(item)}
        >
          {item.label}
          {selected && <Icon name="fa-check" />}
        </li>
      );
    });
  return walk(items, undefined, true, 0);
}

function SearchGroup({
  group,
  color,
  depth,
  withRed,
  children,
}: {
  group: SelectGroup;
  color: string;
  depth: number;
  withRed: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <li
        className={cx(
          "font-bold uppercase",
          depth === 0 && "text-xs py-1 mt-1 first:mt-0 tracking-wide",
          depth > 0 &&
            "ml-3 mt-2 mb-1 border-l-2 pl-3 py-1 text-[0.68rem] tracking-[0.18em] rounded-r-md bg-neutral-900/[0.025]",
          color === "purple" && "text-brand-purple-dark/60 border-brand-purple-dark/20",
          color === "orange" && "text-orange border-orange/30",
          withRed && color === "red" && "text-brand-red-dark border-brand-red-dark/25",
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

/** Busca com `phx-debounce="100"`: devolve as opções do `callback`, ou as da prop. */
export function useSearch(options: readonly SelectItem[], callback?: (search: string) => SelectItem[]) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<readonly SelectItem[] | null>(null);
  const touched = useRef(false);
  const optionsKey = JSON.stringify(options);
  useEffect(() => {
    if (!callback || !touched.current) return;
    const timer = setTimeout(() => setResults(callback(search)), 100);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setResults(null), [optionsKey]);
  const update = (next: string) => {
    touched.current = true;
    setSearch(next);
  };
  return { search, setSearch: update, options: results ?? options };
}

function findLabel(options: readonly SelectItem[], value: unknown): string | undefined {
  return flattenOptions(options).find((option) => option.value === value)?.label;
}

export function SelectSearch({
  id,
  options: optionsProp = [],
  createOptions = [],
  errors = [],
  name,
  prompt = "",
  label,
  callback,
  disabled = false,
  searchAction,
  leftIcon,
  className,
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
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  searchAction?: () => void;
  leftIcon?: string;
  className?: string;
  classOptions?: string;
  value?: unknown;
  onChange?: (value: string | null) => void;
}) {
  const [value, setValue] = useMirror<unknown>(valueProp);
  // `selected_label` sobrevive à busca: guarda o rótulo escolhido enquanto o valor for o mesmo.
  const [chosen, setChosen] = useState<{ value: unknown; label: string }>();
  const selectedLabel = value
    ? (chosen?.value === value ? chosen.label : undefined) ?? findLabel([...createOptions, ...optionsProp], value)
    : undefined;
  const { search, setSearch, options } = useSearch(optionsProp, callback);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const flat = flattenOptions(options);

  const close = () => setOpen(false);
  const choose = (option: SelectOption) => {
    const next = String(option.value);
    setValue(next);
    setChosen({ value: next, label: option.label });
    onChange?.(next);
    close();
    setHighlight(-1);
  };

  useFloatingPanel(open, setOpen, { reference: root, container, panel }, (target) =>
    Boolean(panel.current?.contains(target) || container.current?.contains(target)),
  );
  useOptionKeys(open, flat.length, highlight, setHighlight, (index) => flat[index] && choose(flat[index]), close, input);
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <div id={id} className={cx(disabled && "opacity-60 cursor-not-allowed", className)}>
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
            "border border-brand-purple-dark/20 data-[open=true]:border-brand-blue",
            "group",
            label && "mt-2",
          )}
          data-open={open ? "true" : "false"}
          onClick={(event) => {
            if (disabled) return;
            if ((event.target as HTMLElement).closest("button[data-ignore-open]")) return;
            if (!open) setTimeout(() => input.current?.focus(), 100);
            setHighlight(-1);
            setOpen(!open);
          }}
        >
          <div className="flex items-center gap-2">
            {leftIcon && <Icon name={leftIcon} className="mr-0.5 text-brand-purple-dark/50" />}
            <p className={cx("font-normal", (selectedLabel && "text-brand-purple-dark") || "text-brand-purple-dark/60")}>
              {selectedLabel || prompt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {value !== null && value !== undefined && value !== "" && (
              <button
                type="button"
                disabled={disabled}
                title="Limpar seleção"
                className="transition-all hover:bg-brand-purple-dark/10 w-6 rounded-full"
                data-ignore-open
                onClick={() => {
                  setValue(null);
                  setChosen(undefined);
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

        <input type="hidden" name={name} value={value === null || value === undefined ? "" : String(value)} />

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
          <SearchBar
            id={id}
            errors={errors}
            disabled={disabled}
            inputRef={input}
            search={search}
            onSearch={setSearch}
            searchAction={searchAction}
          />
          <ul className="p-4 max-h-64 overflow-y-auto thin-scrollbar">
            {options.length === 0 && <li className="px-4 py-2 bg-white text-blue-dark/80 text-center">Nenhuma opção encontrada</li>}
            {renderSearchItems(options, {
              highlight,
              isSelected: (option) => selectedLabel === option.label,
              onChoose: choose,
              withRed: true,
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
