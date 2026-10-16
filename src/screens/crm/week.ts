/**
 * CRM de Leads — a semana em horas cheias, para a Agenda anterior e a Proposta
 * de grade.
 *
 * Mesma estrutura do Padrão de Agenda (`padrao-agenda/model.ts`, branch
 * `novo-padrao-de-agenda`): grade de dias × horas, um horário por célula, a cor
 * e a sigla da especialidade e a situação do profissional em cada horário.
 * Quando as duas estiverem na `main`, o vocabulário pode ir para um lugar só.
 * Profissionais e escalas são fictícios.
 */
import { WEEKDAYS, type Availability, type SpecialtyHours, type WeekBlock } from "./model.js";

export type SpecStyle = {
  /** O token de cor (`--color-<tone>`), misturado com branco no fundo dos horários. */
  tone: string;
  icon: string;
  short: string;
  /**
   * A classe do ícone na cor da especialidade. Escrita por extenso para o
   * Tailwind emitir o `--color-<tone>`: token sem classe em uso fica fora do CSS.
   */
  iconClass: string;
};

/** As especialidades do lead (`SPECIALTIES`), na ordem das pílulas. */
export const SPEC_STYLE: Record<string, SpecStyle> = {
  "Análise do Comportamento": { tone: "cyan", icon: "fa-puzzle-piece", short: "ABA", iconClass: "text-cyan" },
  Psicologia: { tone: "green", icon: "fa-brain", short: "PSI", iconClass: "text-green" },
  Fonoaudiologia: { tone: "blue", icon: "fa-ear-listen", short: "FON", iconClass: "text-blue" },
  "Terapia Ocupacional": { tone: "purple", icon: "fa-hands-holding", short: "TO", iconClass: "text-purple" },
  Psicopedagogia: { tone: "pink", icon: "fa-book-open", short: "PPD", iconClass: "text-pink" },
  Fisioterapia: { tone: "orange", icon: "fa-person-walking", short: "FIS", iconClass: "text-orange" },
};
export const SPEC_NAMES = Object.keys(SPEC_STYLE);
const styleOf = (spec: string) => SPEC_STYLE[spec] ?? SPEC_STYLE.Psicologia!;

export const tone = (spec: string) => `var(--color-${styleOf(spec).tone})`;
export const mix = (c: string, p: number, w = "#fff") => `color-mix(in srgb, ${c} ${p}%, ${w})`;
export const strongOf = (c: string) => mix(c, 60, "var(--color-brand-purple-dark)");
export const shortOf = (spec: string) => styleOf(spec).short;
export const iconOf = (spec: string) => styleOf(spec);

/** Segunda a sábado (1–6) e as horas de início, das 07:00 às 19:00. */
export const DAYS = [1, 2, 3, 4, 5, 6];
export const DAY_ABBR = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
export const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const first = (n: string) => String(n || "").trim().split(/\s+/)[0] ?? "";
export const shortName = (n: string) => {
  const p = String(n || "").trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] ?? "";
};
export const newId = (p = "b") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

/** Horas por especialidade, na ordem das pílulas. */
export function totals(blocks: WeekBlock[]): { spec: string; hours: number }[] {
  const by: Record<string, number> = {};
  blocks.forEach((b) => { by[b.spec] = (by[b.spec] ?? 0) + 1; });
  return SPEC_NAMES.filter((s) => by[s]).map((spec) => ({ spec, hours: by[spec]! }));
}

/** Os horários em sequência (mesmo dia, especialidade e profissional) juntos: "Seg 08:00–10:00". */
export function runs(blocks: WeekBlock[]): (WeekBlock & { to: number })[] {
  const sorted = [...blocks].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
  const out: (WeekBlock & { to: number })[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && last.weekday === b.weekday && last.to === b.hour && last.spec === b.spec && (last.professional ?? "") === (b.professional ?? "")) last.to = b.hour + 1;
    else out.push({ ...b, to: b.hour + 1 });
  }
  return out;
}
export const runLabel = (r: { weekday: number; hour: number; to: number }) => `${DAY_SHORT[r.weekday - 1]} ${hh(r.hour)}–${hh(r.to)}`;

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** O horário cabe na disponibilidade da família (os horários preferenciais). */
export function isPref(availability: Availability[], weekday: number, hour: number) {
  return availability.some((a) => WEEKDAYS.indexOf(a.day) + 1 === weekday && minutes(a.from) <= hour * 60 && (hour + 1) * 60 <= minutes(a.to));
}

/** Os horários da semana como disponibilidade da família: faixas contínuas por dia. */
export function toAvailability(blocks: WeekBlock[]): Availability[] {
  const out: Availability[] = [];
  for (const wd of DAYS) {
    const hours = [...new Set(blocks.filter((b) => b.weekday === wd).map((b) => b.hour))].sort((a, b) => a - b);
    let start: number | null = null;
    hours.forEach((h, i) => {
      if (start === null) start = h;
      if (hours[i + 1] !== h + 1) {
        out.push({ day: WEEKDAYS[wd - 1]!, from: hh(start), to: hh(h + 1) });
        start = null;
      }
    });
  }
  return out;
}

