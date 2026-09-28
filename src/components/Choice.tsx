import { useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon.js";
import { Label, cx, useMirror, type FormField } from "./Input.js";

/**
 * `core_components.ex` → `fake_radio_group/1`, `radio_group/1`,
 * `radio_selector/1`, `checkbox_group/1`, `radio_cards/1` e `tooltip/1`.
 * Slots com atributos viram listas (`radio`, `checkbox`, `option`).
 */

type Variant = "default" | "purple";

/** `core_components.ex` → `fake_radio_group/1`. */
export function FakeRadioGroup({
  label,
  selectedValue,
  variant = "default",
  className,
  radio,
}: {
  label?: string;
  selectedValue?: unknown;
  variant?: Variant;
  className?: string;
  radio: { name: string; value: unknown; label: string }[];
}) {
  return (
    <div className={cx(className)}>
      <Label color={variant}>{label}</Label>
      <div className="mt-2 w-full space-x-2">
        {radio.map((item, index) => (
          <label
            key={`${item.name}-${String(item.value)}`}
            className={cx(
              "inline-flex items-center gap-3.5 rounded-lg p-4 text-neutral-900 transition-colors text-base/4 cursor-pointer",
              variant === "purple" && "has-[input:checked]:bg-purple/20",
              variant === "default" && "has-[input:checked]:bg-blue-light",
            )}
          >
            {/* O HEEx lê `@radio[:name]` na lista de slots, que dá `nil`: o id sai `-0`, `-1`… */}
            <input
              type="radio"
              name={item.name}
              id={`-${index}`}
              value={String(item.value)}
              defaultChecked={item.value === selectedValue}
              disabled={item.value !== selectedValue}
              className={cx(
                "border-neutral-100 focus:ring-0",
                variant === "purple" && "text-purple checked:border-purple",
                variant === "default" && "text-blue checked:border-blue",
              )}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** `core_components.ex` → `radio_group/1`. */
export function RadioGroup({
  label,
  className = "",
  wrapperClass,
  field,
  variant = "default",
  radio,
  required,
  onChange,
}: {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  variant?: Variant;
  radio: { value: string; label: string; disabled?: boolean; removable?: () => void }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [current, setCurrent] = useMirror(String(field.value ?? ""));
  return (
    <div className={cx(className)}>
      <Label color={variant}>{label}</Label>
      <div className={cx("mt-2 w-full space-x-2", wrapperClass)}>
        {radio.map((item, index) => (
          <label
            key={item.value}
            htmlFor={`${field.id}-${index}`}
            className={cx(
              "relative inline-flex items-center gap-3.5 rounded-lg p-4 text-brand-purple-dark transition-colors text-base/4 cursor-pointer",
              item.removable && "pr-10",
              variant === "purple" && "has-[input:checked]:bg-purple/20",
              variant === "default" && "has-[input:checked]:bg-brand-blue/20",
            )}
          >
            <input
              type="radio"
              name={field.name}
              id={`${field.id}-${index}`}
              value={item.value}
              checked={current === String(item.value)}
              disabled={item.disabled || false}
              onChange={(event) => {
                setCurrent(item.value);
                onChange?.(event);
              }}
              className={cx(
                "border-neutral-100 focus:ring-0",
                variant === "purple" && "text-purple checked:border-purple",
                variant === "default" && "text-brand-blue checked:border-brand-blue",
              )}
              required={required}
            />
            <span>{item.label}</span>
            {item.removable && (
              <button
                type="button"
                aria-label={`Remover ${item.label}`}
                onClick={item.removable}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-purple"
              >
                <Icon name="fa-times" className="size-3" />
              </button>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/** `core_components.ex` → `radio_selector/1`. */
export function RadioSelector({
  label,
  className = "",
  field,
  variant = "default",
  radio,
  onChange,
}: {
  label?: string;
  className?: string;
  field: FormField;
  variant?: Variant;
  radio: { value: string; title?: string; label?: string; icon?: string; warningNumber?: number; disabled?: boolean }[];
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [current, setCurrent] = useMirror(String(field.value ?? ""));
  return (
    <div>
      {label && <Label color={variant}>{label}</Label>}
      <div className={cx("bg-brand-purple-dark/10 p-1.5 rounded-lg space-x-1.5", label && "mt-2", className)}>
        {radio.map((item, index) => (
          <label
            key={item.value}
            htmlFor={`${field.id}-${index}`}
            className={cx(
              "relative inline-flex items-center rounded-lg px-3 text-neutral-900 text-base/4 cursor-pointer h-10",
              "has-[input:checked]:bg-brand-blue/40 has-[input:checked]:shadow-top-inset has-[input:checked]:text-brand-blue/30",
            )}
            title={item.title}
          >
            <input
              type="radio"
              name={field.name}
              id={`${field.id}-${index}`}
              value={item.value}
              checked={current === String(item.value)}
              onChange={(event) => {
                setCurrent(item.value);
                onChange?.(event);
              }}
              className="hidden peer"
              disabled={item.disabled}
            />
            {item.label && (
              <span className="font-bold text-lg text-brand-purple-dark/40 peer-checked:text-brand-blue-dark peer-disabled:opacity-40">
                {item.label}
              </span>
            )}
            {item.icon && (
              <Icon
                name={item.icon}
                className="text-lg text-brand-purple-dark/40 peer-checked:text-brand-blue-dark peer-disabled:opacity-40"
              />
            )}
            {item.warningNumber !== undefined && item.warningNumber > 0 && (
              <div className="w-6 h-6 absolute -left-2 z-10 -top-2 flex items-center justify-center font-bold text-xs rounded-full bg-red text-white">
                {item.warningNumber}
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/** `core_components.ex` → `checkbox_group/1`. */
export function CheckboxGroup({
  label,
  className = "",
  wrapperClass,
  field,
  checkbox,
  required,
  onChange,
}: {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  checkbox: { value: string; label: string; disable?: boolean }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const initial = (Array.isArray(field.value) ? field.value : field.value ? [field.value] : []).map(String);
  const [values, setValues] = useMirror(initial);
  return (
    <div className={cx(className)}>
      <Label>{label}</Label>
      <div className={cx("mt-2 w-full space-x-2", wrapperClass)}>
        {checkbox.map((item, index) => (
          <label
            key={item.value}
            htmlFor={`${field.id}-${index}`}
            className={cx(
              "inline-flex items-center gap-3.5 rounded-lg p-4 text-brand-purple-dar transition-colors text-base/4 cursor-pointer",
              "has-[input:checked]:bg-brand-blue/20",
            )}
          >
            <input
              type="checkbox"
              name={`${field.name}[]`}
              id={`${field.id}-${index}`}
              value={item.value}
              checked={values.includes(String(item.value))}
              disabled={item.disable || false}
              onChange={(event) => {
                const value = String(item.value);
                setValues(event.target.checked ? [...values, value] : values.filter((other) => other !== value));
                onChange?.(event);
              }}
              className={cx("border-neutral-100 focus:ring-0", "text-brand-blue checked:border-brand-blue", "rounded-full")}
              required={required}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** `core_components.ex` → `radio_cards/1`. */
export function RadioCards({
  id,
  value,
  name,
  title,
  option,
  onChange,
}: {
  id: string;
  value?: string;
  name?: string;
  title?: string;
  option: { id: string; title: string; subtitle?: string; badge?: string; icon?: string; children?: ReactNode }[];
  /** O `phx-click="select-option"` com `phx-value-value`. */
  onChange?: (value: string) => void;
}) {
  const [current, setCurrent] = useMirror(value);
  void name;
  return (
    <div id={id} className="rounded-2xl border border-brand-purple-dark/10 bg-white p-4 space-y-3">
      {title && <h2 className="text-brand-purple-dark font-extrabold">{title}</h2>}
      {option.map((item) => {
        const selected = current === item.id;
        return (
          <div
            key={item.id}
            onClick={() => {
              setCurrent(item.id);
              onChange?.(item.id);
            }}
            className={cx(
              "rounded-xl border cursor-pointer transition-all",
              selected
                ? "border-brand-blue/30 bg-brand-blue/10 ring-1 ring-brand-blue"
                : "border-brand-purple-dark/30 bg-white hover:border-brand-purple-dark/10",
            )}
          >
            <div className="flex justify-between gap-4 p-4">
              <div className="flex gap-3">
                <div
                  className={cx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-brand-blue/10 text-bg-brand-blue" : "bg-gray-100",
                  )}
                >
                  <Icon name={item.icon ?? ""} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.title}</span>
                    {item.badge && (
                      <span className="rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-medium text-white">{item.badge}</span>
                    )}
                  </div>
                  {item.subtitle && <p className="text-sm text-gray-500">{item.subtitle}</p>}
                </div>
              </div>
              <div
                className={cx(
                  "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected ? "border-brand-blue" : "border-brand-purple-dark/10",
                )}
              >
                {selected && <div className="h-2.5 w-2.5 rounded-full bg-brand-blue" />}
              </div>
            </div>
            {selected && item.children !== undefined && <div className="border-t border-brand-blue px-4 py-4">{item.children}</div>}
          </div>
        );
      })}
    </div>
  );
}

type Placement = "top" | "bottom" | "left" | "right";

/**
 * `core_components.ex` → `tooltip/1`. Como o hook `Tooltip`: o conteúdo vai
 * para o `body`, aparece no `mouseenter` do gatilho quando `active` é `"true"`
 * e é posicionado com `offset(4)`, `flip` e `shift({padding: 8})`.
 */
export function Tooltip({
  id,
  placement = "right",
  tooltipClass,
  triggerClass,
  tooltipTrigger,
  tooltipContent,
}: {
  id: string;
  placement?: Placement;
  tooltipClass?: string;
  triggerClass?: string;
  tooltipTrigger: ReactNode | { active?: "true" | "false"; children: ReactNode };
  tooltipContent: ReactNode;
}) {
  const slot =
    tooltipTrigger && typeof tooltipTrigger === "object" && "children" in tooltipTrigger && !("type" in tooltipTrigger)
      ? (tooltipTrigger as { active?: "true" | "false"; children: ReactNode })
      : { children: tooltipTrigger as ReactNode };
  const active = slot.active ?? "true";
  const [visible, setVisible] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const t = trigger.current?.getBoundingClientRect();
    const c = content.current;
    if (!visible || !t || !c) return;
    const { width, height } = c.getBoundingClientRect();
    const fits = {
      top: t.top - 4 - height >= 0,
      bottom: t.bottom + 4 + height <= window.innerHeight,
      left: t.left - 4 - width >= 0,
      right: t.right + 4 + width <= window.innerWidth,
    };
    const opposite: Record<Placement, Placement> = { top: "bottom", bottom: "top", left: "right", right: "left" };
    const side = fits[placement] || !fits[opposite[placement]] ? placement : opposite[placement];
    let x = side === "left" ? t.left - 4 - width : side === "right" ? t.right + 4 : t.left + t.width / 2 - width / 2;
    let y = side === "top" ? t.top - 4 - height : side === "bottom" ? t.bottom + 4 : t.top + t.height / 2 - height / 2;
    x = Math.min(Math.max(x, 8), window.innerWidth - width - 8);
    y = Math.min(Math.max(y, 8), window.innerHeight - height - 8);
    Object.assign(c.style, { left: `${x}px`, top: `${y}px` });
  }, [visible, placement]);

  return (
    <div id={id} data-tooltip-placement={placement}>
      <div
        ref={trigger}
        data-tooltip-trigger
        data-active={active}
        className={triggerClass}
        onMouseEnter={() => active === "true" && setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {slot.children}
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={content}
            data-tooltip-content
            className={cx("bg-neutral-900 text-white rounded px-2 py-1 text-sm w-max fixed z-[80]", tooltipClass)}
            style={{ display: visible ? "block" : "none" }}
          >
            {tooltipContent}
          </div>,
          document.body,
        )}
    </div>
  );
}
