/**
 * Panorama de vagas — o modelo do plano de contratação (visão nova, sem
 * equivalente no Phoenix; vem do protótipo do Claude Design).
 *
 * Por especialidade e por horário da semana (dias × horas do funcionamento):
 * - oferta: profissionais com a hora livre na agenda padrão
 *   (`inProfessionalHour`), dos perfis Terapeuta, Aplicador e Especialista;
 * - demanda: os Incompletos (agendamento sem profissional) e as sessões com
 *   profissional TBD (vaga ainda não contratada);
 * - em cada horário, a equipe cobre min(oferta, demanda), Incompletos antes de
 *   TBD; o que passa da oferta é falta, o que sobra fica para os leads;
 * - leads: as horas pedidas por especialidade entram, do mais avançado no
 *   funil para o menos, nas sobras dentro da disponibilidade da família; o
 *   que não encaixa também é falta.
 */
import type { Lead, LeadStatus, Specialty, UnitMapData, Weekday } from "./fixtures.js";
import { DEFAULT_PROFESSIONAL_TYPES, inProfessionalHour, openWeekdays, unitHours } from "./model.js";

/** Horas semanais de referência para converter falta em profissionais. */
export const FTE = 30;

export type DemandType = "inc" | "tbd";

export const DEMAND_TYPES: { id: DemandType; label: string; short: string; icon: string }[] = [
  { id: "inc", label: "Incompletos", short: "Incompleto", icon: "fa-user-slash" },
  { id: "tbd", label: "TBD", short: "TBD", icon: "fa-user-clock" },
];

/** As etapas do funil do CRM, sem Perdido, na ordem. */
export const LEAD_STAGES: { id: LeadStatus; label: string }[] = [
  { id: "novo", label: "Novo Lead" },
  { id: "contato", label: "Em Contato" },
  { id: "avaliacao", label: "Qualificação" },
  { id: "agendada", label: "Agendamento de Visita" },
  { id: "proposta", label: "Validação Técnica" },
  { id: "aguardando", label: "Aceite" },
];
const STAGE_ORDER = LEAD_STAGES.map((s) => s.id as string);

/** Especialidade do lead → especialidade do mapa (ABA fica em Psicologia). */
const LEAD_SPEC: Record<string, Specialty> = {
  Psicologia: "psychology",
  "Análise do Comportamento": "psychology",
  Fonoaudiologia: "phonoaudiology",
  "Terapia Ocupacional": "occupational_therapy",
  Psicopedagogia: "psychopedagogy",
  Fisioterapia: "physiotherapy",
};
const LEAD_DAY: Record<string, Weekday> = { "Segunda-Feira": 1, "Terça-Feira": 2, "Quarta-Feira": 3, "Quinta-Feira": 4, "Sexta-Feira": 5 };

export const PERIODS = [
  { id: "m", label: "Manhã", test: (h: number) => h < 12 },
  { id: "t", label: "Tarde", test: (h: number) => h >= 12 },
];

const key = (weekday: Weekday, hour: number) => `${weekday}-${hour}`;

export type DemandItem = { id: string; type: DemandType; patient: string };

export type Slot = {
  weekday: Weekday;
  hour: number;
  free: { id: string; name: string }[];
  dem: DemandItem[];
  cover: number;
  gap: number;
  coverInc: number;
  coverTbd: number;
  gapInc: number;
  gapTbd: number;
  left: number;
  leadsIn: string[];
  leadsOut: string[];
};

export type SpecialtyModel = {
  slots: Map<string, Slot>;
  byType: Record<DemandType, number>;
  offer: number;
  demand: number;
  cover: number;
  gap: number;
  coverInc: number;
  coverTbd: number;
  gapInc: number;
  gapTbd: number;
  leadNeed: number;
  leadFit: number;
  leadOut: number;
  leadNoWin: number;
  surplus: number;
  need: number;
  blocks: { weekday: Weekday; period: (typeof PERIODS)[number]; hrs: number; from: number; to: number }[];
};

