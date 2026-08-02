import type { Fixture } from "@brucesantos/design-space";
import type { Authorization, AuthorizationsData } from "../contracts/index.js";

/**
 * Fixtures da central de autorizações.
 *
 * Uma fila de julho com as situações que a operação precisa distinguir — e que
 * um modelo de "guia recusada / guia aprovada" apaga. Quatro das dez situações
 * do produto são lidas como recusa quando não são, e cada uma pede uma ação
 * diferente.
 *
 * Números de guia, senhas e carteirinhas são sintéticos e não seguem o formato
 * de nenhuma operadora real.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };
const ISADORA = { id: "pac-isadora", name: "Isadora Bueno Ramalho", birthDate: "2018-03-21" };
const BENICIO = { id: "pac-benicio", name: "Benício Tavares Rocha", birthDate: "2020-06-15" };
const LAURA = { id: "pac-laura", name: "Laura Menendes Pinto", birthDate: "2017-12-02" };

function authorization(overrides: Partial<Authorization> & { id: string }): Authorization {
  return {
    guideNumber: `G-${overrides.id.slice(-4)}`,
    patient: THEO,
    healthCare: "Bradesco Saúde",
    status: "authorized",
    kind: "health_care",
    category: "monthly",
    guideType: "request",
    validFrom: "2026-07-01",
    validUntil: "2026-07-31",
    requestDate: "2026-06-24",
    requestedSessions: 16,
    packages: [
      {
        id: `${overrides.id}-p1`,
        name: "Terapia ABA — 4 sessões semanais",
        packageType: "package",
        quantity: 4,
        maxByMonth: 4,
        executions: 5,
      },
    ],
    errors: [],
    ...overrides,
  };
}

/* ================================================= autorizada, com saldo */

const comSaldo = authorization({
  id: "aut-7001",
  guideNumber: "G-7001",
  patient: THEO,
  status: "authorized",
  authorizationDate: "2026-06-27",
  authorizationPassword: "4471-9920",
  packages: [
    {
      id: "aut-7001-p1",
      name: "Terapia ABA — 4 sessões semanais",
      packageType: "package",
      quantity: 4,
      maxByMonth: 4,
      executions: 9,
    },
  ],
});

/** Um pacote esgotado trava a autorização inteira, mesmo com saldo no outro. */
const umPacoteEsgotado = authorization({
  id: "aut-7002",
  guideNumber: "G-7002",
  patient: ISADORA,
  healthCare: "SulAmérica",
  status: "authorized",
  authorizationDate: "2026-06-28",
  requestedSessions: 20,
  packages: [
    {
      id: "aut-7002-p1",
      name: "Psicologia — 2 sessões semanais",
      packageType: "package",
      quantity: 2,
      maxByMonth: 4,
      executions: 8,
    },
    {
      id: "aut-7002-p2",
      name: "Fonoaudiologia — 1 sessão semanal",
      packageType: "package",
      quantity: 1,
      maxByMonth: 4,
      executions: 2,
    },
  ],
});

/** Capitation: o teto é o máximo mensal puro, sem multiplicar pela quantidade. */
const capitation = authorization({
  id: "aut-7003",
  guideNumber: "G-7003",
  patient: BENICIO,
  healthCare: "Unimed",
  status: "authorized",
  category: "base",
  authorizationDate: "2026-06-20",
  requestedSessions: 12,
  packages: [
    {
      id: "aut-7003-p1",
      name: "Capitation — valor fixo por paciente",
      packageType: "capitation",
      // quantity 3 não multiplica: o teto continua sendo 12.
      quantity: 3,
      maxByMonth: 12,
      executions: 7,
    },
  ],
});

/** Validade vencida: autorizada, com saldo, e ainda assim inútil. */
const vencida = authorization({
  id: "aut-7004",
  guideNumber: "G-7004",
  patient: LAURA,
  healthCare: "Amil",
  status: "authorized",
  validFrom: "2026-06-01",
  validUntil: "2026-06-30",
  requestDate: "2026-05-22",
  authorizationDate: "2026-05-28",
  packages: [
    {
      id: "aut-7004-p1",
      name: "Terapia ABA — 4 sessões semanais",
      packageType: "package",
      quantity: 4,
      maxByMonth: 4,
      executions: 3,
    },
  ],
});

/* ============================================== as situações de espera */

const parcial = authorization({
  id: "aut-7010",
  guideNumber: "G-7010",
  patient: THEO,
  healthCare: "Bradesco Saúde",
  status: "partially_authorized",
  requestedSessions: 16,
  authorizationDate: "2026-06-29",
  packages: [
    {
      id: "aut-7010-p1",
      name: "Terapia ABA — 2 sessões semanais",
      packageType: "package",
      quantity: 2,
      maxByMonth: 4,
      executions: 0,
    },
  ],
});

const emAnalise = authorization({
  id: "aut-7011",
  guideNumber: "G-7011",
  patient: ISADORA,
  healthCare: "SulAmérica",
  status: "analysing",
  requestDate: "2026-07-27",
  packages: [],
});

