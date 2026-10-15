/**
 * Padrão de Agenda — o vocabulário da tela e a regra de situação do
 * profissional em cada horário. Trazido do `agenda-data.js` do protótipo do
 * Claude Design; nomes e salas são fictícios.
 */

export type SpecSlug = "psychology" | "phonoaudiology" | "occupational_therapy" | "physiotherapy" | "music_therapy";
export type Spec = {
  slug: SpecSlug;
  name: string;
  icon: string;
  /** O token de cor (`--color-<tone>`), misturado com branco no fundo dos horários. */
  tone: string;
  /**
   * A classe do ícone na cor da especialidade. Escrita por extenso para o
   * Tailwind emitir o `--color-<tone>`: token sem classe em uso fica fora do CSS.
   */
  iconClass: string;
};

export const SPECS: Spec[] = [
  { slug: "psychology", name: "Psicologia", icon: "fa-brain", tone: "green", iconClass: "text-green" },
  { slug: "phonoaudiology", name: "Fonoaudiologia", icon: "fa-ear-listen", tone: "blue", iconClass: "text-blue" },
  { slug: "occupational_therapy", name: "Terapia Ocupacional", icon: "fa-hands-holding", tone: "purple", iconClass: "text-purple" },
  { slug: "physiotherapy", name: "Fisioterapia", icon: "fa-person-walking", tone: "orange", iconClass: "text-orange" },
  { slug: "music_therapy", name: "Musicoterapia", icon: "fa-music", tone: "pink", iconClass: "text-pink" },
];
export const SPEC = Object.fromEntries(SPECS.map((s) => [s.slug, s])) as Record<SpecSlug, Spec>;
export const SHORT: Record<SpecSlug, string> = { psychology: "PSI", phonoaudiology: "FON", occupational_therapy: "TO", physiotherapy: "FIS", music_therapy: "MUS" };

export const SERVICES: Record<SpecSlug, string[]> = {
  psychology: ["Sessão de Psicologia ABA"],
  phonoaudiology: ["Fonoaudiologia", "Fono - Linguagem"],
  occupational_therapy: ["Terapia Ocupacional", "Integração Sensorial"],
  physiotherapy: ["Fisioterapia Motora"],
  music_therapy: ["Musicoterapia"],
};

export const PROFS: Record<SpecSlug, string[]> = {
  psychology: ["Helena Martins Costa", "Larissa Wippich", "Carina Ferreira", "Rafael Tavares"],
  phonoaudiology: ["Fábio Stoll Pereira"],
  occupational_therapy: ["Mariana Palmeira", "Tiago Alves"],
  physiotherapy: ["Raiane Almeida"],
  music_therapy: ["Camila Vasques"],
};

export const LOCATIONS: [string, string][] = [["Na Clínica", "in_clinic"], ["Escola", "school"], ["Domiciliar", "home"]];
export const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
export const DAY_ABBR = ["SEG", "TER", "QUA", "QUI", "SEX"];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const OTHER_PATIENTS = ["Sofia Ramos", "Miguel Torres", "Alice Fontes", "Davi Lima", "Laura Prado"];
const LEADS = ["Enzo Carvalho", "Sofia Lacerda", "Heitor Campos"];

/** Situação de um profissional num horário. */
export type ProfState = "free" | "held" | "busy" | "off" | "own";
export const STATE_ORDER: Record<ProfState, number> = { free: 0, own: 1, held: 2, busy: 3, off: 4 };

export type AgendaItem = {
  id: string;
  weekday: number;
  hour: number;
  slug: SpecSlug;
  service: string;
  professional: string;
  room?: string;
  location: string;
  /** Atendimento ao paciente ou de Acompanhante Terapêutico. */
  type: "patient" | "at";
};

/** Uma vigência do padrão de agenda (datas ISO). */
export type Vigencia = { id: string; start: string; end: string; autoRenew?: boolean };

