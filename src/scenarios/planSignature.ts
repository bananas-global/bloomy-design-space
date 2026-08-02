import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do aceite do plano de intervenção comportamental.
 *
 * A janela de três horas do achado 82, na superfície em que ela deixa de ser
 * caso de canto e vira o horário principal.
 */
export const planSignatureScenarios: Scenario[] = [
  {
    id: "guardian.plan-signature-wrong-date",
    title: "A família assina à noite, e o documento diz outro dia",
    intent:
      "Pôr a data assinada e a gravada lado a lado, porque é a diferença entre as duas que ninguém consegue ver no sistema real.",
    route: "/guardian/plan-signature",
    persona: "clinic_admin",
    fixture: "plan-signature-evening",
    rules: ["the-signature-date-is-stamped-in-utc", "the-window-is-exactly-when-families-sign"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O estado de cada aceite é dito em palavras na etiqueta.",
    },
    status: "in-review",
    preconditions: [
      "`BehaviorInterventionPlans.accept/3` grava `signed_at: Date.utc_today()`.",
      "O aceite chega pela API do portal do responsável.",
      "Três dos cinco responsáveis assinaram depois das 21h.",
    ],
    expected: [
      "Cada aceite mostra a data em que foi assinado e a que ficou no documento.",
      "A tela diz que a diferença de um dia parece erro de preenchimento, e não do sistema.",
      "A proporção de aceites noturnos aparece como número.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "guardian.plan-signature-after-the-end",
    title: "Aceito depois do fim do próprio plano",
    intent:
      "Separar o erro de um dia da contradição interna, em que o documento afirma duas coisas incompatíveis.",
    route: "/guardian/plan-signature",
    persona: "admin",
    fixture: "plan-signature-evening",
    rules: ["the-signature-can-predate-nothing-and-postdate-the-plan"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Um plano termina em 30/07 e o responsável assina às 23h20 desse dia.",
      "O carimbo cai em 31/07.",
    ],
    expected: [
      "O aviso é separado do aviso de data trocada.",
      "A tela diz que o documento afirma o fim e o aceite posterior ao mesmo tempo.",
      "A tela diz que não dá para saber qual das duas datas está errada.",
    ],
    tags: ["regra", "exceção", "risco"],
  },
  {
    id: "guardian.plan-signature-daytime",
    title: "Assinando durante o dia, nada erra",
    intent:
      "Fixar que o defeito não se detecta num caso isolado, só na proporção.",
    route: "/guardian/plan-signature",
    persona: "clinic_admin",
    fixture: "plan-signature-daytime",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aceite aparece com data trocada.",
      "As duas datas continuam sendo mostradas, iguais.",
    ],
    tags: ["sucesso"],
  },
];
