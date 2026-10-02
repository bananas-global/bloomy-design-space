/**
 * Mapa de Salas — o modelo do mapa de ocupação.
 *
 * Duas camadas, ligadas mas não amarradas:
 *
 * 1. Planejamento (`sp.plan`): o que a unidade precisa naquele ponto. Ex.: o
 *    Ponto A quer Psicologia das 08h às 12h e Fono das 13h às 17h.
 * 2. Escala (`sp.periods`): quem está de fato alocado, vindo da escala dos
 *    profissionais. Pode coincidir com o plano, divergir, ficar aquém ou
 *    existir sem plano nenhum.
 *
 * O mapa não força uma ponta na outra: mede a distância entre as duas e mostra
 * onde falta gente, onde a especialidade não bate e onde há alocação fora do
 * planejado.
 *
 * Só o planejamento se edita no mapa, e vale na hora. A escala vem do perfil
 * de cada profissional (lá se define a sala e o ponto em que ele atende).
 */
import { TODAY } from "../../components/today.js";
import { PROFESSIONALS } from "./fixtures.js";

/* ============================================================
   Tipos
   ============================================================ */

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type Specialty = string;
export type PlanType = "fixed" | "temporary";
export type RoomType = "attendance" | "evaluation" | "playful" | "waiting" | "administrative";
export type BlockingType = "time_period" | "slot";

export type ServiceHour = { weekdays: DayKey[]; start: string; end: string };

/** Uma necessidade do planejamento do ponto. */
export type PlanEntry = {
  start: string;
  end: string;
  specialty: Specialty;
  role?: string;
  planType?: PlanType;
  /** Ausente = todos os dias da unidade. Vazio é explícito. */
  days?: DayKey[] | null;
};

/** Um período da escala de um profissional apontando para este ponto. */
export type Period = {
  start: string;
  end: string;
  specialty: Specialty;
  role?: string;
  /** "default" é a escala Padrão (= plano fixo). */
  type?: "default" | "temporary";
  professional: string;
  days?: DayKey[] | null;
  validFrom?: string;
  validUntil?: string;
};

export type ServicePoint = { name: string; plan: PlanEntry[]; periods: Period[] };

export type Room = {
  id: string;
  number: number;
  name: string;
  areaId: string;
  type: RoomType;
  capacity: number;
  active: boolean;
  servicePoints: ServicePoint[];
};

export type RoomBlocking = {
  id: string;
  room: string;
  number: number | string;
  name: string;
  type: BlockingType;
  start: string;
  end: string;
  obs: string;
};

export type UnitShape = {
  id: string;
  serviceHour: ServiceHour;
  areas: { id: string; name: string }[];
  rooms: Room[];
};

/* ============================================================
   Rótulos
   ============================================================ */

export const ROLE_LABELS: Record<string, string> = {
  therapeutic_companion: "Terapeuta",
  applicator: "Aplicador",
  supervisor: "Supervisor",
  specialist: "Especialista",
  coordinator: "Coordenador",
};
export const roleLabel = (r?: string) => (r ? ROLE_LABELS[r] ?? r : "");

export const ROOM_TYPES: [string, RoomType][] = [
  ["Sala de atendimento", "attendance"],
  ["Sala de avaliação", "evaluation"],
  ["Sala lúdica", "playful"],
  ["Sala de espera", "waiting"],
  ["Sala administrativa", "administrative"],
];
export const roomTypeLabel = (v: RoomType) => (ROOM_TYPES.find((t) => t[1] === v) ?? [v])[0];

export const BLOCKING_TYPES: [string, BlockingType][] = [
  ["Dia inteiro / Período", "time_period"],
  ["Horário específico", "slot"],
];
export const blockingTypeLabel = (v: BlockingType) => (BLOCKING_TYPES.find((t) => t[1] === v) ?? [v])[0];

export const SPECIALTIES: Specialty[] = ["Psicologia", "Fonoaudiologia", "Terapia Ocupacional", "Psicopedagogia", "Fisioterapia", "Aplicador ABA"];

const SPEC_ABBR: Record<string, string> = {
  "Psicologia": "PSI",
  "Fonoaudiologia": "FON",
  "Terapia Ocupacional": "TO",
  "Aplicador ABA": "ABA",
  "Psicopedagogia": "PPD",
  "Fisioterapia": "FIS",
  "Aplicador Psicologia": "PSI",
};
export const specAbbr = (s?: string) => (s ? SPEC_ABBR[s] ?? s.slice(0, 3).toUpperCase() : "—");

export const POINT_NAMES = "ABCDEFGHIJ".split("");

export const roomLabel = (room: Room) => room.name.trim() || String(room.number);

export const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ============================================================
   Horas e dias
   ============================================================ */

