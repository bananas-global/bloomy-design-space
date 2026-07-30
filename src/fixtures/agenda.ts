import type { Fixture } from "@brucesantos/design-space";
import type { AgendaData, Appointment, Professional, Unit } from "../contracts/index.js";
import { TODAY } from "../contracts/index.js";
import { findConflicts } from "../rules/agenda.js";

/**
 * Fixtures da agenda.
 *
 * Sintéticas, determinísticas e sanitizadas. Nenhum nome, CPF, telefone ou
 * procedimento vem de registro real — e nenhuma data é calculada a partir do
 * relógio, porque a mesma URL precisa produzir a mesma situação amanhã.
 */

const unit: Unit = { id: "u-centro", name: "Unidade Centro" };

const professional: Professional = {
  id: "p-1",
  name: "Dra. Helena Braga",
  specialty: "Clínica geral",
};

/** `HH:MM` na data de referência, para manter as fixtures legíveis. */
const at = (time: string) => `${TODAY}T${time}:00.000-03:00`;

function appointment(overrides: Partial<Appointment> & Pick<Appointment, "id" | "patient" | "start" | "end">): Appointment {
  return {
    professional,
    procedure: "Consulta de retorno",
    status: "scheduled",
    room: "Sala 2",
    ...overrides,
  };
}

const patients = {
  ana: { id: "pt-1", name: "Ana Moreira", birthDate: "1988-04-12" },
  caio: { id: "pt-2", name: "Caio Ribeiro", birthDate: "1995-11-03" },
  marina: { id: "pt-3", name: "Marina Lopes", birthDate: "1972-01-25" },
  tiago: { id: "pt-4", name: "Tiago Ferraz", birthDate: "2011-09-08" },
  julia: { id: "pt-5", name: "Júlia Prado", birthDate: "1966-06-30" },
  pedro: { id: "pt-6", name: "Pedro Antunes", birthDate: "2001-02-17" },
} as const;

/* ------------------------------------------------------------------ *
 * Dia normal
 * ------------------------------------------------------------------ */

const standardDay: Appointment[] = [
  appointment({
    id: "ap-101",
    patient: patients.ana,
    start: at("08:00"),
    end: at("08:30"),
    status: "finished",
    procedure: "Consulta de rotina",
    insurance: { name: "Unimed", authorized: true },
  }),
  appointment({
    id: "ap-102",
    patient: patients.caio,
    start: at("08:30"),
    end: at("09:00"),
    status: "in_session",
    procedure: "Avaliação inicial",
  }),
  appointment({
    id: "ap-103",
    patient: patients.marina,
    start: at("09:00"),
    end: at("09:30"),
    status: "confirmed",
    procedure: "Retorno de exame",
    insurance: { name: "Bradesco Saúde", authorized: true },
  }),
  appointment({
    id: "ap-104",
    patient: patients.tiago,
    start: at("09:30"),
    end: at("10:00"),
    status: "scheduled",
    procedure: "Consulta pediátrica",
  }),
  appointment({
    id: "ap-105",
    patient: patients.julia,
    start: at("10:00"),
    end: at("10:45"),
    status: "scheduled",
    procedure: "Consulta de rotina",
    insurance: { name: "SulAmérica", authorized: false },
  }),
  appointment({
    id: "ap-106",
    patient: patients.pedro,
    start: at("11:00"),
    end: at("11:30"),
    status: "scheduled",
  }),
];

/* ------------------------------------------------------------------ *
 * Conflito de horário
 * ------------------------------------------------------------------ */

/**
 * Duas consultas sobrepostas para a mesma profissional às 10:00.
 *
 * O conflito é calculado pela regra, não escrito à mão: uma fixture que declara
 * `conflictsWith` manualmente pode discordar da implementação, e nesse caso a
 * tela mostraria um conflito que a regra não reconhece.
 */
const conflictingDay: Appointment[] = withConflicts([
  ...standardDay.slice(0, 4),
  appointment({
    id: "ap-105",
    patient: patients.julia,
    start: at("10:00"),
    end: at("10:45"),
    status: "confirmed",
    procedure: "Consulta de rotina",
    insurance: { name: "SulAmérica", authorized: false },
  }),
  appointment({
    id: "ap-107",
    patient: patients.pedro,
    start: at("10:15"),
    end: at("11:00"),
    status: "scheduled",
    procedure: "Encaixe por urgência",
    room: "Sala 2",
  }),
]);

/* ------------------------------------------------------------------ *
 * Cancelamento e ausência
 * ------------------------------------------------------------------ */

const dayWithCancellation: Appointment[] = [
  ...standardDay.slice(0, 4),
  appointment({
    id: "ap-105",
    patient: patients.julia,
    start: at("10:00"),
    end: at("10:45"),
    status: "cancelled",
    procedure: "Consulta de rotina",
    cancellation: {
      reason: "Paciente remarcou por conflito de trabalho.",
      by: "Recepção — Bianca",
      at: at("07:42"),
    },
  }),
  standardDay[5]!,
];

const dayWithAbsence: Appointment[] = [
  ...standardDay.slice(0, 3),
  appointment({
    id: "ap-104",
    patient: patients.tiago,
    start: at("09:30"),
    end: at("10:00"),
    status: "no_show",
    procedure: "Consulta pediátrica",
  }),
  ...standardDay.slice(4),
];

/* ------------------------------------------------------------------ *
 * Registro
 * ------------------------------------------------------------------ */

function agenda(appointments: Appointment[], now: string): AgendaData {
  return { date: TODAY, now, unit, professional, appointments };
}

function withConflicts(appointments: Appointment[]): Appointment[] {
  const conflicts = findConflicts(appointments);
  return appointments.map((item) => {
    const found = conflicts.get(item.id);
    return found ? { ...item, conflictsWith: found } : item;
  });
}

export const agendaFixtures: Fixture<AgendaData>[] = [
  {
    id: "agenda-day",
    label: "Agenda do dia, sem conflito",
    description: "Seis atendimentos, do finalizado ao agendado. É o dia que funciona.",
    data: agenda(standardDay, at("09:10")),
  },
  {
    id: "agenda-double-booking",
    label: "Agenda com conflito às 10:00",
    description:
      "Encaixe por urgência sobrepõe uma consulta confirmada da mesma profissional.",
    data: agenda(conflictingDay, at("09:10")),
  },
  {
    id: "agenda-cancelled",
    label: "Agenda com atendimento cancelado",
    description: "Cancelamento com justificativa registrada e autoria.",
    data: agenda(dayWithCancellation, at("09:10")),
  },
  {
    id: "agenda-no-show-window",
    label: "Agenda dentro da tolerância de ausência",
    description:
      "Atendimento das 09:30 com o relógio em 09:38: sete minutos de tolerância restantes.",
    data: agenda(standardDay, at("09:38")),
  },
  {
    id: "agenda-no-show-elapsed",
    label: "Agenda com ausência já registrada",
    description: "Tolerância vencida e ausência confirmada, com o relógio em 10:05.",
    data: agenda(dayWithAbsence, at("10:05")),
  },
  {
    id: "agenda-empty",
    label: "Agenda vazia",
    description: "Dia sem atendimento marcado. Estado vazio é situação, não erro.",
    data: agenda([], at("09:10")),
  },
];

export { patients as agendaPatients, professional as agendaProfessional };
