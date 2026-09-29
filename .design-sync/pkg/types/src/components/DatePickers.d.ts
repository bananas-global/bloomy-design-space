import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { type FormField } from "./Input.js";
/** `core_components.ex` → `range_datepicker/1`. O valor é `AAAA-MM-DD#AAAA-MM-DD`. */
export declare function RangeDatePicker({ label, static: isStatic, field, className, disable, disabled, minDate, maxDate, clear, onChange, }: {
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
}): import("react").JSX.Element;
/** `core_components.ex` → `range_monthpicker/1`. A segunda ponta vira o último dia do mês. */
export declare function RangeMonthPicker({ label, field, className, disable, onChange, }: {
    id?: string;
    label?: string;
    field: FormField;
    className?: string;
    disable?: string[];
    onChange?: (value: string) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `monthpicker/1`. A visão mostra "Ago 2026"; o valor é `2026-08-01`. */
export declare function MonthPicker({ label, field, className, onChange, }: {
    id?: string;
    label?: string;
    field: FormField;
    className?: string;
    onChange?: (value: string) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `week_selector/1`. `event` recebe o `phx-value-first/last`. */
export declare function WeekSelector({ event, range, }: {
    event: (value: {
        first: string;
        last: string;
    }) => void;
    range: {
        first: string;
        last: string;
    };
    className?: string;
}): import("react").JSX.Element;
/**
 * `core_components.ex` → `date_navigator/1`. Como no original, o texto inicial
 * sai do `Calendar.strftime` em inglês ("30 Jul 2026") e passa ao português do
 * hook na primeira mudança; `disable` só desliga as setas; e `phx-update="ignore"`
 * faz o componente ignorar `date` depois de montado.
 */
export declare function DateNavigator({ date, className, field, disable, id, onChange, }: {
    date: string;
    className?: string;
    field: FormField;
    disable?: boolean;
    id?: string;
    onChange?: (date: string) => void;
}): import("react").JSX.Element;
