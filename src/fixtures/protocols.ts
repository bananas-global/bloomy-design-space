import type { Fixture } from "@brucesantos/design-space";
import type {
  Protocol,
  ProtocolArea,
  ProtocolExecutionData,
  ProtocolQuestion,
} from "../contracts/index.js";

/**
 * Fixtures de aplicação de protocolo.
 *
 * Duas avaliações do mesmo paciente: uma no formato padrão, com escala
 * compartilhada, e uma no ABLLS-R, com faixa numérica por item. Ver as duas é o
 * que torna evidente que o formato muda o controle da tela, e não só o rótulo.
 *
 * Os itens são plausíveis para uma avaliação de habilidades em ABA, com códigos
 * no estilo do instrumento. O conteúdo é sintético: nenhum texto foi copiado de
 * instrumento real, e os códigos não correspondem a itens publicados.
 */

const PACIENTE = {
  id: "pac-theo",
  name: "Théo Andrade Lins",
  birthDate: "2019-11-04",
};

function question(
  overrides: Partial<ProtocolQuestion> & { id: string; code: string; question: string },
): ProtocolQuestion {
  return {
    name: overrides.question,
    criteria: "Registrar a maior pontuação observada em três apresentações.",
    position: 1,
    ...overrides,
  };
}

/**
 * Resposta registrada. `label` é opcional porque o ABLLS-R não tem escala
 * nomeada: lá a resposta é o número da faixa, e inventar um rótulo faria a
 * fixture prometer uma legenda que o instrumento não tem.
 */
const respondida = (value: number, label?: string, at = "2026-07-23T10:12:00.000-03:00") => ({
  value,
  ...(label ? { label } : {}),
  at,
});

/* ================================================= protocolo padrão */

const cooperacao: ProtocolArea = {
  id: "area-cooperacao",
  orientation: "Cooperação e reforçadores",
  group: "Habilidades básicas",
  details: "Aplicar em ambiente estruturado, com o item preferido à vista.",
  position: 1,
  questions: [
    question({
      id: "q-a1",
      code: "A1",
      question: "Aproxima-se do adulto espontaneamente?",
      example: "Anda até o aplicador sem ser chamado quando há item preferido na mesa.",
      objective: "Estabelecer o adulto como estímulo apetitivo.",
      position: 1,
      answer: respondida(2, "Faz com ajuda"),
    }),
    question({
      id: "q-a2",
      code: "A2",
      question: "Permanece sentado por dois minutos?",
      position: 2,
      answer: respondida(3, "Faz sozinho"),
    }),
    question({
      id: "q-a3",
      code: "A3",
      question: "Aceita a retirada do item preferido sem comportamento inadequado?",
      example: "Entrega o brinquedo quando solicitado, sem chorar ou jogar.",
      position: 3,
    }),
  ],
};

const imitacao: ProtocolArea = {
  id: "area-imitacao",
  orientation: "Imitação motora",
  group: "Habilidades básicas",
  position: 2,
  questions: [
    question({
      id: "q-b1",
      code: "B1",
      question: "Imita movimento amplo com objeto?",
      position: 1,
      answer: respondida(1, "Não faz"),
      observation: "Tentou imitar apenas quando o objeto era o tambor.",
    }),
    question({
      id: "q-b2",
      code: "B2",
      question: "Imita movimento amplo sem objeto?",
      position: 2,
    }),
    question({
      id: "q-b3",
      code: "B3",
      question: "Imita sequência de dois movimentos?",
      position: 3,
    }),
  ],
};

const linguagem: ProtocolArea = {
  id: "area-linguagem",
  orientation: "Linguagem receptiva",
  group: "Comunicação",
  position: 3,
  questions: [
    question({
      id: "q-c1",
      code: "C1",
      question: "Atende a instrução de um passo?",
      position: 1,
    }),
    question({
      id: "q-c2",
      code: "C2",
      question: "Identifica objeto nomeado entre três?",
      position: 2,
    }),
  ],
};

const protocoloPadrao: Protocol = {
  id: "prot-habilidades",
  name: "Avaliação de habilidades básicas",
  format: "default",
  evaluationType: "evaluation_habilits",
  nextReassessmentInMonths: 6,
  explication:
    "Aplicar em até três sessões. Registrar a maior pontuação observada em três apresentações do item.",
  // Escala compartilhada por todo o protocolo: é o que distingue o formato padrão.
  answers: [
    { id: "ans-1", name: "Não faz", value: 1 },
    { id: "ans-2", name: "Faz com ajuda", value: 2 },
    { id: "ans-3", name: "Faz sozinho", value: 3 },
  ],
  areas: [cooperacao, imitacao, linguagem],
};

/* ==================================================== protocolo ABLLS-R */