export const toMin = (s: string | undefined) => {
  const p = String(s ?? "").split(":");
  return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
};
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const DAYS: [DayKey, string, string][] = [
  ["monday", "Seg", "Segunda"],
  ["tuesday", "Ter", "Terça"],
  ["wednesday", "Qua", "Quarta"],
  ["thursday", "Qui", "Quinta"],
  ["friday", "Sex", "Sexta"],
  ["saturday", "Sáb", "Sábado"],
  ["sunday", "Dom", "Domingo"],
];
export const dayShort = (k: DayKey) => (DAYS.find((d) => d[0] === k) ?? ["", k])[1];
export const dayLong = (k: DayKey) => (DAYS.find((d) => d[0] === k) ?? ["", "", k])[2];

/** A clínica opera de segunda a sexta: fim de semana não entra no mapa. */
export function unitDays(unit: Pick<UnitShape, "serviceHour">): DayKey[] {
  const week5 = DAYS.slice(0, 5).map((d) => d[0]);
  const keys = week5.filter((d) => unit.serviceHour.weekdays.includes(d));
  return keys.length ? keys : week5;
}

/** `days` ausente = todos os dias da unidade (legado). Array vazio é explícito. */
export function periodDays(p: { days?: DayKey[] | null }, uDays: DayKey[]): DayKey[] {
  if (p.days == null) return uDays;
  return uDays.filter((d) => p.days!.includes(d));
}

export function daysLabel(days: DayKey[] | null | undefined, uDays: DayKey[]): string | null {
  if (days == null || days.length === uDays.length) return null;
  if (days.length === 0) return "nenhum dia";
  const idx = days.map((k) => uDays.indexOf(k)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (idx.length === 0) return "nenhum dia";
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1);
  if (contiguous && idx.length > 2) return `${dayShort(uDays[idx[0]!]!)}–${dayShort(uDays[idx[idx.length - 1]!]!)}`;
  return idx.map((i) => dayShort(uDays[i]!)).join(" · ");
}

/* ============================================================
   Datas (ISO `AAAA-MM-DD`, no fuso local)
   ============================================================ */

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
};
export const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  return addDays(x, wd === 0 ? -6 : 1 - wd);
}
export function dateOf(monday: Date, day: DayKey) {
  const i = DAYS.findIndex((d) => d[0] === day);
  return addDays(monday, i < 0 ? 0 : i);
}
export const fmtDay = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
export const fmtBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** O relógio do ambiente: o mapa e a lista de profissionais concordam sobre "hoje". */
export const TODAY_DATE = parseISO(TODAY);
export const TODAY_KEY: DayKey = DAYS[(TODAY_DATE.getDay() + 6) % 7]![0];

/* ============================================================
   Profissionais: desligamento
   ============================================================ */

const professional = (name: string) => PROFESSIONALS.find((x) => x.name === name);
const daysLeft = (iso: string) => Math.round((parseISO(iso).getTime() - TODAY_DATE.getTime()) / 86_400_000);

/** Em inativação: desligamento marcado para uma data futura. */
function leavingAt(name: string) {
  const p = professional(name);
  if (!p || !p.active || !p.deactivationAt || daysLeft(p.deactivationAt) < 0) return null;
  return p.deactivationAt;
}

export const professionalSpecialty = (name: string) => professional(name)?.specialty;

export function periodValidOn(p: Period, iso: string) {
  if (p.validFrom && iso < p.validFrom) return false;
  if (p.validUntil && iso > p.validUntil) return false;
  const exit = professional(p.professional)?.deactivationAt;
  if (exit && iso > exit) return false;
  return true;
}

/* ============================================================
   Tipo de plano × tipo de escala
   ============================================================ */

export const planTypeOf = (p?: { planType?: PlanType }): PlanType => (p?.planType === "temporary" ? "temporary" : "fixed");
export const allocTypeOf = (p?: { type?: Period["type"] }): PlanType => (p?.type === "temporary" ? "temporary" : "fixed");
export const typeLabel = (t: PlanType) => (t === "temporary" ? "Temporário" : "Fixo");

/** Conflito = só especialidade diferente (perfil e tipo não entram na regra). */
const fits = (pl: { specialty: string }, al: { specialty: string }) => al.specialty === pl.specialty;

export const byStart = (x: { start: string }, y: { start: string }) => String(x.start).localeCompare(String(y.start));

/* ============================================================
   Aritmética de intervalos
   ============================================================ */

/** Ignora frestas irrelevantes. */
const MIN_SEG = 15;