const aguardandoDocumentacao = authorization({
  id: "aut-7012",
  guideNumber: "G-7012",
  patient: BENICIO,
  healthCare: "Unimed",
  status: "waiting_provider_documentation",
  requestDate: "2026-07-15",
  observation:
    "Convênio pediu relatório de evolução assinado e cópia do plano terapêutico a partir da sexta sessão.",
  packages: [],
});

const aguardandoJustificativa = authorization({
  id: "aut-7013",
  guideNumber: "G-7013",
  patient: LAURA,
  healthCare: "Amil",
  status: "waiting_requester_justification",
  requestDate: "2026-07-18",
  clinicalIndication: "F84.0 — Transtorno do espectro autista",
  observation: "Auditoria pediu justificativa clínica para a frequência solicitada.",
  packages: [],
});

const erroSincronizacao = authorization({
  id: "aut-7014",
  guideNumber: "G-7014",
  patient: THEO,
  healthCare: "Bradesco Saúde",
  status: "sync_error",
  requestDate: "2026-07-28",
  errors: [
    "Certificado do prestador expirado na comunicação com o convênio.",
    "Timeout ao consultar elegibilidade da carteirinha.",
  ],
  packages: [],
});

const negada = authorization({
  id: "aut-7015",
  guideNumber: "G-7015",
  patient: ISADORA,
  healthCare: "SulAmérica",
  status: "denied",
  requestDate: "2026-07-10",
  observation: "Beneficiária em carência para o procedimento solicitado até 12/08/2026.",
  packages: [],
});

const faturada = authorization({
  id: "aut-7016",
  guideNumber: "G-7016",
  patient: BENICIO,
  healthCare: "Unimed",
  status: "invoiced",
  validFrom: "2026-06-01",
  validUntil: "2026-06-30",
  requestDate: "2026-05-20",
  authorizationDate: "2026-05-25",
  packages: [
    {
      id: "aut-7016-p1",
      name: "Terapia ABA — 4 sessões semanais",
      packageType: "package",
      quantity: 4,
      maxByMonth: 4,
      executions: 16,
    },
  ],
});

export const authorizationFixtures: Fixture<AuthorizationsData>[] = [
  {
    id: "authorizations-queue",
    label: "Central de autorizações",
    description:
      "Nove autorizações de julho: as quatro situações de espera, a parcial, a de erro técnico, a negada e a faturada.",
    data: {
      now: NOW,
      authorizations: [
        comSaldo,
        umPacoteEsgotado,
        capitation,
        vencida,
        parcial,
        emAnalise,
        aguardandoDocumentacao,
        aguardandoJustificativa,
        erroSincronizacao,
        negada,
        faturada,
      ],
    },
  },
  {
    id: "authorization-with-balance",
    label: "Autorizada, com saldo",
    description: "Nove de dezesseis sessões consumidas. Serve para agendar dentro de julho.",
    data: { now: NOW, authorizations: [comSaldo] },
  },
  {
    id: "authorization-one-package-exhausted",
    label: "Um pacote esgotado trava a autorização inteira",
    description:
      "Psicologia esgotou em 8 de 8; fonoaudiologia tem 2 de 4. O `Enum.all?` do monólito trava as duas.",
    data: { now: NOW, authorizations: [umPacoteEsgotado] },
  },
  {
    id: "authorization-capitation",
    label: "Capitation não multiplica",
    description:
      "Quantidade 3 e máximo mensal 12. O teto continua 12, e não 36 — é o modelo de valor fixo por paciente.",
    data: { now: NOW, authorizations: [capitation] },
  },
  {
    id: "authorization-expired",
    label: "Validade vencida",
    description: "Autorizada, com saldo, e mesmo assim inútil: a janela era de junho.",
    data: { now: NOW, authorizations: [vencida] },
  },
  {
    id: "authorization-partial",
    label: "Autorizada parcialmente",
    description:
      "Pediu 16 sessões, o convênio liberou 8. A diferença é a informação que decide o que fazer.",
    data: { now: NOW, authorizations: [parcial] },
  },
  {
    id: "authorization-sync-error",
    label: "Erro de sincronização",
    description:
      "A integração falhou com dois erros técnicos. O pedido está correto; reenviar resolve.",
    data: { now: NOW, authorizations: [erroSincronizacao] },
  },
  {
    id: "authorization-waiting-documentation",
    label: "Aguardando documentação da clínica",
    description: "A ação é da operação, e é o que destrava. Não é recusa.",
    data: { now: NOW, authorizations: [aguardandoDocumentacao] },
  },
  {
    id: "authorizations-empty",
    label: "Nenhuma autorização pendente",
    description: "Fila zerada.",
    data: { now: NOW, authorizations: [] },
  },
];

export const authorizationIds = {
  comSaldo: comSaldo.id,
  umPacoteEsgotado: umPacoteEsgotado.id,
  capitation: capitation.id,
  vencida: vencida.id,
  parcial: parcial.id,
  erroSincronizacao: erroSincronizacao.id,
} as const;
