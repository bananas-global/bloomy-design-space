import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da saída automática.
 *
 * A rotina existe para limpar a lista de quem está na clínica — intenção certa.
 * O que ela não faz é filtrar por data, e por isso carimba duração em registro
 * de qualquer época.
 */
export const autoCheckoutScenarios: Scenario[] = [
  {
    id: "in-clinic.auto-checkout-absurd",
    title: "A rotina vai declarar presenças de meses",
    intent:
      "Tornar visível que a limpeza da lista carimba a duração junto — e que sozinha cada linha parece plausível.",
    route: "/in-clinic/auto-checkout",
    persona: "attendant",
    fixture: "auto-checkout-with-old-records",
    rules: ["auto-checkout-has-no-date-filter"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A duração aparece em texto, em dias quando passa de um — “2136 horas” obrigaria quem lê a dividir de cabeça.",
    },
    status: "in-review",
    preconditions: [
      "`AutoCheckout` seleciona `is_nil(sr.checkout_at)` sem qualquer filtro de data.",
      "Três check-ins de hoje e três esquecidos, o mais antigo de 02/05.",
    ],
    expected: [
      "Os registros antigos são separados dos de hoje, porque é a comparação que denuncia.",
      "A duração declarada aparece em dias, e não em horas.",
      "A tela reconhece que limpar a lista é a intenção certa.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "in-clinic.auto-checkout-clean",
    title: "Só check-ins de hoje",
    intent: "Fixar que o aviso cala quando a rotina faz exatamente o que promete.",
    route: "/in-clinic/auto-checkout",
    persona: "attendant",
    fixture: "auto-checkout-only-today",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aviso de presença absurda aparece.",
      "A tela diz que nestas a rotina não inventa duração nenhuma.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "in-clinic.auto-checkout-signed",
    title: "A rotina assina o que fecha",
    intent:
      "Preservar a única parte honesta da operação: dá para distinguir o que a rotina fechou do que uma pessoa fechou.",
    route: "/in-clinic/auto-checkout",
    persona: "coordinator",
    fixture: "auto-checkout-already-closed",
    rules: ["the-system-signs-its-own-checkout"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["A rotina grava `checkout_done_by: \"system\"`."],
    expected: [
      "Cada registro fechado diz quem o fechou, em texto.",
      "A tela explica por que essa marca importa: sem ela, a duração absurda pareceria erro de quem estava no balcão.",
    ],
    tags: ["regra", "decisão"],
  },
];
