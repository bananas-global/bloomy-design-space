import type { Fixture } from "@brucesantos/design-space";
import type {
  DaySchedule,
  InClinicData,
  PatientPresence,
  ProfessionalPresence,
} from "../contracts/index.js";

/**
 * Fixtures do quadro da unidade.
 *
 * Uma terça-feira de manhã na unidade Pinheiros: quatro pacientes, três
 * profissionais, e as três situações que a recepção precisa distinguir de
 * relance — quem está pronto, quem chegou atrasado e quem já saiu.
 *
 * O relógio da situação é 09:40, escolhido para ficar entre horários: o
 * agendamento das 09:00 já passou, o das 10:00 ainda não. É essa posição que
 * torna verificável o efeito do check-in.
 */

const UNIDADE = { id: "un-pinheiros", name: "Pinheiros" };
const NOW = "2026-07-30T09:40:00.000-03:00";

const MARINA = { id: "prof-marina", name: "Marina Okabe", specialty: "Aplicador ABA" };
const CLARA = { id: "prof-clara", name: "Clara Vidigal", specialty: "Psicologia" };
const RUI = { id: "prof-rui", name: "Rui Sampaio Neto", specialty: "Fonoaudiologia" };

function schedule(
  overrides: Partial<DaySchedule> & { id: string; start: string; end: string },
): DaySchedule {
  return {
    status: "scheduled",
    professionalName: MARINA.name,
    serviceName: "Terapia ABA — individual",
    ...overrides,
  };
}

/* =========================================================== pacientes */

/** Chegou antes do horário: o agendamento das 10h ficou pronto. */
const theo: PatientPresence = {
  id: "sr-1",
  patient: { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
  checkinAt: "2026-07-30T09:32:00.000-03:00",
  checkinBy: "web",
  schedules: [
    schedule({
      id: "agd-theo-1",
      start: "2026-07-30T10:00:00.000-03:00",
      end: "2026-07-30T11:00:00.000-03:00",
      status: "ready_for_service",
    }),
    schedule({
      id: "agd-theo-2",
      start: "2026-07-30T11:00:00.000-03:00",
      end: "2026-07-30T12:00:00.000-03:00",
      status: "ready_for_service",
      professionalName: RUI.name,
      serviceName: "Fonoaudiologia — individual",
    }),
  ],
};

/** Chegou depois do horário: o das 09:00 virou atrasado. */
const isadora: PatientPresence = {
  id: "sr-2",
  patient: { id: "pac-isadora", name: "Isadora Bueno Ramalho", birthDate: "2018-03-21" },
  checkinAt: "2026-07-30T09:24:00.000-03:00",
  checkinBy: "admin",
  observation: "Responsável avisou que o trânsito atrasou. Pediu para manter o horário seguinte.",
  schedules: [
    schedule({
      id: "agd-isa-1",
      start: "2026-07-30T09:00:00.000-03:00",
      end: "2026-07-30T10:00:00.000-03:00",
      status: "delayed",
      professionalName: CLARA.name,
      serviceName: "Psicologia — individual",
    }),
  ],
};

/** Em atendimento agora: nada a fazer, e o quadro não deve alarmar. */
const benicio: PatientPresence = {
  id: "sr-3",
  patient: { id: "pac-benicio", name: "Benício Tavares Rocha", birthDate: "2020-06-15" },
  checkinAt: "2026-07-30T08:52:00.000-03:00",
  checkinBy: "app",
  schedules: [
    schedule({
      id: "agd-ben-1",
      start: "2026-07-30T09:00:00.000-03:00",
      end: "2026-07-30T10:00:00.000-03:00",
      status: "ongoing",
      professionalName: MARINA.name,
    }),
  ],
};

/** Já saiu: fica no quadro do dia, mas fora de quem está na unidade. */
const laura: PatientPresence = {
  id: "sr-4",
  patient: { id: "pac-laura", name: "Laura Menendes Pinto", birthDate: "2017-12-02" },
  checkinAt: "2026-07-30T07:50:00.000-03:00",
  checkinBy: "web",
  checkoutAt: "2026-07-30T09:05:00.000-03:00",
  checkoutBy: "web",
  schedules: [
    schedule({
      id: "agd-laura-1",
      start: "2026-07-30T08:00:00.000-03:00",
      end: "2026-07-30T09:00:00.000-03:00",
      status: "finished",
      professionalName: RUI.name,
      serviceName: "Fonoaudiologia — individual",
    }),
  ],
};

/** Presente e sem nada pronto: é o caso que exige alguém agir. */
const semAtendimento: PatientPresence = {
  id: "sr-5",
  patient: { id: "pac-noah", name: "Noah Rivas Camargo", birthDate: "2019-04-30" },
  checkinAt: "2026-07-30T09:30:00.000-03:00",
  checkinBy: "web",
  schedules: [],
};

/* ======================================================= profissionais */

const profissionais: ProfessionalPresence[] = [
  {
    id: "ch-1",
    professional: MARINA,
    checkinAt: "2026-07-30T08:40:00.000-03:00",
    openSessions: 1,
  },
  {
    id: "ch-2",
    professional: CLARA,
    checkinAt: "2026-07-30T08:55:00.000-03:00",
    openSessions: 0,
  },
  {
    id: "ch-3",
    professional: RUI,
    checkinAt: "2026-07-30T07:45:00.000-03:00",
    checkoutAt: "2026-07-30T09:10:00.000-03:00",
    openSessions: 0,
  },
];

export const inClinicFixtures: Fixture<InClinicData>[] = [
  {
    id: "in-clinic-morning",
    label: "Manhã de terça na unidade",
    description:
      "Quatro pacientes com check-in, um já com check-out, e três profissionais. Relógio em 09:40, entre o horário das 9h e o das 10h.",
    data: {
      unit: UNIDADE,
      now: NOW,
      patients: [theo, isadora, benicio, laura],
      professionals: profissionais,
    },
  },
  {
    id: "in-clinic-nothing-ready",
    label: "Paciente na unidade sem atendimento pronto",
    description:
      "Chegou às 09:30 e não há agendamento em Pronto. É a combinação que exige alguém agir agora.",
    data: {
      unit: UNIDADE,
      now: NOW,
      patients: [semAtendimento, isadora],
      professionals: profissionais.slice(0, 2),
    },
  },
  {
    id: "in-clinic-duplicate-checkin",
    label: "Tentativa de segundo check-in",
    description:
      "O Théo já está na unidade desde 09:32. Um novo check-in para ele precisa ser recusado, dizendo desde quando.",
    data: {
      unit: UNIDADE,
      now: NOW,
      patients: [theo],
      professionals: profissionais.slice(0, 1),
    },
  },
  {
    id: "in-clinic-empty",
    label: "Unidade vazia",
    description: "Ninguém com check-in ativo. É o estado das sete da manhã e o das sete da noite.",
    data: { unit: UNIDADE, now: "2026-07-30T07:10:00.000-03:00", patients: [], professionals: [] },
  },
];

export const inClinicPeople = { marina: MARINA, clara: CLARA, rui: RUI } as const;
