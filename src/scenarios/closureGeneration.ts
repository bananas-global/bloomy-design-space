import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da geração mensal de fechamentos.
 *
 * Três decisões de uma rotina que roda sozinha, todas com consequência em
 * dinheiro, nenhuma produzindo erro. É o tipo de coisa que só aparece se
 * alguém for procurar — e ninguém procura o que não tem tela.
 */
export const closureGenerationScenarios: Scenario[] = [
  {
    id: "closures.generation-with-losses",
    title: "Sair no dia 1º faz o mês trabalhado ficar sem fechamento",
    intent:
      "Delimitar com precisão o buraco entre dois workers que quase se cobrem — e mostrar o caso coberto ao lado, para ninguém consertar o que funciona.",
    route: "/closures/generation",
    persona: "clinic_admin",
    fixture: "closure-generation-with-losses",
    rules: [
      "deactivation-on-the-first-loses-the-month-worked",
      "the-worker-reports-success-with-failures-inside",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada profissional tem etiqueta em texto dizendo se foi pulado, se falhou ou se gerou — três estados, três frases.",
    },
    status: "in-review",
    preconditions: [
      "`GenerateMonthlyClosuresWorker` filtra `p.status == true` na hora em que roda.",
      "`DeactivateProfessionalWorker` gera o fechamento do mês da data de desativação.",
      "Uma profissional saiu em 28/07 (coberta) e outro em 1º/08 (julho fica sem).",
      "Uma geração falhou, e o worker devolveu `{:ok, ...}` assim mesmo.",
    ],
    expected: [
      "As horas sem acerto aparecem somadas, e não como adjetivo.",
      "O caso que o worker de desativação cobre aparece ao lado, para a diferença ficar clara.",
      "A falha é apontada ao lado do sucesso que o Oban registrou.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "closures.generation-clean",
    title: "Virada sem perda",
    intent:
      "Fixar o contraponto: os três avisos precisam calar quando não há o que reportar.",
    route: "/closures/generation",
    persona: "clinic_admin",
    fixture: "closure-generation-clean",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: ["Todos ativos, nenhuma falha, worker rodando às 06h UTC."],
    expected: [
      "Nenhum dos dois avisos aparece.",
      "A tela diz que a virada foi sem perda, em vez de ficar em branco.",
    ],
    tags: ["sucesso"],
  },
];
