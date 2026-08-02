import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do portal da operadora.
 *
 * O único lugar do produto em que dados de uma clínica são mostrados a uma
 * organização de fora — e por isso o único em que o que **não** aparece é tão
 * projetado quanto o que aparece.
 *
 * A persona é a de menor permissão do produto, como nos outros portais: quem
 * está na frente da tela é uma pessoa da operadora, não da clínica, e nada aqui
 * depende de permissão interna.
 */
export const insurerPortalScenarios: Scenario[] = [
  {
    id: "insurer.attendance",
    title: "Lista de presença do mês",
    intent:
      "Definir o documento que a operadora usa para conferir a cobrança — e separar o que fechou do que apenas aconteceu.",
    route: "/insurer",
    persona: "applicator",
    fixture: "insurer-attendance",
    rules: ["attendance-list-counts-only-what-happened"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A lista é uma tabela com `caption` e cabeçalhos de coluna. A situação tem rótulo textual e um motivo escrito quando não foi prestado.",
    },
    status: "in-review",
    preconditions: [
      "Sete linhas em julho: três realizadas, uma falta, um cancelamento e dois atendimentos que ainda não fecharam.",
    ],
    expected: [
      "O total de prestados conta apenas o que chegou a Finalizado.",
      "Cada linha não prestada diz por quê, em vez de só mostrar a situação.",
      "A tabela tem legenda e cabeçalhos, e rola sem quebrar a página.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "insurer.pending-closure",
    title: "Atendimentos que aconteceram e não fecharam",
    intent:
      "Nomear a diferença mais comum entre o que a clínica cobra e o que a operadora conta.",
    route: "/insurer",
    persona: "applicator",
    fixture: "insurer-pending-closure",
    rules: ["attendance-list-counts-only-what-happened"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Duas linhas pendentes de assinatura: uma de quem atendeu, uma do supervisor."],
    expected: [
      "A tela afirma que os atendimentos aconteceram e ainda não fecharam.",
      "O total de prestados é zero, e a contagem de pendentes é dois.",
      "A explicação diz que eles vão contar assim que fecharem.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "insurer.hidden-incomplete",
    title: "Agendamentos omitidos pelo escopo",
    intent:
      "Tornar discutível uma omissão que o sistema atual faz em silêncio, e que impede conciliar a lista com a fatura.",
    route: "/insurer",
    persona: "applicator",
    fixture: "insurer-hidden-incomplete",
    rules: ["incomplete-schedules-are-hidden-from-the-insurer"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`SchedulePolicy.scope/2` filtra `status != :incomplete` para o usuário de operadora, sem sinalizar.",
    ],
    expected: [
      "A tela declara quantos agendamentos ficaram de fora.",
      "E diz que no sistema atual essa omissão é silenciosa.",
      "O aviso enquadra a omissão como decisão a discutir, não como comportamento herdado.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "insurer.not-shared",
    title: "O que a operadora não vê",
    intent:
      "Declarar a decisão de privacidade em voz alta — uma ausência silenciosa pareceria lacuna do produto.",
    route: "/insurer",
    persona: "applicator",
    fixture: "insurer-attendance",
    rules: ["insurer-sees-attendance-not-clinical-record"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tela lista por extenso o que não acompanha a cobrança.",
      "A justificativa é dita: o conteúdo clínico é do paciente e da clínica.",
      "Nenhuma evolução, tentativa, meta ou resposta de protocolo aparece em lugar nenhum da página.",
    ],
    tags: ["decisão"],
  },
  {
    id: "insurer.empty",
    title: "Competência sem movimento",
    intent: "Definir o período em que não houve atendimento de beneficiário desta operadora.",
    route: "/insurer",
    persona: "applicator",
    fixture: "insurer-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A lista explica que não houve atendimento de beneficiário no período.",
      "Os totais aparecem zerados, em vez de a seção sumir.",
    ],
    tags: ["vazio"],
  },
];
