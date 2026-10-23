/**
 * Navegação dia a dia do cabeçalho, para as visões por dia.
 *
 * Componente novo: no Phoenix as visões por dia usam o `week_selector/1` e um
 * `radio_selector` de dias. Segue o markup do `week_selector/1` (setas e duas
 * linhas de texto), com o dia da semana em destaque e a data embaixo. As
 * setas pulam os dias em que a unidade não abre (`openWeekdays`).
 */
import { Icon } from "../../components/Icon.js";
import type { Weekday } from "./fixtures.js";
import { CALENDAR_WEEKDAYS, addDays, dayOfWeek } from "./model.js";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** O próximo dia aberto a partir de `date`, andando `step` (1 ou -1). */
export function nextOpenDay(date: string, step: 1 | -1, open: Weekday[]) {
  let next = addDays(date, step);
  for (let i = 0; i < 7 && !open.includes(dayOfWeek(next)); i++) next = addDays(next, step);
  return next;
}

export function DaySelector({
  date,
  today,
  openWeekdays,
  onChange,
}: {
  date: string;
  today: string;
  openWeekdays: Weekday[];
  onChange: (date: string) => void;
}) {
  const [year, month, day] = date.split("-");
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Dia anterior"
          onClick={() => onChange(nextOpenDay(date, -1, openWeekdays))}
          className="w-12 h-12 flex items-center justify-center"
        >
          <Icon name="fa-chevron-left" />
        </button>
        <div className="min-w-44 text-center">
          <p className="text-xl font-bold text-brand-purple-dark">
            {CALENDAR_WEEKDAYS[dayOfWeek(date) - 1]}
            {date === today && <span className="ml-2 align-middle rounded bg-brand-blue/20 px-1.5 py-0.5 text-xs font-bold text-brand-blue-dark">Hoje</span>}
          </p>
          <p className="font-medium text-brand-purple-dark/60">{`${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`}</p>
        </div>
        <button
          type="button"
          aria-label="Próximo dia"
          onClick={() => onChange(nextOpenDay(date, 1, openWeekdays))}
          className="w-12 h-12 flex items-center justify-center"
        >
          <Icon name="fa-chevron-right" />
        </button>
      </div>
    </div>
  );
}