const abllsrArea: ProtocolArea = {
  id: "area-abllsr-a",
  orientation: "A — Cooperação e eficácia do reforçador",
  position: 1,
  questions: [
    question({
      id: "q-abllsr-a1",
      code: "A1",
      question: "Come alimentos variados apresentados pelo adulto",
      criteria: "0 nenhum alimento; 4 aceita cinco ou mais alimentos diferentes.",
      position: 1,
      range: { min: 0, max: 4 },
      answer: respondida(3, undefined, "2026-07-16T14:20:00.000-03:00"),
    }),
    question({
      id: "q-abllsr-a2",
      code: "A2",
      question: "Manipula brinquedos e objetos de forma apropriada",
      criteria: "0 nenhum objeto; 4 manipula cinco ou mais de forma apropriada.",
      position: 2,
      range: { min: 0, max: 4 },
      answer: respondida(2, undefined, "2026-07-16T14:26:00.000-03:00"),
    }),
    question({
      id: "q-abllsr-a3",
      code: "A3",
      question: "Permanece na atividade por tempo determinado",
      criteria: "0 menos de um minuto; 2 até cinco minutos.",
      position: 3,
      // Faixa diferente da dos itens anteriores: é o ponto do formato.
      range: { min: 0, max: 2 },
    }),
  ],
};

const protocoloAbllsr: Protocol = {
  id: "prot-abllsr",
  name: "ABLLS-R — seção A",
  format: "abllsr",
  evaluationType: "evaluation_habilits",
  nextReassessmentInMonths: 12,
  explication: "Pontuar cada item na faixa própria dele. Não há escala compartilhada.",
  // Vazia de propósito: no ABLLS-R a pontuação é por faixa da questão.
  answers: [],
  areas: [abllsrArea],
};

/* ============================================================= fixtures */

const NOW = "2026-07-30T09:00:00.000-03:00";

/** Todas as questões respondidas, para a situação de aplicação concluída. */
function completo(protocol: Protocol): Protocol {
  return {
    ...protocol,
    areas: protocol.areas.map((area) => ({
      ...area,
      questions: area.questions.map((item) => ({
        ...item,
        answer: item.answer ?? respondida(2, protocol.format === "default" ? "Faz com ajuda" : undefined),
      })),
    })),
  };
}

export const protocolFixtures: Fixture<ProtocolExecutionData>[] = [
  {
    id: "protocol-in-progress",
    label: "Aplicação em andamento",
    description:
      "Três de oito itens respondidos, espalhados por duas áreas. A terceira área ainda não foi tocada.",
    data: {
      execution: {
        id: "apl-3301",
        protocol: protocoloPadrao,
        patient: PACIENTE,
        startedAt: "2026-07-23T10:00:00.000-03:00",
        now: NOW,
        currentQuestionId: "q-a2",
      },
    },
  },
  {
    id: "protocol-resume",
    label: "Retomar de onde parou",
    description:
      "A mesma aplicação, com a navegação posicionada na última respondida. Retomar deve pular para a próxima em branco.",
    data: {
      execution: {
        id: "apl-3301",
        protocol: protocoloPadrao,
        patient: PACIENTE,
        startedAt: "2026-07-23T10:00:00.000-03:00",
        now: NOW,
        currentQuestionId: "q-b1",
      },
    },
  },
  {
    id: "protocol-abllsr",
    label: "Aplicação no formato ABLLS-R",
    description:
      "Cada item com faixa numérica própria — inclusive faixas diferentes entre itens da mesma área.",
    data: {
      execution: {
        id: "apl-3350",
        protocol: protocoloAbllsr,
        patient: PACIENTE,
        startedAt: "2026-07-16T14:00:00.000-03:00",
        now: NOW,
        currentQuestionId: "q-abllsr-a3",
      },
    },
  },
  {
    id: "protocol-finished",
    label: "Aplicação concluída",
    description:
      "Instrumento inteiro respondido em 25 de julho. A reavaliação cai em seis meses, como o protocolo declara.",
    data: {
      execution: {
        id: "apl-3301",
        protocol: completo(protocoloPadrao),
        patient: PACIENTE,
        startedAt: "2026-07-23T10:00:00.000-03:00",
        finishedAt: "2026-07-25T11:30:00.000-03:00",
        reassessmentDate: "2027-01-25",
        now: NOW,
        currentQuestionId: "q-c2",
      },
    },
  },
  {
    id: "protocol-reassessment-overdue",
    label: "Reavaliação atrasada",
    description:
      "Aplicação de janeiro com reavaliação prevista para 20 de julho. Dez dias vencidos na data de referência.",
    data: {
      execution: {
        id: "apl-3200",
        protocol: completo(protocoloPadrao),
        patient: PACIENTE,
        startedAt: "2026-01-15T10:00:00.000-03:00",
        finishedAt: "2026-01-20T11:00:00.000-03:00",
        reassessmentDate: "2026-07-20",
        now: NOW,
        currentQuestionId: "q-a1",
      },
    },
  },
  {
    id: "protocol-empty",
    label: "Aplicação recém-aberta",
    description: "Nenhum item respondido ainda. O progresso é zero e a navegação começa no primeiro.",
    data: {
      execution: {
        id: "apl-3400",
        protocol: {
          ...protocoloPadrao,
          areas: protocoloPadrao.areas.map((area) => ({
            ...area,
            questions: area.questions.map(({ answer, observation, ...rest }) => rest),
          })),
        },
        patient: PACIENTE,
        startedAt: "2026-07-30T08:55:00.000-03:00",
        now: NOW,
      },
    },
  },
];

export const protocolIds = {
  padrao: protocoloPadrao.id,
  abllsr: protocoloAbllsr.id,
} as const;
