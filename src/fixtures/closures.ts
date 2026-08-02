import type { Fixture } from "@brucesantos/design-space";
import type { Closure, ClosuresData } from "../contracts/index.js";

/**
 * Fixtures do fechamento mensal.
 *
 * O mesmo mês — julho de 2026 — visto em sete pontos diferentes do processo. É
 * de propósito: o fechamento não é uma lista de coisas diferentes, é uma coisa
 * só atravessando etapas, e cada etapa troca de dono.
 *
 * Os valores são plausíveis para um mês de terapeuta ABA em São Paulo, e
 * sintéticos. `currentUserId` aponta para a Marina nas fixtures em que a regra
 * de identidade da nota fiscal precisa ser exercida.
 */

const NOW = "2026-08-01T09:00:00.000-03:00";

const MARINA = { id: "prof-marina", name: "Marina Okabe", specialty: "Aplicador ABA" };
const CLARA = { id: "prof-clara", name: "Clara Vidigal", specialty: "Psicologia" };
const RUI = { id: "prof-rui", name: "Rui Sampaio Neto", specialty: "Fonoaudiologia" };

const USER_MARINA = "user-marina";
const USER_CLARA = "user-clara";
const USER_RUI = "user-rui";

function closure(overrides: Partial<Closure> & { id: string }): Closure {
  return {
    professional: MARINA,
    professionalUserId: USER_MARINA,
    month: 7,
    year: 2026,
    amountCents: 748_000,
    status: "closure",
    issuesInvoice: true,
    logs: [
      {
        at: "2026-08-01T03:00:00.000-03:00",
        observation: "Fechamento criado automaticamente pelo sistema para 7/2026",
      },
    ],
    ...overrides,
  };
}

const emFechamento = closure({
  id: "fec-01",
  status: "closure",
});

const aguardandoAceite = closure({
  id: "fec-02",
  status: "wait_accept",
  logs: [
    {
      at: "2026-08-01T03:00:00.000-03:00",
      observation: "Fechamento criado automaticamente pelo sistema para 7/2026",
    },
    {
      at: "2026-08-01T08:12:00.000-03:00",
      by: "Helena Braga",
      observation: "Valores conferidos e enviados para aceite",
    },
  ],
});

const emRevisao = closure({
  id: "fec-03",
  professional: CLARA,
  professionalUserId: USER_CLARA,
  amountCents: 912_500,
  status: "revision",
  logs: [
    {
      at: "2026-08-01T03:00:00.000-03:00",
      observation: "Fechamento criado automaticamente pelo sistema para 7/2026",
    },
    {
      at: "2026-08-01T08:20:00.000-03:00",
      by: "Helena Braga",
      observation: "Valores conferidos e enviados para aceite",
    },
    {
      at: "2026-08-01T08:44:00.000-03:00",
      by: "Clara Vidigal",
      observation: "Revisão pedida: duas supervisões de 22/07 não entraram no cálculo",
    },
  ],
});

const pendenteNota = closure({
  id: "fec-04",
  status: "pending_invoice",
  logs: [
    {
      at: "2026-08-01T08:12:00.000-03:00",
      by: "Helena Braga",
      observation: "Valores conferidos e enviados para aceite",
    },
    {
      at: "2026-08-01T08:30:00.000-03:00",
      by: "Marina Okabe",
      observation: "Valores aceitos pelo profissional",
    },
  ],
});

/** Contrato sem emissão de nota: o ciclo pula as duas etapas de NF. */
const semNota = closure({
  id: "fec-05",
  professional: RUI,
  professionalUserId: USER_RUI,
  amountCents: 415_000,
  status: "pending_invoice",
  issuesInvoice: false,
  logs: [
    {
      at: "2026-08-01T08:35:00.000-03:00",
      by: "Rui Sampaio Neto",
      observation: "Valores aceitos pelo profissional",
    },
  ],
});

const validarNota = closure({
  id: "fec-06",
  status: "validate_nf",
  invoiceFile: { name: "nf-2026-07-marina.pdf", at: "2026-08-01T09:40:00.000-03:00" },
  logs: [
    {
      at: "2026-08-01T08:30:00.000-03:00",
      by: "Marina Okabe",
      observation: "Valores aceitos pelo profissional",
    },
    {
      at: "2026-08-01T09:40:00.000-03:00",
      by: "Marina Okabe",
      observation: "Nota fiscal anexada",
    },
  ],
});

