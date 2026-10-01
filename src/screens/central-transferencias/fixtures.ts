/**
 * Central de Transferências — dados sintéticos e determinísticos.
 *
 * Dezesseis profissionais da unidade, cada um com a escala semanal e a sala
 * fixa, e os mapas de horas dos pacientes: uma carga realista (~25–40h
 * ocupadas por profissional, o mesmo horário em 2–3 dias) gerada a partir da
 * escala, mais quatro mapas sem profissional. Carolina Mattos (Fonoaudiologia)
 * acabou de entrar: escala cheia e nenhum paciente, então cobre o dia inteiro
 * de um titular. Hoje é `TODAY` (sexta, 21/08/2026). Nomes são
 * fictícios.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { HoursMap, Professional, ScheduledTransfer, Weekday } from "./model.js";

/** A data de referência do protótipo (sexta-feira). */
export const TODAY = "2026-08-21";

const WEEK: Weekday[] = [1, 2, 3, 4, 5];
const avail = (days: Weekday[], start: string, end: string) => days.map((wd) => ({ wd, start, end }));

type SeedProfessional = Professional & {
  /** Profissionais de apoio: ocupação ~67%, com folgas escalonadas entre si. */
  occ?: number;
  /** Recém-contratada: escala cheia e nenhum paciente ainda. */
  free?: boolean;
};

const PROFS_SEED: SeedProfessional[] = [
  { id: "p1", name: "Marina Costa", specialty: "Psicologia", room: "Sala 2", avail: avail(WEEK, "07:00", "13:00") },
  { id: "p2", name: "Rafael Lima", specialty: "Terapia Ocupacional", room: "Sala 4", avail: avail(WEEK, "08:00", "18:00") },
  { id: "p3", name: "Ana Beatriz", specialty: "Fonoaudiologia", room: "Sala 1", avail: avail(WEEK, "07:00", "12:00") },
  { id: "p4", name: "Camila Duarte", specialty: "Psicologia", room: "Sala 3", avail: avail(WEEK, "12:00", "19:00") },
  { id: "p5", name: "Débora Nogueira", specialty: "Fonoaudiologia", room: "Sala 1", avail: avail([2, 3, 4], "08:00", "17:00") },
  { id: "p6", name: "Thiago Rezende", specialty: "Terapia Ocupacional", room: "Sala 5", avail: avail([1, 3, 5], "07:00", "14:00") },
  { id: "p7", name: "Letícia Farias", specialty: "Psicopedagogia", room: "Sala 6", avail: avail(WEEK, "08:00", "16:00") },
  { id: "p8", name: "Renata Siqueira", specialty: "Psicologia", room: "Sala 7", occ: 0, avail: avail(WEEK, "07:00", "19:00") },
  { id: "p9", name: "Gustavo Prates", specialty: "Psicologia", room: "Sala 8", occ: 1, avail: avail(WEEK, "07:00", "16:00") },
  { id: "p10", name: "Paula Menezes", specialty: "Psicologia", room: "Sala 9", occ: 2, avail: avail(WEEK, "07:00", "14:00") },
  { id: "p11", name: "Vanessa Lobo", specialty: "Fonoaudiologia", room: "Sala 10", occ: 1, avail: avail(WEEK, "07:00", "17:00") },
  { id: "p12", name: "Henrique Sales", specialty: "Fonoaudiologia", room: "Sala 11", occ: 2, avail: avail(WEEK, "07:00", "17:00") },
  { id: "p13", name: "Bianca Torres", specialty: "Terapia Ocupacional", room: "Sala 12", occ: 0, avail: avail(WEEK, "07:00", "18:00") },
  { id: "p14", name: "Murilo Pacheco", specialty: "Terapia Ocupacional", room: "Sala 13", occ: 2, avail: avail(WEEK, "07:00", "18:00") },
  { id: "p15", name: "Sabrina Coelho", specialty: "Psicopedagogia", room: "Sala 14", occ: 1, avail: avail(WEEK, "07:00", "17:00") },
  { id: "p16", name: "Carolina Mattos", specialty: "Fonoaudiologia", room: "Sala 15", free: true, avail: avail(WEEK, "07:00", "19:00") },
];

export const PROFESSIONALS: Professional[] = PROFS_SEED.map(({ occ: _occ, free: _free, ...p }) => p);

