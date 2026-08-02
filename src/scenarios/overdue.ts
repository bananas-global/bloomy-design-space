import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do atraso.
 *
 * `ScheduleFilters` define "pendente ou atrasado" três vezes, com respostas
 * diferentes. Duas pessoas olhando "atrasados" no mesmo sistema veem listas
 * diferentes, e nenhuma sabe que existe outra definição.
 */
export const overdueScenarios: Scenario[] = [
  {
    id: "agenda.overdue-as-coordinator",
    title: "A coordenação chama de atrasado assim que passa do horário",
    intent:
      "Nomear a definição em vigor, que é a correção mais barata possível para duas contas atrás da mesma palavra.",
    route: "/agenda/overdue",
    persona: "coordinator",
    fixture: "overdue-as-coordinator",
    rules: ["overdue-means-two-different-things", "the-coordinator-list-hides-the-supervisor-step"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "As duas contas aparecem como etiquetas de texto lado a lado, nunca só por cor.",
    },
    status: "in-review",
    preconditions: [
      "`overdued_for_coordinator` usa `start_time < now` e exclui `pending_supervisor_signature`.",
      "Cinco atendimentos, de 3 a 60 horas em aberto.",
    ],
    expected: [
      "A tela diz qual definição está aplicando, e que existe outra.",
      "Os que estão dentro da folga de 48h aparecem apontados como divergência.",
      "A etapa que espera o supervisor é nomeada como ponto cego das duas listas.",
    ],
    tags: ["regra", "decisão", "exceção"],
  },
  {
    id: "agenda.overdue-as-everyone-else",
    title: "Para o resto do sistema, atraso começa depois de 48 horas",
    intent:
      "Mostrar a outra lista com os mesmos dados, para a diferença deixar de ser argumento e virar contagem.",
    route: "/agenda/overdue",
    persona: "clinic_admin",
    fixture: "overdue-as-everyone-else",
    rules: ["overdue-means-two-different-things"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`overdued` usa uma janela de 48 horas e inclui as quatro situações abertas."],
    expected: [
      "A mesma fixture produz uma lista diferente.",
      "A tela explica por que a folga existe, em vez de tratá-la como erro.",
      "A etapa do supervisor aparece aqui — ela só some da lista da coordenação.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "agenda.overdue-supervisor-query",
    title: "O supervisor se cobra antes de cobrar os outros",
    intent:
      "Nomear a única escolha do sistema em que alguém aplica a si um prazo mais duro que aos colegas — e que uma reescrita apagaria como inconsistência.",
    route: "/agenda/overdue",
    persona: "supervisor",
    fixture: "overdue-supervisor-query",
    rules: [
      "stricter-with-myself-than-with-others",
      "the-supervisor-list-is-about-a-different-thing",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`supervisor_query` une duas consultas: a do próprio supervisor com `start_time < now`, a dos colegas da unidade com 48 horas.",
      "As duas olham `status in [:scheduled, :incomplete]` — agendamento que não virou atendimento.",
    ],
    expected: [
      "A tela afirma que as duas janelas existem, e que a escolha é boa.",
      "Aponta quais agendamentos aparecem só por serem de quem está olhando.",
      "E distingue esta lista da de atendimentos pendentes: uma não contém a outra.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "agenda.overdue-in-agreement",
    title: "Quando as duas definições concordam",
    intent:
      "Fixar que a ambiguidade não custa nada enquanto elas coincidem — o aviso precisa saber calar.",
    route: "/agenda/overdue",
    persona: "coordinator",
    fixture: "overdue-in-agreement",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhuma divergência é apontada.",
      "A definição em vigor continua declarada — isso não depende de haver conflito.",
    ],
    tags: ["sucesso"],
  },
];
