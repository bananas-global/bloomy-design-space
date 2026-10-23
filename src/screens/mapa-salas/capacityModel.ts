/**
 * Mapa de Salas — o modelo da visão Capacidade.
 *
 * Cruza a escala dos profissionais (os períodos de cada ponto) com o espaço
 * físico: cada linha é um ponto de atendimento, cada coluna uma hora do
 * funcionamento da unidade. O planejado não entra: a pergunta aqui é quanto
 * do espaço tem gente na escala.
 *
 * Mesmas regras do quadro do dia: os dias são os da unidade (`unitDays`), um
 * período vale no dia pela lista de dias e pela validade (`periodValidOn`) na
 * semana de hoje, e as salas inativas ficam de fora.
 */
import {
  TODAY_DATE,
  dateOf,
  mondayOf,
  periodDays,
  periodValidOn,
  professionalSpecialty,
  toISO,
  toMin,
  unitDays,
  type DayKey,
  type Period,
  type Room,
  type ServicePoint,
  type UnitShape,
} from "./model.js";

export type HourSlot = { h: number; from: number; to: number; /** Horas do funcionamento dentro da hora cheia. */ len: number };

/** Uma hora de um ponto num dia: o período que mais cobre a hora, e quanto cobre. */
export type CapacityCell = { professional: string | null; specialty: string; occ: number };

export type CapacityPoint = { room: Room; point: ServicePoint; first: boolean };

export type CapacityModel = {
  days: DayKey[];
  hours: HourSlot[];
  hoursPerDay: number;
  points: CapacityPoint[];
  /** `cells[ponto][dia][hora]`. */
  cells: Record<DayKey, CapacityCell[]>[];
};

const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

export function buildCapacity(unit: Pick<UnitShape, "serviceHour" | "rooms">): CapacityModel {
  const open = toMin(unit.serviceHour.start);
  const close = toMin(unit.serviceHour.end);
  const days = unitDays(unit);
  const monday = mondayOf(TODAY_DATE);

  const hours: HourSlot[] = [];
  for (let h = Math.floor(open / 60); h * 60 < close; h++) {
    const from = Math.max(h * 60, open);
    const to = Math.min(h * 60 + 60, close);
    hours.push({ h, from, to, len: (to - from) / 60 });
  }

  const points: CapacityPoint[] = [];
  [...unit.rooms]
    .filter((r) => r.active !== false)
    .sort((x, y) => x.number - y.number)
    .forEach((room) => room.servicePoints.forEach((point, i) => points.push({ room, point, first: i === 0 })));

  const cells = points.map(({ point }) => {
    const byDay = {} as Record<DayKey, CapacityCell[]>;
    days.forEach((day) => {
      const iso = toISO(dateOf(monday, day));
      const periods = point.periods.filter((p) => p.professional && periodDays(p, days).includes(day) && periodValidOn(p, iso));
      byDay[day] = hours.map((slot) => {
        let best: Period | null = null;
        let cov = 0;
        periods.forEach((p) => {
          const o = overlap(slot.from, slot.to, toMin(p.start), toMin(p.end));
          if (o > cov) {
            cov = o;
            best = p;
          }
        });
        const professional = best ? (best as Period).professional : null;
        return { professional, specialty: professional ? professionalSpecialty(professional) : "", occ: cov / 60 };
      });
    });
    return byDay;
  });

  return { days, hours, hoursPerDay: hours.reduce((s, x) => s + x.len, 0), points, cells };
}

/** Horas com profissional dos pontos `idx` (todos, se ausente) nos dias. */
export function occupiedHours(m: CapacityModel, days: DayKey[], idx?: number[], hour?: number) {
  let occ = 0;
  (idx ?? m.points.map((_, i) => i)).forEach((pi) =>
    days.forEach((d) => m.cells[pi]![d]!.forEach((c, hi) => {
      if (hour === undefined || hour === hi) occ += c.occ;
    })),
  );
  return occ;
}

/** Horas de cada profissional nos dias, da maior para a menor. */
export function professionalHours(m: CapacityModel, days: DayKey[]) {
  const by = new Map<string, number>();
  m.cells.forEach((byDay) => days.forEach((d) => byDay[d]!.forEach((c) => {
    if (c.professional) by.set(c.professional, (by.get(c.professional) ?? 0) + c.occ);
  })));
  return [...by].map(([name, h]) => ({ name, h })).filter((p) => p.h > 0).sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
}

/** Por sala com ponto: quantos pontos e a cobertura nos dias. */
export function roomRates(m: CapacityModel, days: DayKey[]) {
  const rooms = m.points.filter((p) => p.first).map((p) => p.room);
  return rooms.map((room) => {
    const idx = m.points.map((p, i) => (p.room.id === room.id ? i : -1)).filter((i) => i >= 0);
    const cap = idx.length * m.hoursPerDay * days.length;
    const occ = occupiedHours(m, days, idx);
    return { room, points: idx.length, rate: cap ? occ / cap : 0 };
  });
}

/** A ocupação de uma hora nos dias: horas com profissional ÷ capacidade da hora. */
export function hourRate(m: CapacityModel, days: DayKey[], hi: number) {
  const cap = m.points.length * days.length * m.hours[hi]!.len;
  return cap ? occupiedHours(m, days, undefined, hi) / cap : 0;
}

/** As faixas de ocupação: quanto mais cheio, mais perto do vermelho. */
export type Level = "blue" | "yellow" | "orange" | "red";
export const levelOf = (rate: number): Level => (rate >= 0.75 ? "red" : rate >= 0.5 ? "orange" : rate >= 0.25 ? "yellow" : "blue");

export const fmtHours = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