export const leadSlots = (data: UnitMapData, lead: Lead) =>
  lead.availability.flatMap((w) => {
    const weekday = LEAD_DAY[w.day];
    if (weekday == null) return [];
    const hours = unitHours(data).filter((h) => h >= parseInt(w.from, 10) && h < parseInt(w.to, 10));
    return hours.map((h) => key(weekday, h));
  });

export const activeLeads = (data: UnitMapData, fromStage: LeadStatus) =>
  data.leads.filter((l) => l.status !== "perdido" && STAGE_ORDER.indexOf(l.status) >= STAGE_ORDER.indexOf(fromStage));

/** A oferta: profissionais ativos dos perfis de atendimento, com ou sem as vagas TBD. */
export const offerProfessionals = (data: UnitMapData, includeTbd: boolean) =>
  data.professionals.filter(
    (p) => p.active && p.types.some((t) => DEFAULT_PROFESSIONAL_TYPES.includes(t)) && (includeTbd || !p.tbd),
  );

/** A demanda da semana: Incompletos e sessões em vaga TBD, por especialidade e horário. */
export function demandItems(data: UnitMapData) {
  const tbd = new Set(data.professionals.filter((p) => p.tbd).map((p) => p.id));
  return data.schedules.flatMap((s) => {
    const type: DemandType | null =
      s.status === "incomplete" && s.professionalId == null ? "inc" : s.professionalId && tbd.has(s.professionalId) ? "tbd" : null;
    const specialty = data.services.find((x) => x.id === s.serviceId)?.specialty;
    if (!type || !specialty) return [];
    const patient = data.patients.find((p) => p.id === s.patientId)?.name ?? "-";
    return [{ id: s.id, type, specialty, weekday: s.weekday, hour: s.hour, patient }];
  });
}

export function panoramaModel(
  data: UnitMapData,
  specialties: Specialty[],
  { includeTbd, types, useLeads, fromStage }: { includeTbd: boolean; types: DemandType[]; useLeads: boolean; fromStage: LeadStatus },
) {
  const weekdays = openWeekdays(data);
  const hours = unitHours(data);
  const professionals = offerProfessionals(data, includeTbd);
  const demand = demandItems(data);
  const m = {} as Record<Specialty, SpecialtyModel>;

  for (const specialty of specialties) {
    const slots = new Map<string, Slot>();
    const pool = professionals.filter((p) => p.specialty === specialty);
    for (const weekday of weekdays) {
      for (const hour of hours) {
        const free = pool.filter((p) => inProfessionalHour(data, p, weekday, hour)).map((p) => ({ id: p.id, name: p.name }));
        const dem = demand.filter((x) => x.specialty === specialty && x.weekday === weekday && x.hour === hour && types.includes(x.type));
        const ni = dem.filter((x) => x.type === "inc").length;
        const nt = dem.length - ni;
        const ci = Math.min(free.length, ni);
        const ct = Math.min(free.length - ci, nt);
        slots.set(key(weekday, hour), {
          weekday, hour, free, dem,
          cover: Math.min(free.length, dem.length),
          gap: Math.max(0, dem.length - free.length),
          coverInc: ci, coverTbd: ct, gapInc: ni - ci, gapTbd: nt - ct,
          left: Math.max(0, free.length - dem.length),
          leadsIn: [], leadsOut: [],
        });
      }
    }
    const byType = Object.fromEntries(
      DEMAND_TYPES.map((t) => [t.id, demand.filter((x) => x.specialty === specialty && x.type === t.id && types.includes(t.id)).length]),
    ) as Record<DemandType, number>;
    m[specialty] = { slots, byType, leadNeed: 0, leadFit: 0, leadNoWin: 0 } as SpecialtyModel;
  }

  if (useLeads) {
    const leads = activeLeads(data, fromStage).sort((a, b) => STAGE_ORDER.indexOf(b.status) - STAGE_ORDER.indexOf(a.status));
    for (const lead of leads) {
      const win = leadSlots(data, lead);
      for (const ls of lead.specialties) {
        const sid = LEAD_SPEC[ls.spec];
        const need = ls.hours;
        if (!sid || !m[sid] || !need) continue;
        let got = 0;
        const used = new Set<string>();
        for (const k of win) {
          const x = m[sid].slots.get(k);
          if (got < need && x && x.left > 0) {
            x.left--;
            x.leadsIn.push(lead.child);
            used.add(k);
            got++;
          }
        }
        let rest = need - got;
        for (const k of win) {
          const x = m[sid].slots.get(k);
          if (rest > 0 && x && !used.has(k)) {
            x.leadsOut.push(lead.child);
            rest--;
          }
        }
        m[sid].leadNeed += need;
        m[sid].leadFit += got;
        m[sid].leadNoWin += rest;
      }
    }
  }

  for (const specialty of specialties) {
    const x = m[specialty];
    const v = [...x.slots.values()];
    const sum = (f: (y: Slot) => number) => v.reduce((n, y) => n + f(y), 0);
    Object.assign(x, {
      offer: sum((y) => y.free.length), demand: sum((y) => y.dem.length), cover: sum((y) => y.cover), gap: sum((y) => y.gap),
      coverInc: sum((y) => y.coverInc), coverTbd: sum((y) => y.coverTbd), gapInc: sum((y) => y.gapInc), gapTbd: sum((y) => y.gapTbd),
      leadOut: sum((y) => y.leadsOut.length), surplus: sum((y) => y.left),
    });
    x.need = x.gap + x.leadOut + x.leadNoWin;
    x.blocks = [];
    for (const weekday of weekdays) {
      for (const period of PERIODS) {
        const hs = hours.filter(period.test).filter((h) => {
          const y = x.slots.get(key(weekday, h))!;
          return y.gap + y.leadsOut.length > 0;
        });
        if (!hs.length) continue;
        const hrs = hs.reduce((n, h) => {
          const y = x.slots.get(key(weekday, h))!;
          return n + y.gap + y.leadsOut.length;
        }, 0);
        x.blocks.push({ weekday, period, hrs, from: Math.min(...hs), to: Math.max(...hs) + 1 });
      }
    }
  }
  return m;
}