/**
 * O "hoje" da tela, fixo para a fixture não depender do relógio. Próprio desta
 * tela, e não o `TODAY` compartilhado de `components/today.ts` (30/07/2026), para
 * as vigências baterem com o calendário atual: a de out–dez está em vigência.
 */
export const TODAY = "2026-10-15";

export const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const first = (n: string) => String(n || "").split(" ")[0] ?? "";
const hash = (str: string) => {
  let x = 7;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(x);
};

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** `aaaa-mm-dd` → `dd/mm/aaaa`. */
export function br(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const ddmm = (n: number) => br(addDays(TODAY, n)).slice(0, 5);

/**
 * A situação de `prof` no dia `wd` e hora `h`. Determinística: a escala e a
 * ocupação saem de um hash do nome, como no protótipo.
 */
export function profState(prof: string, wd: number, h: number, items: AgendaItem[], selfId: string | null | undefined): { s: ProfState; txt: string } {
  if (items.some((x) => x.id !== selfId && x.professional === prof && x.weekday === wd && x.hour === h))
    return { s: "own", txt: "Já atende este paciente neste horário" };
  const k = hash(prof);
  const start = 8 + (k % 2), end = 17 + ((k >> 3) % 2);
  if (h < start || h >= end || (k % 3 === 0 && wd === 1 + (k % 5))) return { s: "off", txt: "Fora da escala" };
  const r = hash(`${prof}|${wd}|${h}`) % 10;
  if (r < 4) return { s: "busy", txt: `Ocupado · ${OTHER_PATIENTS[r % OTHER_PATIENTS.length]}` };
  if (r === 4) return { s: "held", txt: `Pré-reservado p/ ${LEADS[hash(prof + wd) % LEADS.length]} até ${ddmm(2 + (k % 5))}` };
  return { s: "free", txt: "Livre" };
}

export type VigStatus = { label: string; order: 0 | 1 | 2; tag: "light-blue" | "light-purple" | "red" };

/** Em vigência, futura ou encerrada, em relação a TODAY. */
export function vigStatus(v: Vigencia): VigStatus {
  if (TODAY >= v.start && TODAY <= v.end) return { label: "Em vigência", order: 0, tag: "light-blue" };
  if (v.start > TODAY) return { label: "Futura", order: 1, tag: "light-purple" };
  return { label: "Encerrada", order: 2, tag: "red" };
}

export const range = (v: { start: string; end: string }) => `${br(v.start)} – ${br(v.end)}`;

/** O que acontece com cada vigência quando um novo padrão entra de `start` a `end`. */
export type SplitPiece = {
  kind: "encerrada" | "nova" | "retomada" | "adiada" | "substituida";
  start: string;
  end: string;
  /** A vigência de origem; ausente na nova. */
  from?: Vigencia;
};

/**
 * A quebra das vigências por um novo padrão. O novo padrão vale de `start` a
 * `end`; as vigências que ele cobre cedem o trecho:
 * - a que já estava valendo em `start` encerra na véspera;
 * - se ela ia além de `end`, volta a valer no dia seguinte (retomada);
 * - a que começaria dentro do período é adiada para depois de `end`;
 * - a que cabe inteira no período é substituída.
 * As que não encostam no período ficam como estão.
 */
export function splitPlan(vigs: Vigencia[], start: string, end: string): SplitPiece[] {
  const pieces: SplitPiece[] = [{ kind: "nova", start, end }];
  for (const v of vigs) {
    if (v.end < start || v.start > end) continue;
    if (v.start < start) {
      pieces.push({ kind: "encerrada", start: v.start, end: addDays(start, -1), from: v });
      if (v.end > end) pieces.push({ kind: "retomada", start: addDays(end, 1), end: v.end, from: v });
    } else if (v.end > end) {
      pieces.push({ kind: "adiada", start: addDays(end, 1), end: v.end, from: v });
    } else {
      pieces.push({ kind: "substituida", start: v.start, end: v.end, from: v });
    }
  }
  return pieces.sort((a, b) => a.start.localeCompare(b.start));
}
