import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da vigência de plano.
 *
 * O filtro por operadora reconhece duas das quatro combinações possíveis de
 * datas. A que ele ignora é a mais natural de todas — e ela some sem erro.
 */
export const coverageScenarios: Scenario[] = [
  {
    id: "authorizations.coverage-half-filled",
    title: "Só uma data preenchida não cobre data nenhuma",
    intent:
      "Nomear um estado que o sistema produz sem nomear, e que faz o paciente sumir das consultas por operadora em silêncio.",
    route: "/authorizations/coverage",
    persona: "operation",
    fixture: "coverage-four-combinations",
    rules: ["half-filled-coverage-covers-nothing", "no-dates-means-always-covered"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada estado tem etiqueta em texto; a cor acompanha, nunca substitui. A correção sugerida vem em negrito, não só em vermelho.",
    },
    status: "in-review",
    preconditions: [
      "O filtro `health_care` casa `(início <= hoje e fim >= hoje)` ou `(início nulo e fim nulo)`.",
      "As quatro combinações possíveis de datas estão presentes.",
    ],
    expected: [
      "Os planos com só uma data são apontados como invisíveis a qualquer consulta por operadora.",
      "A tela diz que essa é a forma mais natural de registrar cobertura em curso.",
      "E declara a assimetria: nenhuma data cobre tudo, uma data cobre nada.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "authorizations.coverage-well-formed",
    title: "Todas as vigências completas",
    intent: "Fixar que o aviso cala quando não há o que corrigir.",
    route: "/authorizations/coverage",
    persona: "operation",
    fixture: "coverage-all-well-formed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aviso de plano invisível aparece.",
      "Nenhuma correção é sugerida — as situações restantes são legítimas.",
    ],
    tags: ["sucesso"],
  },
];
