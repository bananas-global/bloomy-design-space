import type { Fixture } from "@brucesantos/design-space";
import type { TeamData, TeamMember } from "../contracts/index.js";

/**
 * Fixtures da equipe.
 *
 * As mesmas pessoas das fixtures de atendimento e fechamento, agora vistas pelo
 * cadastro. É de propósito: o vínculo de supervisão da Marina com a Clara é o
 * que faz a sessão dela exigir segunda assinatura, e o contrato do Rui é o que
 * faz o fechamento dele pular a nota fiscal. Ver os dois lados fecha o
 * raciocínio.
 *
 * CPFs têm dígito verificador inválido de propósito. Registros de conselho são
 * sintéticos.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

/** Terapeuta em estágio: é dela a sessão que exige assinatura da supervisora. */
const marina: TeamMember = {
  id: "prof-marina",
  name: "Marina Okabe",
  tbd: false,
  specialty: "Aplicador ABA",
  email: "marina.okabe@exemplo.test",
  cpf: "000.111.222-00",
  phone: "(11) 90000-0011",
  birthDate: "1996-02-14",
  specialtyRegister: "CRP 06/000000",
  formation: "Psicologia",
  healthFormation: "Psicologia (CRP)",
  professionalTypes: ["therapeutic_companion"],
  userTypes: [],
  appliesProtocol: false,
  isAt: false,
  active: true,
  units: ["Pinheiros"],
  contract: {
    id: "ctr-marina",
    type: "hourly_compensation",
    startDate: "2025-03-01",
    weeklyPeriod: 30,
    serviceRateCents: 9_500,
    administrativeHourlyRateCents: 6_000,
    specialAdministrativeHourlyRateCents: 8_500,
    issuesInvoice: true,
  },
  supervisedBy: [
    {
      id: "int-1",
      professionalId: "prof-marina",
      supervisorId: "prof-clara",
      supervisorName: "Clara Vidigal",
      needsSupervisorSignature: true,
      observation: "Estágio supervisionado em ABA, iniciado em março de 2025.",
    },
  ],
  supervises: [],
};

const clara: TeamMember = {
  id: "prof-clara",
  name: "Clara Vidigal",
  tbd: false,
  specialty: "Psicologia",
  email: "clara.vidigal@exemplo.test",
  cpf: "000.333.444-00",
  phone: "(11) 90000-0022",
  birthDate: "1987-09-30",
  specialtyRegister: "CRP 06/000001",
  formation: "Psicologia",
  healthFormation: "Psicologia (CRP)",
  professionalTypes: ["supervisor", "specialist"],
  userTypes: [],
  appliesProtocol: true,
  isAt: false,
  active: true,
  units: ["Pinheiros", "Vila Madalena"],
  contract: {
    id: "ctr-clara",
    type: "fixed_compensation",
    startDate: "2023-08-01",
    weeklyPeriod: 40,
    monthlyRateCents: 1_250_000,
    // Zero é válido em remuneração fixa: quem tem mensalidade não cobra hora
    // administrativa à parte.
    administrativeHourlyRateCents: 0,
    issuesInvoice: true,
  },
  supervisedBy: [],
  supervises: [
    {
      id: "int-1",
      professionalId: "prof-marina",
      supervisorId: "prof-clara",
      supervisorName: "Clara Vidigal",
      needsSupervisorSignature: true,
    },
  ],
};

/** Contrato sem emissão de nota: é o fechamento curto do outro módulo. */
const rui: TeamMember = {
  id: "prof-rui",
  name: "Rui Sampaio Neto",
  tbd: false,
  specialty: "Fonoaudiologia",
  email: "rui.sampaio@exemplo.test",
  cpf: "000.555.666-00",
  phone: "(11) 90000-0033",
  birthDate: "1991-11-08",
  specialtyRegister: "CRFa 2-00000",
  formation: "Fonoaudiologia",
  healthFormation: "Fonoaudiologia (CRF)",
  professionalTypes: ["specialist"],
  userTypes: [],
  appliesProtocol: true,
  isAt: true,
  active: true,
  units: ["Pinheiros"],
  contract: {
    id: "ctr-rui",
    type: "hourly_compensation",
    startDate: "2024-06-01",
    weeklyPeriod: 20,
    serviceRateCents: 11_000,
    administrativeHourlyRateCents: 6_500,
    specialAdministrativeHourlyRateCents: 9_000,
    issuesInvoice: false,
  },
  supervisedBy: [],
  supervises: [],
};

