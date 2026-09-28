import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";
import {
  Label,
  cx,
  flattenOptions,
  isGroup,
  useFloatingPanel,
  useMirror,
  useOptionKeys,
  type SelectItem,
  type SelectOption,
} from "./Input.js";
import { SearchBar, renderSearchItems, useSearch } from "./SelectSearch.js";

/**
 * `multi_select_search_component.ex` → `BloomyWeb.MultiSelectSearchComponent`.
 * O `+N` das etiquetas que não cabem vem de `handleOutsideSelect` do hook.
 */

type Picked = { value: string; label: string };

/**
 * Esconde as etiquetas que passam de `limit(largura)` e devolve quais ficaram
 * escondidas. Mede com todas visíveis sempre que a seleção ou a largura muda.
 */
export function useTagOverflow(
  root: React.RefObject<HTMLElement | null>,
  key: string,
  limit: (width: number) => number,
) {
  const [measure, setMeasure] = useState<{ key: string; hidden: number[]; width: number } | null>(null);
  const [resized, setResized] = useState(0);
  const fullKey = `${key}|${resized}`;

  useLayoutEffect(() => {
    if (measure?.key === fullKey) return;
    const el = root.current;
    if (!el) return;
    const width = limit(el.getBoundingClientRect().width);
    const tags = Array.from(el.querySelectorAll<HTMLElement>("[data-selected-option]:not([data-fake])"));
    const hidden = tags.flatMap((tag, index) => (tag.getBoundingClientRect().width + tag.offsetLeft > width ? [index] : []));
    setMeasure({ key: fullKey, hidden, width });
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setResized((n) => n + 1), 100);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return measure?.key === fullKey ? measure : { hidden: [] as number[], width: undefined };
}

function uniqByValue<T extends { value: unknown }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeSelected(options: readonly SelectItem[], values: Set<string>): SelectItem[] {
  return options
    .map((option) =>
      isGroup(option)
        ? {
            ...option,
            items: removeSelected(option.items, values).filter((item) => isGroup(item) || !values.has(String(item.value))),
          }
        : option,
    )
    .filter((option) => !isGroup(option) || option.items.length > 0);
}

/** `merge_create_options/2`: as já escolhidas sobem para o topo, ou para o grupo "Selecionados". */
function mergeCreateOptions(options: readonly SelectItem[], created: SelectOption[]): SelectItem[] {
  if (options.some(isGroup)) {
    const selected = uniqByValue(created);
    const filtered = removeSelected(options, new Set(selected.map((item) => String(item.value))));
    return selected.length === 0 ? filtered : [{ group: "Selecionados", items: selected }, ...filtered];
  }
  return uniqByValue([...created, ...(options as SelectOption[])]);
}

export function MultiSelectSearch({
  id,
  options: optionsProp = [],
  createOptions = [],
  errors = [],
  name,
  prompt = "",
  label,
  callback,
  disabled = false,
  leftIcon,
  searchAction,
  value = [],
  onChange,
}: {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name: string;
  prompt?: string;
  label?: string;
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  leftIcon?: string;
  searchAction?: () => void;
  classOptions?: string;
  value?: string[];
  onChange?: (values: string[]) => void;
}) {
  const [created, setCreated] = useState<SelectOption[]>(flattenOptions(createOptions));
  const { search, setSearch, options: searched } = useSearch(optionsProp, callback);
  const options = mergeCreateOptions(searched, created);
  const initial = value.flatMap((v) => {
    const found = flattenOptions(mergeCreateOptions(optionsProp, created)).find((option) => String(option.value) === String(v));
    return found ? [{ value: String(found.value), label: found.label }] : [];
  });
  const [selected, setSelected] = useMirror<Picked[]>(initial);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const flat = flattenOptions(options);
  const overflow = useTagOverflow(root, JSON.stringify(selected), (width) => width - 64);

  const emit = (next: Picked[]) => {
    setSelected(next);
    onChange?.(next.map((item) => item.value));
  };
  const toggle = (option: SelectOption) => {
    const item = { value: String(option.value), label: option.label };
    const exists = selected.some((picked) => picked.value === item.value);
    emit(exists ? selected.filter((picked) => picked.value !== item.value) : [...selected, item]);
    setCreated([item, ...created]);
  };

  useFloatingPanel(open, setOpen, { reference: root, container, panel }, (target) =>
    Boolean(panel.current?.contains(target) || container.current?.contains(target)),
  );
  useOptionKeys(
    open,
    flat.length,
    highlight,
    setHighlight,
    (index) => {
      if (!flat[index]) return;
      toggle(flat[index]);
      setOpen(false);
      setHighlight(-1);
    },
    () => setOpen(false),
    input,
  );
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const hidden = new Set(overflow.hidden);
  const visible = selected.filter((_, index) => !hidden.has(index));
  const lastVisible = visible[visible.length - 1];
  const tagClass = "uppercase bg-brand-blue/20 text-brand-blue-dark font-semibold text-sm py-0.5 px-1.5 rounded whitespace-nowrap truncate";

  return (
    <div id={id}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div ref={root} className="relative w-full" id={`input-container-${id}`} data-input-name={name}>
        <div
          ref={container}
          data-container
          className={cx(
            "relative flex items-center",
            "px-4 rounded-lg flex items-center justify-between h-12 cursor-pointer overflow-hidden",
            "bg-brand-purple-dark/10",
            "border border-brand-purple-dark/10 data-[open=true]:border-brand-blue",
            "group",
            label && "mt-2",
          )}
          data-open={open ? "true" : "false"}
          onClick={() => {
            if (!open) setTimeout(() => input.current?.focus(), 100);
            setOpen(!open);
          }}
        >
          <div className="flex items-center gap-2">
            {leftIcon && <Icon name={leftIcon} className="mr-0.5 text-brand-purple-dark/50" />}
            {prompt && selected.length === 0 && <span className="whitespace-nowrap text-neutral-500">{prompt}</span>}
            {selected.map((option, index) => (
              <span
                key={option.value}
                className={cx(tagClass, hidden.has(index) && "hidden")}
                style={index === 0 && overflow.width !== undefined ? { maxWidth: `${overflow.width - 48}px` } : undefined}
                data-selected-option
              >
                {option.label}
              </span>
            )).flatMap((tag, index) =>
              hidden.size > 0 && selected[index] === lastVisible
                ? [tag, <span key="fake" className={tagClass} data-selected-option data-fake="true">{`+${hidden.size}`}</span>]
                : [tag],
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                type="button"
                title="Limpar seleção"
                className="transition-all hover:bg-brand-purple-dark/10 w-6 rounded-full"
                onClick={() => emit([])}
              >
                <Icon className="text-brand-red" name="fa-times" />
              </button>
            )}
            <Icon className="text-brand-purple-dark/40 group-data-[open=true]:text-brand-blue" name="fa-chevron-down" />
          </div>
        </div>

        {selected.map((option) => (
          <input key={option.value} type="hidden" name={`${name}[]`} value={option.value} />
        ))}
        {selected.length === 0 && <input type="hidden" name={`${name}[]`} />}

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
          <ul className="p-4 max-h-64 space-y-1 overflow-y-auto thin-scrollbar">
            {options.length === 0 && <li className="px-4 py-2 bg-white text-blue-dark/80 text-center">Nenhuma opção encontrada</li>}
            {renderSearchItems(options, {
              highlight,
              isSelected: (option) => selected.some((picked) => picked.value === String(option.value)),
              onChoose: toggle,
              withRed: false,
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