export const slotOf = (x: SpecialtyModel, weekday: Weekday, hour: number) => x.slots.get(key(weekday, hour))!;

/** Horas por especialidade de cada fonte, para os cartões da composição. */
export function composition(data: UnitMapData, includeTbd: boolean) {
  const offerBy: Partial<Record<Specialty, number>> = {};
  const tbdProfBy: Partial<Record<Specialty, number>> = {};
  const hours = unitHours(data);
  for (const p of offerProfessionals(data, true)) {
    const n = openWeekdays(data).reduce((t, d) => t + hours.filter((h) => inProfessionalHour(data, p, d, h)).length, 0);
    if (p.tbd) tbdProfBy[p.specialty] = (tbdProfBy[p.specialty] ?? 0) + n;
    if (!p.tbd || includeTbd) offerBy[p.specialty] = (offerBy[p.specialty] ?? 0) + n;
  }
  const typeBy = (t: DemandType) => {
    const o: Partial<Record<Specialty, number>> = {};
    for (const x of demandItems(data).filter((x) => x.type === t)) o[x.specialty] = (o[x.specialty] ?? 0) + 1;
    return o;
  };
  const stageRows = LEAD_STAGES.map((st) => {
    const by: Partial<Record<Specialty, number>> = {};
    const leads = data.leads.filter((l) => l.status === st.id);
    for (const l of leads) {
      for (const ls of l.specialties) {
        const sid = LEAD_SPEC[ls.spec];
        if (sid && ls.hours) by[sid] = (by[sid] ?? 0) + ls.hours;
      }
    }
    return { stage: st, by, n: leads.length, total: Object.values(by).reduce((a, b) => a + b, 0) };
  });
  return { offerBy, tbdProfBy, incBy: typeBy("inc"), tbdBy: typeBy("tbd"), stageRows };
}

export const isFromStage = (stage: LeadStatus, fromStage: LeadStatus) => STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(fromStage);