/** Espaço reservado na agenda: dois campos preenchidos, e nada mais. */
const aDefinir: TeamMember = {
  id: "prof-tbd-1",
  name: "Terapeuta a definir — manhã",
  tbd: true,
  specialty: "Aplicador ABA",
  professionalTypes: [],
  userTypes: [],
  appliesProtocol: false,
  isAt: false,
  active: true,
  units: ["Pinheiros"],
  supervisedBy: [],
  supervises: [],
};

/** Cadastro comum incompleto: os oito campos que o TBD dispensa. */
const incompleto: TeamMember = {
  id: "prof-incompleto",
  name: "Helena Braga",
  tbd: false,
  specialty: "Terapia Ocupacional",
  email: "helena.braga@exemplo.test",
  phone: "(11) 90000-0044",
  professionalTypes: [],
  userTypes: [],
  appliesProtocol: false,
  isAt: false,
  active: true,
  units: ["Vila Madalena"],
  supervisedBy: [],
  supervises: [],
};

/** Desativação sem data: o que a regra existe para impedir. */
const semDataDeSaida: TeamMember = {
  ...rui,
  id: "prof-saindo",
  name: "Denise Portela",
  specialty: "Musicoterapia",
  specialtyRegister: "UBAM 0000",
  healthFormation: "Musicoterapia (UBAM)",
  formation: "Musicoterapia",
  isAt: false,
  appliesProtocol: false,
  active: true,
  deactivationDate: undefined,
  contract: { ...rui.contract!, id: "ctr-denise" },
  supervises: [],
  supervisedBy: [],
};

/** Contrato por hora com uma taxa faltando. */
const contratoIncompleto: TeamMember = {
  ...rui,
  id: "prof-contrato-incompleto",
  name: "Otávio Ferrandini",
  specialty: "Psicomotricidade",
  contract: {
    id: "ctr-otavio",
    type: "hourly_compensation",
    startDate: "2026-01-15",
    weeklyPeriod: 24,
    serviceRateCents: 10_000,
    administrativeHourlyRateCents: 6_000,
    // Falta a hora administrativa especial, obrigatória neste tipo.
    specialAdministrativeHourlyRateCents: undefined,
    issuesInvoice: true,
  },
};

export const teamFixtures: Fixture<TeamData>[] = [
  {
    id: "team-roster",
    label: "Equipe da unidade",
    description:
      "Quatro profissionais e um espaço reservado. Contratos dos dois tipos, um vínculo de supervisão e um cadastro incompleto.",
    data: { now: NOW, members: [marina, clara, rui, aDefinir, incompleto] },
  },
  {
    id: "team-supervised",
    label: "Profissional em supervisão",
    description:
      "A Marina, com o vínculo que faz as sessões dela exigirem a assinatura da Clara.",
    data: { now: NOW, members: [marina] },
  },
  {
    id: "team-tbd",
    label: "Profissional a definir",
    description: "Espaço reservado na agenda: nome e especialidade, e nada mais exigido.",
    data: { now: NOW, members: [aDefinir] },
  },
  {
    id: "team-incomplete",
    label: "Cadastro comum incompleto",
    description: "Os mesmos dois campos do TBD, e mais oito faltando por não ser TBD.",
    data: { now: NOW, members: [incompleto] },
  },
  {
    id: "team-contract-incomplete",
    label: "Contrato por hora com taxa faltando",
    description: "Falta a hora administrativa especial, obrigatória neste tipo de contrato.",
    data: { now: NOW, members: [contratoIncompleto] },
  },
  {
    id: "team-no-invoice-contract",
    label: "Contrato sem emissão de nota",
    description: "O contrato do Rui: é ele que faz o fechamento dele pular as etapas de NF.",
    data: { now: NOW, members: [rui] },
  },
  {
    id: "team-deactivation-without-date",
    label: "Desativação sem data",
    description: "Sem a data, não dá para saber a partir de quando a agenda deixou de valer.",
    data: { now: NOW, members: [semDataDeSaida] },
  },
  {
    id: "team-empty",
    label: "Nenhum profissional na unidade",
    description: "Unidade recém-aberta, antes do primeiro vínculo.",
    data: { now: NOW, members: [] },
  },
];

export const teamIds = {
  marina: marina.id,
  clara: clara.id,
  rui: rui.id,
  aDefinir: aDefinir.id,
} as const;