/** As horas por especialidade como carga horária do lead. */
export const toSpecialties = (blocks: WeekBlock[]): SpecialtyHours[] => totals(blocks).map(({ spec, hours }) => ({ spec, hours }));

/* ---------- profissionais da Bloomy (Proposta de grade) ---------- */

export type Prof = { name: string; unit: string; specs: string[]; /** Faixas livres na escala: [dia, de, até). */ free: [number, number, number][] };

const f = (days: number[], from: number, to: number) => days.map((d): [number, number, number] => [d, from, to]);

export const PROFS: Prof[] = [
  { unit: "Unidade Teste", name: "Helena Martins Costa", specs: ["Análise do Comportamento", "Psicologia"], free: [...f([1, 3, 5], 13, 18), ...f([2, 4], 8, 11)] },
  { unit: "Unidade Teste", name: "Rafael Tavares", specs: ["Análise do Comportamento"], free: [...f([1, 2, 3, 4, 5], 14, 17), ...f([6], 8, 12)] },
  { unit: "Unidade Teste", name: "Larissa de Sousa Santos", specs: ["Fonoaudiologia"], free: [...f([1, 3], 8, 11), ...f([5], 15, 18)] },
  { unit: "Unidade Teste", name: "Juliana Prado Reis", specs: ["Fonoaudiologia"], free: [...f([2, 4], 14, 18), ...f([6], 9, 12)] },
  { unit: "Unidade Teste", name: "Bruna Oliveira Lima", specs: ["Terapia Ocupacional"], free: [...f([1, 3], 13, 16), ...f([4], 15, 18)] },
  { unit: "Unidade Teste", name: "Camila Nogueira", specs: ["Psicopedagogia"], free: f([1, 5], 14, 17) },
  { unit: "Unidade Teste", name: "Fábio Stoll Pereira", specs: ["Fisioterapia"], free: [...f([3], 9, 12), ...f([5], 8, 10)] },
  { unit: "Santana", name: "Vanessa Duarte", specs: ["Análise do Comportamento", "Psicologia"], free: [...f([1, 2, 3], 8, 12), ...f([4, 5], 14, 18)] },
  { unit: "Santana", name: "Thiago Rezende", specs: ["Fonoaudiologia"], free: [...f([2, 4], 13, 17), ...f([5], 8, 10)] },
  { unit: "Santana", name: "Gabriel Ramos", specs: ["Terapia Ocupacional"], free: f([1, 3, 5], 9, 12) },
  { unit: "Zona Leste", name: "Patrícia Andrade", specs: ["Análise do Comportamento"], free: f([1, 2, 3, 4, 5], 8, 12) },
  { unit: "Zona Leste", name: "Diego Moura", specs: ["Fonoaudiologia", "Psicologia"], free: f([2, 4], 13, 17) },
];

export const profsOf = (unit: string, spec: string) => PROFS.filter((p) => p.unit === unit && p.specs.includes(spec)).map((p) => p.name);

/** Situação de um profissional num horário (o vocabulário do Padrão de Agenda, sem pré-reserva). */
export type ProfState = "free" | "own" | "busy";
export const STATE_ORDER: Record<ProfState, number> = { free: 0, own: 1, busy: 2 };

export function profState(name: string, wd: number, h: number, blocks: WeekBlock[], selfId?: string | null): { s: ProfState; txt: string } {
  if (blocks.some((b) => b.id !== selfId && b.professional === name && b.weekday === wd && b.hour === h)) return { s: "own", txt: "Já está nesta proposta neste horário" };
  const p = PROFS.find((x) => x.name === name);
  if (!p || !p.free.some(([d, a, b]) => d === wd && h >= a && h < b)) return { s: "busy", txt: "Sem horário livre na escala" };
  return { s: "free", txt: "Livre" };
}

/** O primeiro profissional livre da especialidade na unidade. */
export const suggest = (unit: string, spec: string, wd: number, h: number, blocks: WeekBlock[], selfId?: string | null) =>
  profsOf(unit, spec).find((p) => profState(p, wd, h, blocks, selfId).s === "free") ?? "";

/**
 * Importa a agenda anterior para a proposta: mesmos dias, horas e
 * especialidades, com o primeiro profissional livre. Horário já ocupado na
 * proposta fica de fora.
 */
export function importWeek(blocks: WeekBlock[], from: WeekBlock[], unit: string) {
  let acc = [...blocks];
  let added = 0;
  let skipped = 0;
  for (const c of from) {
    if (acc.some((b) => b.weekday === c.weekday && b.hour === c.hour)) { skipped++; continue; }
    const nb: WeekBlock = { id: newId("pg"), weekday: c.weekday, hour: c.hour, spec: c.spec, professional: "" };
    nb.professional = suggest(unit, nb.spec, nb.weekday, nb.hour, acc, nb.id);
    acc = [...acc, nb];
    added++;
  }
  return { blocks: acc, added, skipped, noProf: acc.filter((b) => !b.professional).length };
}