const FIRST = ["Alice", "Bruno", "Caio", "Duda", "Enzo", "Flora", "Gabriel", "Helena", "Igor", "Júlia", "Lucas", "Manuela", "Nina", "Otávio", "Pietra", "Rafa", "Sofia", "Theo", "Valentina", "Yuri", "Lara", "Miguel", "Bia", "Arthur", "Clara", "Davi", "Eva", "Heitor", "Isabela", "Joaquim", "Lívia", "Noah", "Olívia", "Pedro", "Rebeca", "Samuel", "Tainá", "Vicente", "Zoe", "Benício"];
const LAST = ["Ribeiro", "Martins", "Ferreira", "Lopes", "Tavares", "Souza", "Pinto", "Vieira", "Nunes", "Almeida", "Moreira", "Rocha", "Barbosa", "Campos", "Cunha", "Teixeira", "Mendes", "Araújo", "Castro", "Monteiro"];

/**
 * A carga de cada profissional: um paciente por hora da escala em dois grupos
 * de dias (Seg/Qua/Sex e Ter/Qui), com folgas para sobrar espaço de destino.
 */
function baseSeed(): HoursMap[] {
  const out: HoursMap[] = [];
  let n = 0;
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  PROFS_SEED.forEach((p, pi) => {
    if (p.free) return;
    const days = p.avail.map((a) => a.wd);
    const groups =
      days.length >= 5
        ? [[1, 3, 5], [2, 4]] as Weekday[][]
        : [days.filter((_, i) => i % 2 === 0), days.filter((_, i) => i % 2 === 1)].filter((g) => g.length);
    const h0 = parseInt(p.avail[0]!.start, 10);
    const h1 = parseInt(p.avail[0]!.end, 10);
    for (let h = h0; h < h1; h++) {
      groups.forEach((g, gi) => {
        if (p.occ != null ? (h + gi + p.occ) % 3 === 0 : (h - h0 + pi + gi * 2) % 5 === 0) return;
        const name = `${FIRST[n % FIRST.length]} ${LAST[(n * 7 + Math.floor(n / FIRST.length)) % LAST.length]}`;
        n++;
        out.push({
          id: `b${n}`,
          patient: name,
          specialty: p.specialty,
          profId: p.id,
          since: `2026-0${1 + (n % 8)}-${String(1 + ((n * 3) % 27)).padStart(2, "0")}`,
          slots: g.map((wd) => ({ wd, start: pad(h), end: pad(h + 1) })),
        });
      });
    }
  });
  return out;
}

export const HOURS_MAPS: HoursMap[] = [
  ...baseSeed(),
  { id: "m8", patient: "Helena Vieira", specialty: "Psicologia", profId: null, since: "2026-08-03", left: "Juliana Prado", reason: "profissional inativado em 03/08", slots: [{ wd: 2, start: "08:00", end: "09:00" }, { wd: 4, start: "08:00", end: "09:00" }] },
  { id: "m9", patient: "Igor Nunes", specialty: "Fonoaudiologia", profId: null, since: "2026-07-28", left: "Juliana Prado", reason: "profissional inativado em 28/07", slots: [{ wd: 3, start: "09:00", end: "10:00" }] },
  { id: "m10", patient: "Júlia Almeida", specialty: "Terapia Ocupacional", profId: null, since: "2026-08-14", left: "Rafael Lima", reason: "escala alterada em 14/08", slots: [{ wd: 5, start: "13:00", end: "14:00" }, { wd: 5, start: "14:00", end: "15:00" }] },
  { id: "m14", patient: "Otávio Campos", specialty: "Psicopedagogia", profId: null, since: "2026-08-18", left: "Letícia Farias", reason: "mapa criado sem profissional", slots: [{ wd: 1, start: "15:00", end: "16:00" }] },
];

/** A transferência já programada: um horário de Flora Souza, de Rafael Lima para Thiago Rezende, em 01/09. */
export const SCHEDULED: ScheduledTransfer[] = [
  {
    id: "sc-seed",
    date: "2026-09-01",
    originId: "p2",
    originName: "Rafael Lima",
    createdAt: "2026-08-19",
    why: "",
    items: [{ mapId: "m6", patient: "Flora Souza", specialty: "Terapia Ocupacional", s: { wd: 1, start: "10:00", end: "11:00" }, pid: "p6" }],
  },
];

export type TransferCenterFixture = { professionals: Professional[]; maps: HoursMap[]; scheduled: ScheduledTransfer[] };

export const TRANSFER_CENTER_FIXTURES: Fixture<TransferCenterFixture>[] = [
  {
    id: "transfer-center.unit",
    label: "Unidade Teste · dezesseis profissionais e seus mapas de horas",
    description:
      "Dezesseis profissionais com escala e sala fixa (uma recém-contratada, sem pacientes), os mapas de horas dos pacientes (carga de 25–40h por profissional), quatro mapas sem profissional e uma transferência programada para 01/09.",
    data: () => ({ professionals: PROFESSIONALS, maps: HOURS_MAPS, scheduled: SCHEDULED }),
  },
];
