import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do portal do responsável legal.
 *
 * A família vê o combinado, não o registro clínico — e essa ausência é decisão,
 * não lacuna do porte. O que existe aqui e em nenhuma outra tela é o
 * consentimento: aceitar o plano terapêutico do filho, assinando com o próprio
 * nome.
 *
 * Como no portal público, a persona usada é a de menor permissão do produto,
 * para deixar explícito que nada aqui depende de permissão de sistema: quem
 * está na frente da tela é a mãe, não uma pessoa da clínica.
 */
export const guardianPortalScenarios: Scenario[] = [
  {
    id: "guardian.home",
    title: "Portal da família",
    intent:
      "Definir o que a família alcança: o combinado, e não o registro clínico do filho.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-home",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Corpo maior que o das telas internas. Cada seção é uma região com heading próprio, e o horário cancelado tem rótulo textual além da cor.",
    },
    status: "ported",
    preconditions: ["Dois filhos em atendimento, um plano esperando aceite, um horário cancelado."],
    expected: [
      "Os próximos atendimentos aparecem em ordem, com profissional e unidade.",
      "O horário cancelado continua na lista, marcado — e não some.",
      "O plano pendente é anunciado no topo, com o motivo de valer a leitura.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "guardian.plan-pending",
    title: "Plano esperando aceite",
    intent:
      "Garantir que o consentimento seja sobre o plano inteiro, e que assinar seja um ato — não um reflexo.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-plan-pending",
    rules: ["plan-acceptance-records-who-when-and-what"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Plano do segundo semestre, dentro da vigência, ainda sem aceite."],
    expected: [
      "As metas e os objetivos aparecem por extenso, na linguagem da devolutiva.",
      "A assinatura é um campo de texto, e não uma caixa de seleção.",
      "Aceitar está disponível, e o campo tem rótulo visível.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "guardian.plan-accepted",
    title: "Plano já aceito",
    intent: "Definir o que fica registrado do consentimento — e mostrá-lo a quem consentiu.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-plan-accepted",
    rules: ["plan-acceptance-records-who-when-and-what", "plans-cannot-overlap-for-a-patient"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A assinatura e a data aparecem para a própria família.",
      "O campo de assinatura não aparece de novo: não há o que assinar duas vezes.",
      "As metas continuam legíveis depois do aceite.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "guardian.plan-expired",
    title: "Plano vencido sem aceite",
    intent:
      "Impedir um consentimento sobre nada — e um registro que pareceria válido numa auditoria.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-plan-expired",
    rules: ["expired-plan-cannot-be-accepted"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Vigência encerrada em 31/12/2025, sem aceite."],
    expected: [
      "Aceitar aparece indisponível, com a data em que a vigência terminou.",
      "O motivo diz o que fazer: falar com a coordenação para montar um novo.",
      "O campo de assinatura fica desabilitado junto com o botão.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "guardian.plan-other-family",
    title: "Plano de outra família",
    intent:
      "Garantir que um identificador adivinhado não revele o plano terapêutico de outra criança.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-plan-other-family",
    rules: ["plan-is-visible-only-to-its-guardian"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`get_for_legal_guardian!` escopa por vínculo. O plano é de paciente de outra responsável.",
    ],
    expected: [
      "Nenhuma informação sobre a criança aparece — nem o nome, nem as metas.",
      "A negativa vem antes do conteúdo, e não junto dele.",
      "A tela diz a quem recorrer se a pessoa acha que deveria ter acesso.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "guardian.terms-missing",
    title: "Termos ainda não aceitos",
    intent:
      "Explicar por que o aceite guarda endereço de rede e aparelho, antes de guardá-los.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-terms-missing",
    rules: ["terms-acceptance-records-context"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A tela diz quais três dados são guardados.",
      "E diz para que servem: registro do aceite, não acompanhamento de navegação.",
    ],
    tags: ["decisão"],
  },
  {
    id: "guardian.empty",
    title: "Sem atendimentos marcados",
    intent: "Definir o vazio da família recém-cadastrada.",
    route: "/guardian",
    persona: "applicator",
    fixture: "guardian-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A agenda vazia diz que a clínica entra em contato.",
      "A ausência de plano explica que ele nasce da avaliação inicial.",
    ],
    tags: ["vazio"],
  },
];
