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
    title: "Quem trabalhou e não recebe fechamento",
    intent:
      "Tornar visível que a rotina filtra por quem está ativo agora, e não por quem estava ativo durante o mês fechado.",
    route: "/closures/generation",
    persona: "clinic_admin",
    fixture: "closure-generation-with-losses",
    rules: [
      "deactivated-professional-gets-no-closure",
      "the-worker-reports-success-with-failures-inside",
      "the-month-closes-three-hours-early",
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
      "Dois profissionais com horas em julho foram desativados em 28/07 e 31/07.",
      "Uma geração falhou, e o worker devolveu `{:ok, ...}` assim mesmo.",
    ],
    expected: [
      "As horas sem acerto aparecem somadas, e não como adjetivo.",
      "A falha é apontada ao lado do sucesso que o Oban registrou.",
      "O deslocamento de três horas na virada é dito com a faixa exata.",
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
      "Nenhum dos três avisos aparece.",
      "A tela diz que a virada foi sem perda, em vez de ficar em branco.",
    ],
    tags: ["sucesso"],
  },
];
