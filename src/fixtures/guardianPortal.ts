import type { Fixture } from "@brucesantos/design-space";
import type { GuardianPlan, GuardianPortalData, GuardianSchedule } from "../contracts/index.js";

/**
 * Fixtures do portal do responsável legal.
 *
 * A Renata, mãe do Théo e do Noah — os mesmos pacientes do totem e da agenda.
 * Ver a mesma família dos dois lados é o que torna concreto o que a clínica
 * mostra e o que ela guarda para si: aqui não há tentativa, evolução nem
 * prontuário, só o combinado e o consentimento.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };
const NOAH = { id: "pac-noah", name: "Noah Andrade Lins", birthDate: "2022-05-19" };
const RENATA = { id: "resp-1", name: "Renata Andrade Lins" };

const TERMOS = {
  acceptedAt: "2025-03-11T20:14:00.000-03:00",
  ipAddress: "189.45.220.11",
  device: "iPhone · Safari 19",
};

function schedule(overrides: Partial<GuardianSchedule> & { id: string }): GuardianSchedule {
  return {
    patientName: THEO.name,
    start: "2026-07-30T10:00:00.000-03:00",
    end: "2026-07-30T11:00:00.000-03:00",
    professionalName: "Marina Okabe",
    serviceName: "Terapia ABA — individual",
    unitName: "Pinheiros",
    cancelled: false,
    ...overrides,
  };
}

const AGENDA: GuardianSchedule[] = [
  schedule({ id: "s1" }),
  schedule({
    id: "s2",
    start: "2026-07-30T11:00:00.000-03:00",
    end: "2026-07-30T12:00:00.000-03:00",
    professionalName: "Rui Sampaio Neto",
    serviceName: "Fonoaudiologia — individual",
  }),
  schedule({
    id: "s3",
    patientName: NOAH.name,
    start: "2026-08-04T09:00:00.000-03:00",
    end: "2026-08-04T10:00:00.000-03:00",
    professionalName: "Clara Vidigal",
    serviceName: "Psicologia — individual",
  }),
  schedule({
    id: "s4",
    start: "2026-08-06T10:00:00.000-03:00",
    end: "2026-08-06T11:00:00.000-03:00",
    cancelled: true,
  }),
];

function plan(overrides: Partial<GuardianPlan> & { id: string }): GuardianPlan {
  return {
    patient: THEO,
    name: "Plano de Ensino Individualizado — 2º semestre de 2026",
    startAt: "2026-07-01",
    endAt: "2026-12-31",
    expired: false,
    guardianApproved: false,
    goals: [
      {
        id: "m1",
        name: "Comunicação funcional",
        objectives: ["Pedir itens preferidos", "Nomear objetos do cotidiano"],
      },
      {
        id: "m2",
        name: "Autonomia e regulação",
        objectives: ["Tolerar espera por item preferido", "Imitar movimentos do modelo"],
      },
    ],
    ...overrides,
  };
}

const pendente = plan({
  id: "pei-2026-2",
  observation:
    "Elaborado com a equipe em 24/06. As metas foram conversadas na devolutiva de junho.",
});

const aceito = plan({
  id: "pei-2026-1",
  name: "Plano de Ensino Individualizado — 1º semestre de 2026",
  startAt: "2026-01-01",
  endAt: "2026-06-30",
  expired: true,
  guardianApproved: true,
  signature: "Renata Andrade Lins",
  signedAt: "2026-01-08",
  signedByGuardianId: RENATA.id,
});

const vencidoSemAceite = plan({
  id: "pei-2025-2",
  name: "Plano de Ensino Individualizado — 2º semestre de 2025",
  startAt: "2025-07-01",
  endAt: "2025-12-31",
  expired: true,
});

/** Plano de uma criança que não é dela: o cenário de link adivinhado. */
const deOutraFamilia = plan({
  id: "pei-outro",
  patient: { id: "pac-laura", name: "Laura Menendes Pinto", birthDate: "2017-12-02" },
  name: "Plano de Ensino Individualizado — 2º semestre de 2026",
});

function portal(overrides: Partial<GuardianPortalData> = {}): GuardianPortalData {
  return {
    guardian: RENATA,
    termsAcceptance: TERMOS,
    patients: [THEO, NOAH],
    schedules: AGENDA,
    plans: [pendente, aceito],
    now: NOW,
    ...overrides,
  };
}

export const guardianPortalFixtures: Fixture<GuardianPortalData>[] = [
  {
    id: "guardian-home",
    label: "Portal da família",
    description:
      "A Renata com dois filhos em atendimento, um plano esperando aceite e um horário cancelado na semana.",
    data: portal(),
  },
  {
    id: "guardian-plan-pending",
    label: "Plano esperando aceite",
    description: "O consentimento sobre o que vai ser ensinado ao Théo no segundo semestre.",
    data: portal({ plans: [pendente] }),
  },
  {
    id: "guardian-plan-accepted",
    label: "Plano já aceito",
    description: "Assinado em 08/01, com nome, data e qual responsável assinou.",
    data: portal({ plans: [aceito] }),
  },
  {
    id: "guardian-plan-expired",
    label: "Plano vencido sem aceite",
    description:
      "Terminou em dezembro e nunca foi assinado. Assinar agora seria consentir com nada.",
    data: portal({ plans: [vencidoSemAceite] }),
  },
  {
    id: "guardian-plan-other-family",
    label: "Plano de outra família",
    description: "O identificador de um plano que não é de paciente sob a responsabilidade dela.",
    data: portal({ plans: [deOutraFamilia] }),
  },
  {
    id: "guardian-terms-missing",
    label: "Termos ainda não aceitos",
    description: "Primeiro acesso, antes do aceite dos termos de uso.",
    data: portal({ termsAcceptance: undefined }),
  },
  {
    id: "guardian-empty",
    label: "Sem atendimentos marcados",
    description: "Cadastro feito, nenhum horário na agenda e nenhum plano montado.",
    data: portal({ schedules: [], plans: [] }),
  },
];

export const guardianIds = { renata: RENATA.id, theo: THEO.id, noah: NOAH.id } as const;
