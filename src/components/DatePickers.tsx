import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { Icon } from "./Icon.js";
import { FieldError, Input, Label, cx, useMirror, type FormField } from "./Input.js";
import { TODAY } from "./today.js";

/**
 * `core_components.ex` → `range_datepicker/1`, `range_monthpicker/1`,
 * `monthpicker/1`, `week_selector/1` e `date_navigator/1`, com o mesmo flatpickr
 * dos hooks `RangeDatePicker`, `RangeMonthPicker`, `MonthPicker` e `.Flatpickr`.
 *
 * Diferença inevitável: o "hoje" do calendário é `TODAY`, não o relógio.
 */

const NOW = new Date(`${TODAY}T00:00:00`);

async function loadFlatpickr() {
  const [{ default: flatpickr }, { Portuguese }, { default: monthSelectPlugin }] = await Promise.all([
    import("flatpickr"),
    import("flatpickr/dist/l10n/pt.js"),
    import("flatpickr/dist/plugins/monthSelect/index.js"),
  ]);
  return { flatpickr, Portuguese, monthSelectPlugin };
}

/** Monta o flatpickr num efeito de layout: o `destroy` desfaz o `.flatpickr-wrapper` antes de o React remover o nó. */
function useFlatpickr(target: React.RefObject<HTMLElement | null>, create: (lib: Awaited<ReturnType<typeof loadFlatpickr>>, el: HTMLElement) => Instance) {
  const instance = useRef<Instance | null>(null);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let cancelled = false;
    void loadFlatpickr().then((lib) => {
      if (cancelled || !target.current) return;
      instance.current = create(lib, target.current);
      setReady(true);
    });
    return () => {
      cancelled = true;
      instance.current?.destroy();
      instance.current = null;
    };
  }, []);
  return { instance, ready };
}

function isoDate(date: Date) {
  return date.toISOString().split("T")[0]!;
}

function toBr(value: string) {
  return value.split("#").map((date) => {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  });
}

function fieldErrors(field: FormField) {
  return (field.errors ?? []).map((msg) => (
    <FieldError key={msg} className="absolute -bottom-6" message={msg}>
      {msg}
    </FieldError>
  ));
}