const aPagarSemComprovante = closure({
  id: "fec-07",
  status: "pay_invoice",
  invoiceFile: { name: "nf-2026-07-marina.pdf", at: "2026-08-01T09:40:00.000-03:00" },
  logs: [
    {
      at: "2026-08-01T09:40:00.000-03:00",
      by: "Marina Okabe",
      observation: "Nota fiscal anexada",
    },
    {
      at: "2026-08-01T10:05:00.000-03:00",
      by: "Denise Portela",
      observation: "Pagamento aprovado, nota fiscal validada",
    },
  ],
});

const aPagarComComprovante = closure({
  ...aPagarSemComprovante,
  id: "fec-08",
  paymentProof: { name: "comprovante-2026-07-marina.pdf", at: "2026-08-01T10:22:00.000-03:00" },
  logs: [
    ...aPagarSemComprovante.logs,
    {
      at: "2026-08-01T10:22:00.000-03:00",
      by: "Denise Portela",
      observation: "Comprovante de pagamento anexado",
    },
  ],
});

const pago = closure({
  id: "fec-09",
  month: 6,
  status: "paid",
  amountCents: 702_000,
  invoiceFile: { name: "nf-2026-06-marina.pdf", at: "2026-07-02T11:00:00.000-03:00" },
  paymentProof: { name: "comprovante-2026-06-marina.pdf", at: "2026-07-05T14:30:00.000-03:00" },
  logs: [
    {
      at: "2026-07-02T11:00:00.000-03:00",
      by: "Marina Okabe",
      observation: "Nota fiscal anexada",
    },
    {
      at: "2026-07-05T14:30:00.000-03:00",
      by: "Denise Portela",
      observation: "Comprovante de pagamento anexado",
    },
    {
      at: "2026-07-05T14:31:00.000-03:00",
      by: "Denise Portela",
      observation: "Pagamento confirmado",
    },
  ],
});

export const closureFixtures: Fixture<ClosuresData>[] = [
  {
    id: "closures-all-stages",
    label: "O mês inteiro, etapa por etapa",
    description:
      "Julho de 2026 em sete pontos do processo, mais um fechamento de junho já pago. Cada linha com um dono diferente.",
    data: {
      now: NOW,
      currentUserId: "user-helena",
      closures: [
        emFechamento,
        aguardandoAceite,
        emRevisao,
        pendenteNota,
        semNota,
        validarNota,
        aPagarSemComprovante,
        pago,
      ],
    },
  },
  {
    id: "closure-wait-accept",
    label: "Aguardando aceite do profissional",
    description: "A bola está com a Marina: aceitar o valor ou pedir revisão.",
    data: { now: NOW, currentUserId: USER_MARINA, closures: [aguardandoAceite] },
  },
  {
    id: "closure-pending-invoice-owner",
    label: "Nota fiscal pendente, vista pelo dono",
    description: "A Marina olhando o próprio fechamento. Ela é quem pode anexar a nota.",
    data: { now: NOW, currentUserId: USER_MARINA, closures: [pendenteNota] },
  },
  {
    id: "closure-pending-invoice-other",
    label: "Nota fiscal pendente, vista por outra pessoa",
    description:
      "O mesmo fechamento com outro usuário logado. Nem o admin anexa nota no lugar do profissional.",
    data: { now: NOW, currentUserId: "user-helena", closures: [pendenteNota] },
  },
  {
    id: "closure-no-invoice-contract",
    label: "Contrato sem emissão de nota",
    description: "O ciclo pula as duas etapas de nota fiscal e segue direto para pagamento.",
    data: { now: NOW, currentUserId: USER_RUI, closures: [semNota] },
  },
  {
    id: "closure-pay-without-proof",
    label: "A pagar, sem comprovante",
    description: "Aprovado, nota validada, e ainda sem o comprovante que a confirmação exige.",
    data: { now: NOW, currentUserId: "user-denise", closures: [aPagarSemComprovante] },
  },
  {
    id: "closure-pay-with-proof",
    label: "A pagar, com comprovante",
    description: "Comprovante anexado. A confirmação libera.",
    data: { now: NOW, currentUserId: "user-denise", closures: [aPagarComComprovante] },
  },
  {
    id: "closure-paid",
    label: "Fechamento pago",
    description: "Junho já pago. Registro contábil: ninguém interage e nenhum anexo muda.",
    data: { now: NOW, currentUserId: "user-denise", closures: [pago] },
  },
  {
    id: "closures-empty",
    label: "Nenhum fechamento",
    description: "Antes da virada do mês, ou para quem não tem fechamento visível.",
    data: { now: NOW, currentUserId: USER_MARINA, closures: [] },
  },
];

export const closureUsers = {
  marina: USER_MARINA,
  clara: USER_CLARA,
  rui: USER_RUI,
} as const;
