import type { Fixture } from "@brucesantos/design-space";
import type { AttendanceRow, HealthCare, InsurerPortalData } from "../contracts/index.js";

/**
 * Fixtures do portal da operadora.
 *
 * A mesma competência de julho da Bradesco Saúde que aparece no módulo de
 * Faturas, agora vista do outro lado do balcão. Ver as duas telas em sequência é
 * o que torna concreta a conciliação: a clínica cobra o que faturou, a operadora
 * confere o que está na lista de presença.
 *
 * A fixture inclui de propósito dois atendimentos que aconteceram e ainda não
 * fecharam, e um agendamento incompleto omitido pelo escopo — as duas coisas que
 * fazem os números não baterem.
 */

const NOW = "2026-08-01T09:00:00.000-03:00";

const BRADESCO: HealthCare = {
  id: "op-bradesco",
  name: "Bradesco Saúde",
  ansRegister: "005711",
  cnpj: "11.222.333/0001-44",
  providerCode: "PRT-9081",
  requesterCode: "SOL-4417",
  skipEligibility: false,
  planTypes: ["Efetivo Pleno", "Nacional Flex"],
};

function row(overrides: Partial<AttendanceRow> & { id: string }): AttendanceRow {
  return {
    date: "2026-07-06",
    start: "2026-07-06T14:00:00.000-03:00",
    end: "2026-07-06T15:00:00.000-03:00",
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    professionalRegister: "CRP 06/000000",
    serviceName: "Terapia ABA — individual",
    status: "finished",
    signedBy: "Marina Okabe",
    signedAt: "2026-07-06T15:12:00.000-03:00",
    ...overrides,
  };
}

const PRESENCA: AttendanceRow[] = [
  row({ id: "a1" }),
  row({
    id: "a2",
    date: "2026-07-08",
    start: "2026-07-08T14:00:00.000-03:00",
    end: "2026-07-08T15:00:00.000-03:00",
  }),
  row({
    id: "a3",
    date: "2026-07-13",
    start: "2026-07-13T14:00:00.000-03:00",
    end: "2026-07-13T15:00:00.000-03:00",
    status: "missed",
    signedBy: undefined,
    signedAt: undefined,
  }),
  row({
    id: "a4",
    date: "2026-07-15",
    start: "2026-07-15T14:00:00.000-03:00",
    end: "2026-07-15T15:00:00.000-03:00",
    status: "cancelled",
    signedBy: undefined,
    signedAt: undefined,
  }),
  // Aconteceu e ainda não fechou: não conta hoje, vai contar depois.
  row({
    id: "a5",
    date: "2026-07-27",
    start: "2026-07-27T14:00:00.000-03:00",
    end: "2026-07-27T15:00:00.000-03:00",
    status: "pending_signature",
    signedBy: undefined,
    signedAt: undefined,
  }),
  row({
    id: "a6",
    date: "2026-07-29",
    start: "2026-07-29T14:00:00.000-03:00",
    end: "2026-07-29T15:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedBy: "Marina Okabe",
    signedAt: "2026-07-29T15:10:00.000-03:00",
  }),
  row({
    id: "a7",
    patientName: "Isadora Bueno Ramalho",
    professionalName: "Clara Vidigal",
    professionalRegister: "CRP 06/000001",
    serviceName: "Psicologia — individual",
    date: "2026-07-09",
    start: "2026-07-09T09:00:00.000-03:00",
    end: "2026-07-09T10:00:00.000-03:00",
    signedBy: "Clara Vidigal",
    signedAt: "2026-07-09T10:08:00.000-03:00",
  }),
];

function portal(overrides: Partial<InsurerPortalData> = {}): InsurerPortalData {
  return {
    healthCare: BRADESCO,
    period: { start: "2026-07-01", end: "2026-07-31" },
    patients: [
      {
        patient: { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
        planName: "Efetivo Pleno",
        cardNumber: "0000 0000 0000 0001",
        attendedSessions: 3,
        missedSessions: 1,
      },
      {
        patient: { id: "pac-isadora", name: "Isadora Bueno Ramalho", birthDate: "2018-03-21" },
        planName: "Nacional Flex",
        cardNumber: "0000 0000 0000 0002",
        attendedSessions: 1,
        missedSessions: 0,
      },
    ],
    attendance: PRESENCA,
    hiddenIncompleteCount: 2,
    now: NOW,
    ...overrides,
  };
}

export const insurerPortalFixtures: Fixture<InsurerPortalData>[] = [
  {
    id: "insurer-attendance",
    label: "Lista de presença de julho",
    description:
      "Sete linhas: três realizadas, uma falta, um cancelamento e dois atendimentos que aconteceram e ainda não fecharam.",
    data: portal(),
  },
  {
    id: "insurer-pending-closure",
    label: "Atendimentos que ainda não fecharam",
    description:
      "Só as duas linhas pendentes de assinatura. Aconteceram, não contam hoje, e vão contar depois.",
    data: portal({
      attendance: PRESENCA.filter((item) => item.status.startsWith("pending")),
      hiddenIncompleteCount: 0,
    }),
  },
  {
    id: "insurer-hidden-incomplete",
    label: "Agendamentos omitidos pelo escopo",
    description:
      "Dois agendamentos incompletos do período que o `scope/2` esconde sem avisar. É a omissão que impede conciliar.",
    data: portal({ hiddenIncompleteCount: 2 }),
  },
  {
    id: "insurer-empty",
    label: "Nenhum atendimento no período",
    description: "Competência sem movimento para os beneficiários desta operadora.",
    data: portal({ attendance: [], hiddenIncompleteCount: 0, patients: [] }),
  },
];