/** `core_components.ex` → `range_datepicker/1`. O valor é `AAAA-MM-DD#AAAA-MM-DD`. */
export function RangeDatePicker({
  label,
  static: isStatic = true,
  field,
  className,
  disable = [],
  disabled = false,
  minDate,
  maxDate,
  clear = true,
  onChange,
}: {
  id?: string;
  label?: string;
  static?: boolean;
  field: FormField;
  className?: string;
  disable?: string[];
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  clear?: boolean;
  onChange?: (value: string) => void;
}) {
  const external = String(field.value ?? "");
  const [value, setValue] = useMirror(external);
  const pickr = useRef<HTMLDivElement>(null);
  const clearBtn = useRef<HTMLButtonElement>(null);
  const emit = useRef({ value, onChange });
  emit.current = { value, onChange };

  const view = () => pickr.current?.querySelector<HTMLInputElement>("input[readonly]");
  const publish = (next: string) => {
    if (next === emit.current.value) return;
    setValue(next);
    emit.current.onChange?.(next);
  };

  const { instance, ready } = useFlatpickr(pickr, ({ flatpickr, Portuguese }, el) =>
    flatpickr(el, {
      mode: "range",
      wrap: false,
      static: isStatic,
      monthSelectorType: "static",
      locale: Portuguese,
      dateFormat: "d/m/Y",
      disable,
      minDate,
      maxDate,
      now: NOW,
      onChange: (selectedDates, dateStr) => {
        if (selectedDates.length === 2) {
          const input = view();
          if (input) input.value = dateStr;
          publish(selectedDates.map(isoDate).join("#"));
        }
      },
    }) as Instance,
  );

  useEffect(() => {
    if (ready && external) instance.current?.setDate(toBr(external), true);
  }, [ready, external]);

  useEffect(() => {
    const btn = clearBtn.current;
    if (!btn) return;
    const onClick = (event: MouseEvent) => {
      event.stopPropagation();
      instance.current?.clear();
      const input = view();
      if (input) input.value = "";
      publish("");
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, [clear]);

  return (
    <div id={`${field.id}-picker`} className={cx("relative", disabled && "opacity-60 cursor-not-allowed", className)}>
      {label && <Label className="mb-2">{label}</Label>}
      <div
        ref={pickr}
        id={`${field.id}-starts-at-pickr`}
        className="relative w-full flatpickr"
        data-static={isStatic ? "true" : "false"}
        data-disable={JSON.stringify(disable)}
        data-disabled={disabled ? "true" : undefined}
        data-min-date={minDate}
        data-max-date={maxDate}
      >
        <div className="relative flex items-center">
          <Input name={`${field.id}-view`} value="" className="w-full" readOnly disabled={disabled || undefined} />
          <div className="flex items-center gap-2 absolute right-3">
            {clear && (
              <button
                ref={clearBtn}
                type="button"
                disabled={disabled}
                title="Limpar seleção"
                data-clear-btn
                className={cx("transition-all hover:bg-brand-purple-dark/10 w-6 rounded-full", !value && "hidden")}
              >
                <Icon className="text-brand-red" name="fa-times" />
              </button>
            )}
          </div>
        </div>
        <Input type="hidden" field={{ ...field, value }} className="w-full" />
      </div>
      {fieldErrors(field)}
    </div>
  );
}

/** `core_components.ex` → `range_monthpicker/1`. A segunda ponta vira o último dia do mês. */
export function RangeMonthPicker({
  label,
  field,
  className,
  disable = [],
  onChange,
}: {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  disable?: string[];
  onChange?: (value: string) => void;
}) {
  // `phx-update="ignore"` na raiz: o valor inicial é o único que conta.
  const [value, setValue] = useState(String(field.value ?? ""));
  const pickr = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  void disable;

  const { instance, ready } = useFlatpickr(pickr, ({ flatpickr, Portuguese, monthSelectPlugin }, el) =>
    flatpickr(el, {
      mode: "range",
      wrap: false,
      static: true,
      monthSelectorType: "static",
      locale: Portuguese,
      dateFormat: "d/m/Y",
      now: NOW,
      plugins: [monthSelectPlugin({ shorthand: true, dateFormat: "m/Y" })],
      onChange: (selectedDates, dateStr) => {
        if (selectedDates.length === 2) {
          const [startDate, endDate] = selectedDates as [Date, Date];
          const endOfMonth = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0);
          const next = [startDate, endOfMonth].map(isoDate).join("#");
          const view = el.querySelector<HTMLInputElement>("input[readonly]");
          if (view) view.value = dateStr;
          setValue((current) => {
            if (current !== next) onChangeRef.current?.(next);
            return next;
          });
        }
      },
    }) as Instance,
  );

  useEffect(() => {
    if (ready && value) instance.current?.setDate(toBr(value), true);
  }, [ready]);

  return (
    <div id={`${field.id}-picker`} className={cx("relative", className)}>
      {label && <Label className="mb-2">{label}</Label>}
      <div ref={pickr} id={`${field.id}-starts-at-pickr`} className="relative w-full flatpickr">
        <Input name={`${field.id}-view`} value="" className="w-full" readOnly />
        <Input type="hidden" field={{ ...field, value }} className="w-full" />
      </div>
    </div>
  );
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** `core_components.ex` → `monthpicker/1`. A visão mostra "Ago 2026"; o valor é `2026-08-01`. */
export function MonthPicker({
  label,
  field,
  className,
  onChange,
}: {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const external = String(field.value ?? "");
  const [value, setValue] = useMirror(external);
  const wrapper = useRef<HTMLDivElement>(null);
  // O hook monta o flatpickr no campo de visão, não no invólucro.
  const view = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    view.current = wrapper.current?.querySelector<HTMLInputElement>("input[readonly]") ?? null;
  }, []);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const formatView = (date: Date) => `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;

  const { instance, ready } = useFlatpickr(view, ({ flatpickr, Portuguese, monthSelectPlugin }, el) =>
    flatpickr(el, {
      locale: Portuguese,
      dateFormat: "Y-m",
      allowInput: false,
      disableMobile: true,
      static: true,
      now: NOW,
      plugins: [monthSelectPlugin({ shorthand: true, dateFormat: "Y-m" })],
      onChange: ([selectedDate]) => {
        if (!selectedDate || !view.current) return;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const next = `${year}-${month}-01`;
        view.current.value = formatView(selectedDate);
        setValue(next);
        onChangeRef.current?.(next);
      },
    }) as Instance,
  );

  useEffect(() => {
    const fp = instance.current;
    if (!ready || !fp || !external) return;
    fp.setDate(external, false, "Y-m-d");
    const date = fp.selectedDates[0];
    if (date && view.current) view.current.value = formatView(date);
  }, [ready, external]);

  return (
    <div id={`${field.id}-picker`} className={cx("relative", className)}>
      {label && <Label className="mb-2">{label}</Label>}
      <div ref={wrapper} id={`${field.id}-month-picker`} className="relative w-full flatpickr">
        <Input name={`${field.id}-view`} value="" className="w-full" readOnly />
        <Input type="hidden" field={{ ...field, value }} className="w-full" />
      </div>
      {fieldErrors(field)}
    </div>
  );
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function addDays(value: string, days: number) {
  const [y, m, d] = value.split("-").map(Number);
  return isoDate(new Date(Date.UTC(y!, m! - 1, d! + days)));
}

function parts(value: string) {
  const [y, m, d] = value.split("-");
  return { year: y!, month: Number(m), day: d! };
}

/** `core_components.ex` → `week_selector/1`. `event` recebe o `phx-value-first/last`. */
export function WeekSelector({
  event,
  range,
}: {
  event: (value: { first: string; last: string }) => void;
  range: { first: string; last: string };
  className?: string;
}) {
  const first = parts(range.first);
  const last = parts(range.last);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => event({ first: addDays(range.first, -7), last: addDays(range.last, -7) })}
          className="w-12 h-12 flex items-center justify-center"
        >
          <Icon name="fa-chevron-left" />
        </button>
        <div>
          <p className="text-xl font-bold text-brand-purple-dark">
            {MONTHS[first.month - 1]} {first.year}
          </p>
          <p className="font-medium text-brand-purple-dark/60">
            {first.day} - {last.day} de {MONTHS[last.month - 1]}
          </p>
        </div>
        <button
          onClick={() => event({ first: addDays(range.first, 7), last: addDays(range.last, 7) })}
          className="w-12 h-12 flex items-center justify-center"
        >
          <Icon name="fa-chevron-right" />
        </button>
      </div>
    </div>
  );
}

const CALENDAR_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * `core_components.ex` → `date_navigator/1`. Como no original, o texto inicial
 * sai do `Calendar.strftime` em inglês ("30 Jul 2026") e passa ao português do
 * hook na primeira mudança; `disable` só desliga as setas; e `phx-update="ignore"`
 * faz o componente ignorar `date` depois de montado.
 */
export function DateNavigator({
  date,
  className,
  field,
  disable = false,
  id = "date-navigator",
  onChange,
}: {
  date: string;
  className?: string;
  field: FormField;
  disable?: boolean;
  id?: string;
  onChange?: (date: string) => void;
}) {
  const initial = parts(date);
  const initialText = `${date === TODAY ? "Hoje, " : ""}${initial.day} ${CALENDAR_MONTHS[initial.month - 1]} ${initial.year}`;
  const [current, setCurrent] = useState(date);
  const [text, setText] = useState(initialText);
  const content = useRef<HTMLDivElement>(null);
  const currentRef = useRef(date);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const updateDate = (next: string) => {
    const p = parts(next);
    currentRef.current = next;
    setCurrent(next);
    setText(`${next === TODAY ? "Hoje, " : ""}${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`);
    onChangeRef.current?.(next);
  };

  const { instance } = useFlatpickr(content, ({ flatpickr }, el) =>
    flatpickr(el, {
      dateFormat: "Y-m-d",
      defaultDate: date,
      now: NOW,
      onChange: (_dates, dateStr) => updateDate(dateStr),
    }) as Instance,
  );

  const step = (delta: number) => {
    if (disable) return;
    const next = addDays(currentRef.current, delta);
    updateDate(next);
    instance.current?.setDate(next, true);
  };

  return (
    <div className={cx("flex items-center justify-center", className)}>
      <div
        id={`datepicker-wrapper-${id}`}
        data-current-date={date}
        data-disable={JSON.stringify(disable)}
        data-id={id}
        className="flex items-center gap-4"
      >
        <button
          type="button"
          data-action="prev"
          onClick={() => step(-1)}
          className="p-3 rounded-xl text-brand-purple-dark/60 bg-brand-purple-dark/5 transition shadow-sm cursor-pointer"
        >
          <Icon name="fa-arrow-left" className="w-4 h-4 text-brand-purple-dark/60" />
        </button>
        <div
          ref={content}
          id={`datepicker-${id}`}
          className="flex items-center gap-1 bg-brand-purple-dark/5 rounded-xl px-4 py-3 shadow-sm cursor-pointer whitespace-nowrap"
        >
          <span
            id={`datepicker-input-text-${id}`}
            className="bg-transparent font-semibold text-sm cursor-pointer focus:outline-none w-auto p-1 text-brand-purple-dark/60"
          >
            {text}
          </span>
          <Icon name="fa-calendar" className="w-4 h-4 ml-1 text-brand-purple-dark/60" />
        </div>
        <input type="hidden" id={`datepicker-input-hidden-${id}`} name={field.name} value={current} />
        <button
          type="button"
          data-action="next"
          onClick={() => step(1)}
          className="p-3 rounded-xl bg-brand-purple-dark/5 text-brand-purple-dark/60 transition shadow-sm cursor-pointer"
        >
          <Icon name="fa-arrow-right" className="w-4 h-4 text-brand-purple-dark/60" />
        </button>
      </div>
    </div>
  );
}
