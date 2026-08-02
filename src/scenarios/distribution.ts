import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da distribuição de guias.
 *
 * O distribuidor decide qual guia paga qual atendimento, percorrendo o dia em
 * ordem de horário. Quando o saldo não cobre a demanda, o relógio decide — e a
 * lista de quem ficou de fora é calculada e descartada.
 */
export const distributionScenarios: Scenario[] = [
  {
    id: "authorizations.distribution-short",
    title: "Dois atendimentos ficaram sem guia",
    intent:
      "Mostrar uma lista que o sistema já monta e joga fora, no instante em que a decisão é tomada.",
    route: "/authorizations/distribution",
    persona: "operation",
    fixture: "distribution-short-of-balance",
    rules: [
      "the-list-of-unpaid-is-computed-and-discarded",
      "the-clock-decides-who-gets-paid",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Com guia e sem guia são etiquetas de texto, nunca só cor.",
    },
    status: "in-review",
    preconditions: [
      "`Distributor.distribute/2` ordena os atendimentos por `start_time` e consome os pacotes.",
      "`skipped_schedule_ids` é acumulado e devolvido no resultado.",
      "`DistributorWorker` chama `Distributor.run()` e ignora o retorno.",
      "Sete atendimentos no dia, saldo para cinco.",
    ],
    expected: [
      "Os atendimentos sem guia são nomeados, com o valor somado.",
      "A tela diz que essa lista já existe no sistema e é descartada.",
      "O horário do corte é dito, e a arbitrariedade da ordem é declarada.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "authorizations.distribution-enough",
    title: "Saldo suficiente para o dia",
    intent: "Fixar que os dois avisos calam quando não houve corte — falar em corte seria inventar.",
    route: "/authorizations/distribution",
    persona: "operation",
    fixture: "distribution-balance-enough",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum atendimento aparece sem guia.",
      "Nenhum aviso sobre o relógio aparece.",
    ],
    tags: ["sucesso"],
  },
];
