import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";
import { Label, cx, useFloatingPanel, useMirror, useOptionKeys, type FormField } from "./Input.js";
import { useTagOverflow } from "./MultiSelectSearch.js";

/**
 * `multi_select_component.ex` → `BloomyWeb.MultiSelectComponent`.
 * O `+N` das etiquetas que não cabem vem de `handleOutsideSelect` do hook.
 */

export type MultiSelectOption = { id: string; label: string; details?: string };

export function MultiSelect({
  id,
  options = [],
  field,
  label,
  prompt,
  className,
  onChange,
}: {
  id: string;
  options?: MultiSelectOption[];
  field: FormField;
  label: string;
  prompt?: string;
  className?: string;
  onChange?: (ids: string[]) => void;
}) {
  const initial = ((field.value as string[] | undefined) ?? []).map(String);
  const [ids, setIds] = useMirror(initial);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const selected = options.filter((option) => ids.includes(option.id));
  const overflow = useTagOverflow(root, JSON.stringify(ids), (width) => width);

  const toggle = (option: MultiSelectOption) => {
    const next = ids.includes(option.id) ? ids.filter((item) => item !== option.id) : [option.id, ...ids];
    setIds(next);
    onChange?.(next);
  };

  useFloatingPanel(open, setOpen, { reference: root, container, panel }, (target) => Boolean(root.current?.contains(target)));
  useOptionKeys(open, options.length, highlight, setHighlight, (index) => options[index] && toggle(options[index]), () => setOpen(false));
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  // `handleOutsideSelect`: com uma só visível, um clone dela vira o contador;
  // com mais, a última visível vira o contador.
  const hidden = overflow.hidden.length;
  const visible = selected.filter((_, index) => !overflow.hidden.includes(index));
  const tagClass = "uppercase bg-brand-blue/20 text-brand-blue-dark font-semibold text-sm py-0.5 px-1.5 rounded whitespace-nowrap";

  return (
    <div ref={root} className={cx("relative w-full", className)} id={id}>
      <Label htmlFor={id}>{label}</Label>
      <div
        ref={container}
        className={cx(
          "px-4 rounded-lg flex items-center justify-between mt-2 h-12 cursor-pointer overflow-hidden",
          "bg-brand-purple-dark/10",
          "border border-brand-purple-dark/10 data-[open=true]:border-brand-blue",
          "group",
        )}
        data-container
        data-open={open ? "true" : "false"}
        onClick={() => {
          if (root.current?.closest("fieldset")?.disabled) return;
          setHighlight(-1);
          setOpen(!open);
        }}
      >
        <div className="flex gap-2">
          {prompt && selected.length === 0 && <span className="whitespace-nowrap text-brand-purple-dark/60">{prompt}</span>}
          {selected.map((option, index) => {
            const isHidden = overflow.hidden.includes(index);
            const isLast = hidden > 0 && option === visible[visible.length - 1];
            const text = isLast && visible.length > 1 ? `+${hidden + 1}` : option.label;
            return [
              <span key={option.id} className={cx(tagClass, isHidden && "hidden")} data-selected-option>
                {text}
              </span>,
              isLast && visible.length === 1 && (
                <span key={`${option.id}-count`} className={tagClass} data-selected-option data-fake="true">
                  {`+${hidden}`}
                </span>
              ),
            ];
          })}
        </div>
        <Icon name="fa-chevron-down" className="text-brand-purple-dark/40 group-data-[open=true]:text-brand-blue" />
      </div>

      {selected.map((option) => (
        <input key={option.id} type="hidden" name={`${field.name}[]`} value={option.id} />
      ))}
      <input type="hidden" name={`${field.name}[]`} value="" />

      <ul
        ref={panel}
        data-options-container
        className={cx(
          "bg-white rounded-lg py-3",
          "border border-neutral-100 shadow",
          "fixed left-0 right-0 z-[9999] will-change-transform",
        )}
        style={{ display: open ? "block" : "none" }}
      >
        {options.length === 0 && <li className="px-4 py-2 bg-white text-blue-dark/80 text-center">Nenhuma opção encontrada</li>}
        {options.map((option, index) => {
          const isSelected = ids.includes(option.id);
          return (
            <li
              key={option.id}
              data-option
              data-highlighted={index === highlight ? "true" : undefined}
              className={cx(
                "px-4 py-2 transition-colors",
                (isSelected && "bg-red-light hover:bg-red/20 text-red-dark data-[highlighted]:bg-red/30") ||
                  "bg-white hover:bg-neutral-100/20 text-blue-dark data-[highlighted]:bg-neutral-100/20",
                "flex justify-between",
              )}
              onClick={() => toggle(option)}
            >
              {option.details ? `${option.label} (${option.details})` : option.label}
              {isSelected && (
                <span className="text-xs flex items-center gap-1 font-bold">
                  Remover <Icon name="fa-times" className="mt-0.5" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
