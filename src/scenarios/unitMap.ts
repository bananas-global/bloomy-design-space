import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do mapa da unidade.
 *
 * A única tela do produto cuja pergunta não é sobre um caso, e sim sobre
 * capacidade. Estes cenários existem para fixar que ela tem três maneiras de
 * mostrar zero, e que elas pedem ações opostas.
 */
export const unitMapScenarios: Scenario[] = [
  {
    id: "unit-map.week",
    title: "A semana da unidade por profissional",
    intent:
      "Definir a leitura básica do mapa e dizer, onde ela é lida, o que a ocupação de fato mede.",
    route: "/unit-map",
    persona: "coordinator",
    fixture: "unit-map-week",
    rules: ["occupancy-counts-hours-touched", "the-axis-decides-the-question"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A grade é uma tabela com cabeçalhos de linha e coluna e `caption`. Cada célula tem texto ou rótulo acessível — a cor nunca é o único sinal. A grade rola dentro de si, e nunca a página.",
    },
    status: "in-review",
    preconditions: [
      "Unidade aberta das 08h às 18h30.",
      "Três profissionais: uma com agenda cheia, uma sem agenda nenhuma e um com agenda vazia.",
    ],
    expected: [
      "Cada linha mostra a ocupação da semana em cima da grade.",
      "A tela diz que a ocupação conta horas com atendimento, e não atendimentos.",
      "O eixo escolhido aparece junto da pergunta que ele responde.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "unit-map.no-agenda-is-not-zero",
    title: "Sem agenda definida não é zero por cento",
    intent:
      "Separar os dois zeros que o sistema real achata no mesmo número, porque eles pedem ações opostas.",
    route: "/unit-map",
    persona: "coordinator",
    fixture: "unit-map-week",
    rules: ["no-agenda-is-not-zero-occupancy", "people-cannot-see-the-map-they-cause"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`calculate_occupancy(_items, [])` devolve 0 no sistema real.",
      "Iara não tem hora de agenda padrão em dia nenhum; Renato tem a semana definida e vazia.",
    ],
    expected: [
      "Quem não tem agenda padrão mostra “Sem agenda padrão definida”, e não 0%.",
      "Quem tem agenda e nenhum atendimento mostra “Nenhuma hora ocupada”.",
      "O aviso nomeia o destinatário — People —, porque ele não alcança esta tela.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "unit-map.lost-hour",
    title: "O atendimento das 18h que o mapa não mostra",
    intent:
      "Tornar visível uma faixa que o cálculo de horas descarta, e dizer o que existe dentro dela.",
    route: "/unit-map",
    persona: "coordinator",
    fixture: "unit-map-lost-hour",
    rules: ["unit-hours-drop-the-last-partial-hour"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`unit_hours = start_at.hour..(end_at.hour - 1)`.",
      "A unidade fecha às 18h30, então o mapa vai até as 17h.",
      "Dois atendimentos existem às 18h nesta semana.",
    ],
    expected: [
      "A tela avisa que o mapa termina antes do fechamento da unidade.",
      "E nomeia quem está na faixa perdida, porque esses atendimentos ocupam sala e profissional.",
      "O aviso é de perigo, e não informativo: há dado sumindo, não só uma escolha de recorte.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "unit-map.crowded-hour",
    title: "Uma hora com três atendimentos conta como uma",
    intent:
      "Dar nome ao que o número não mede, para que ninguém decida contratação com ocupação de sala.",
    route: "/unit-map",
    persona: "clinic_admin",
    fixture: "unit-map-crowded-hour",
    rules: ["occupancy-counts-hours-touched"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Quarta às 14h tem três atendimentos na mesma sala."],
    expected: [
      "A célula mostra “3×”, e não um marcador único.",
      "A situação do dia aponta em quais horas há mais de um.",
      "A ocupação da semana continua contando aquela hora uma vez só.",
    ],
    tags: ["regra"],
  },
  {
    id: "unit-map.granularity-locked",
    title: "No eixo do paciente não se escolhe semana ou dia",
    intent:
      "Trocar dois botões apagados sem explicação por uma frase que diz por que a pergunta não faz sentido ali.",
    route: "/unit-map",
    persona: "therapeutic_companion",
    fixture: "unit-map-by-patient",
    rules: ["the-axis-decides-the-question"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "No sistema real, os botões de semana e dia ficam desabilitados nos eixos de paciente e unidade.",
      "Nenhuma explicação acompanha a desabilitação.",
    ],
    expected: [
      "A tela diz que a semana do paciente é a unidade de leitura, e por quê.",
      "Mexer no mapa fica indisponível para a terapeuta, com o motivo.",
      "O eixo continua trocável — o que está travado é a granularidade dele.",
    ],
    tags: ["permissão", "decisão"],
  },
  {
    id: "unit-map.people-cannot-see",
    title: "O People não vê o mapa que ele causa",
    intent:
      "Fechar o par: o mapa aponta “sem agenda definida”, e quem define agenda não abre o mapa.",
    route: "/unit-map",
    persona: "people",
    fixture: "unit-map-as-people",
    rules: ["people-cannot-see-the-map-they-cause"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`UnitMapPolicy.can?(role, :show)` não inclui `people` nem `operation`.",
    ],
    expected: [
      "A recusa diz o que o People faz e por que isso torna a ausência estranha.",
      "Não é um “sem permissão” genérico: o motivo é o que permite discutir a política.",
    ],
    tags: ["permissão", "exceção"],
  },
];