/** Remove `cuts` de [from, to] e devolve o que sobrou. */
function subtract(from: number, to: number, cuts: [number, number][]) {
  let out: [number, number][] = [[from, to]];
  cuts.forEach(([a, b]) => {
    const next: [number, number][] = [];
    out.forEach(([x, y]) => {
      if (b <= x || a >= y) {
        next.push([x, y]);
        return;
      }
      if (a > x) next.push([x, a]);
      if (b < y) next.push([b, y]);
    });
    out = next;
  });
  return out.filter(([a, b]) => b - a >= MIN_SEG);
}
const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

/* ============================================================
   O dia de uma semana real
   ============================================================ */

export type Segment = { from: number; to: number };
export type PlanSeg = PlanEntry & Segment & { dayLabel: string | null; _src: PlanEntry };
export type LaneStatus = "ok" | "partial" | "open" | "divergent";
export type PlanBlock = PlanSeg & { status: LaneStatus; typeOnly: boolean };
export type AllocStatus = "ok" | "divergent" | "extra";
export type AllocBlock = Period & Segment & {
  dayLabel: string | null;
  leavingAt: string | null;
  _src: Period;
  status: AllocStatus;
  typeOnly: boolean;
  host: PlanSeg | null;
};

export type Gap = Segment & {
  room: Room;
  point: ServicePoint;
  plan: PlanSeg;
  minutes: number;
};

export type Lane = {
  point: ServicePoint | null;
  plan: PlanBlock[];
  allocs: AllocBlock[];
  gaps: Gap[];
  closed: Segment[];
  nopoint: boolean;
};

export type DayModel = {
  day: DayKey;
  /** A data real do dia em tela (`AAAA-MM-DD`). */
  refISO: string;
  dayStart: number;
  dayEnd: number;
  span: number;
  rooms: { room: Room; lanes: Lane[] }[];
};

export function buildDay(unit: UnitShape, day: DayKey, monday: Date): DayModel {
  const refISO = toISO(dateOf(monday, day));
  // O eixo é o horário de funcionamento, sem sobra arredondada nas pontas.
  const dayStart = toMin(unit.serviceHour.start);
  const dayEnd = toMin(unit.serviceHour.end);
  const span = Math.max(60, dayEnd - dayStart);
  const uDays = unitDays(unit);

  const closed: Segment[] = [];

  // Todo tipo de sala entra no mapa com seus pontos; só as inativas ficam de fora.
  const rooms = unit.rooms
    .filter((room) => room.active !== false)
    .map((room) => {
      if (room.servicePoints.length === 0) {
        return { room, lanes: [{ point: null, plan: [], allocs: [], gaps: [], closed, nopoint: true }] };
      }
      const lanes: Lane[] = room.servicePoints.map((sp) => {
        const gaps: Gap[] = [];
        const clip = <T extends { start: string; end: string; days?: DayKey[] | null }>(p: T) => ({
          ...p,
          from: Math.max(dayStart, toMin(p.start)),
          to: Math.min(dayEnd, toMin(p.end)),
          dayLabel: daysLabel(periodDays(p, uDays), uDays),
        });

        const plan: PlanSeg[] = sp.plan
          .filter((p) => periodDays(p, uDays).includes(day))
          .map((p) => ({ ...clip(p), _src: p }))
          .filter((p) => p.to > p.from)
          .sort((a, b) => a.from - b.from);

        const allocs = sp.periods
          .filter((p) => periodDays(p, uDays).includes(day) && periodValidOn(p, refISO))
          .map((p) => ({ ...clip(p), leavingAt: p.professional ? leavingAt(p.professional) : null, _src: p }))
          .filter((p) => p.to > p.from && p.professional)
          .sort((a, b) => a.from - b.from);

        // Trechos do plano sem ninguém (nem divergente).
        plan.forEach((pl) => {
          const covered = allocs
            .filter((al) => overlap(pl.from, pl.to, al.from, al.to) > 0)
            .map((al): [number, number] => [Math.max(al.from, pl.from), Math.min(al.to, pl.to)]);
          subtract(pl.from, pl.to, covered).forEach(([a, b]) => {
            gaps.push({ room, point: sp, plan: pl, from: a, to: b, minutes: b - a });
          });
        });

        const planBlocks: PlanBlock[] = plan.map((pl) => {
          const hits = allocs.filter((al) => overlap(pl.from, pl.to, al.from, al.to) > 0);
          const good = hits.filter((al) => fits(pl, al));
          const goodMin = good.reduce((s, al) => s + overlap(pl.from, pl.to, al.from, al.to), 0);
          let status: LaneStatus = "open";
          if (goodMin >= pl.to - pl.from - MIN_SEG) status = "ok";
          else if (goodMin > 0) status = "partial";
          else if (hits.length > 0) status = "divergent";
          return { ...pl, status, typeOnly: status === "divergent" && hits.every((al) => fits(pl, al)) };
        });

        const allocBlocks: AllocBlock[] = allocs.map((al) => {
          const host = plan.find((pl) => overlap(pl.from, pl.to, al.from, al.to) > 0) ?? null;
          let status: AllocStatus = "extra";
          let typeOnly = false;
          if (host) {
            status = fits(host, al) ? "ok" : "divergent";
            typeOnly = status === "divergent" && fits(host, al);
          }
          return { ...al, status, typeOnly, host };
        });

        return { point: sp, plan: planBlocks, allocs: allocBlocks, gaps, closed, nopoint: false };
      });
      return { room, lanes };
    })
    .sort((x, y) => x.room.number - y.room.number);

  return { day, refISO, dayStart, dayEnd, span, rooms };
}

/* ============================================================
   Filtros do mapa
   ============================================================ */

export type Focus = "all" | "ok" | "open" | "extra" | "noplan" | "divergent" | "temp";
export const FOCUS_KEYS: Exclude<Focus, "all">[] = ["ok", "open", "extra", "noplan", "divergent", "temp"];

export function laneCount(l: Lane, k: Exclude<Focus, "all">) {
  if (k === "open") return l.gaps.length;
  if (k === "noplan") return !l.nopoint && l.point && l.plan.length === 0 && l.allocs.length === 0 ? 1 : 0;
  // Mesma regra do ícone: alocação temporária ou trecho a cobrir com plano temporário.
  if (k === "temp") return l.allocs.filter((b) => allocTypeOf(b._src) === "temporary").length + l.gaps.filter((g) => planTypeOf(g.plan) === "temporary").length;
  return l.allocs.filter((b) => b.status === k).length;
}

/** Busca sem acento, caixa, espaço nem pontuação. */
export const norm = (s: string | number | undefined) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s·\-_.]/g, "");

/** Busca única: profissional, sala, sala + ponto ("azul a", "1a", "sala 1 b"), especialidade. */
export function laneMatches(room: Room, l: Lane, q: string) {
  const nq = norm(q);
  if (!nq) return true;
  const pt = l.point ? l.point.name : "";
  const label = roomLabel(room);
  const exact = [room.number + pt, "sala" + room.number + pt, "sala" + room.number, String(room.number), "ponto" + pt].map(norm);
  if (exact.includes(nq)) return true;
  const cands: string[] = [label, label + pt];
  l.allocs.forEach((b) => cands.push(b.professional, b.specialty, specAbbr(b.specialty)));
  l.plan.forEach((pl) => cands.push(pl.specialty, specAbbr(pl.specialty)));
  return cands.some((c) => {
    const n = norm(c);
    return n && (n === nq || n.includes(nq));
  });
}

export type SearchOption = { group: string; icon: string; label: string; sub?: string; value: string; keys: string[] };

export function searchOptions(rooms: DayModel["rooms"]): SearchOption[] {
  const out: SearchOption[] = [];
  const seenP = new Set<string>(), seenS = new Set<string>();
  rooms.forEach(({ room, lanes }) => {
    const label = roomLabel(room);
    const pts = lanes.filter((l) => l.point);
    out.push({ group: "Salas", icon: "fa-door-open", label, sub: pluralize(pts.length, "ponto", "pontos"), value: label, keys: [label, "sala " + room.number] });
    pts.forEach((l) => {
      const code = `${label}·${l.point!.name}`;
      const specs = l.plan.map((pl) => specAbbr(pl.specialty)).filter((v, i, a) => a.indexOf(v) === i);
      out.push({ group: "Sala e ponto", icon: "fa-location-dot", label: code, sub: specs.length ? specs.join(", ") : "sem padrão", value: code, keys: [code, `${label} ${l.point!.name}`, room.number + l.point!.name] });
      [...l.allocs.map((b) => b.specialty), ...l.plan.map((pl) => pl.specialty)].forEach((s) => s && seenS.add(s));
      l.allocs.forEach((b) => {
        if (seenP.has(b.professional)) return;
        seenP.add(b.professional);
        out.push({ group: "Profissionais", icon: "fa-user", label: b.professional, sub: b.specialty, value: b.professional, keys: [b.professional] });
      });
    });
  });
  [...seenS].forEach((s) => out.push({ group: "Especialidades", icon: "fa-stethoscope", label: s, sub: specAbbr(s), value: s, keys: [s, specAbbr(s)] }));
  const order = ["Profissionais", "Salas", "Sala e ponto", "Especialidades"];
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}

/* ============================================================
   Cabeçalho da unidade
   ============================================================ */

export function headerCounts(rooms: Room[]) {
  const active = rooms.filter((r) => r.active);
  const professionals = new Set(rooms.flatMap((r) => r.servicePoints.flatMap((sp) => sp.periods.map((p) => p.professional).filter(Boolean))));
  return { roomsCount: active.length, professionalsCount: professionals.size };
}
