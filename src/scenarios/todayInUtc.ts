import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários de “que dia o sistema acha que é”.
 *
 * 205 chamadas fora de worker contra 104 usos do ajudante que conhece o fuso.
 * A escala é o achado; cada caso isolado parece pequeno demais para justificar
 * a correção.
 */
export const todayInUtcScenarios: Scenario[] = [
  {
    id: "structure.today-window-open",
    title: "Às 21h40, 205 respostas estão um dia à frente",
    intent:
      "Dar escala em número antes de dar exemplo, porque é a contagem que muda a conversa.",
    route: "/structure/today",
    persona: "admin",
    fixture: "today-in-utc-window-open",
    rules: ["the-system-asks-utc-what-day-it-is", "the-right-helper-sits-on-the-next-line"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O estado de cada superfície é dito em palavras na etiqueta.",
    },
    status: "ported",
    preconditions: [
      "`Date.utc_today()` aparece 205 vezes fora de worker, em 133 arquivos.",
      "`CalendarHelper.local_timezone/0` existe e é usado 104 vezes.",
      "São 21h40 na clínica.",
    ],
    expected: [
      "A data da clínica aparece ao lado da que o sistema conta.",
      "A contagem das duas formas de perguntar aparece lado a lado.",
      "A tela diz que qualquer conserto isolado deixa 204 pontos iguais atrás.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "structure.today-what-breaks",
    title: "O que quebra enquanto a janela dura",
    intent:
      "Trocar “133 arquivos” por consequência por superfície, que é o que permite alguém reconhecer o problema que já viu.",
    route: "/structure/today",
    persona: "operation",
    fixture: "today-in-utc-window-open",
    rules: ["the-form-refuses-to-let-you-pick-today"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O campo de data de encerramento do mapa de horas usa hoje como mínimo.",
      "A guarda de reversão compara a data do atendimento com hoje.",
    ],
    expected: [
      "O seletor que deixa de aceitar hoje aparece nomeado.",
      "A janela de desfazer aparece como fechando três horas antes.",
      "Cada superfície diz o que acontece, e não em que arquivo está.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "structure.today-age-off-by-days",
    title: "A idade vira dias antes do aniversário",
    intent:
      "Mostrar o erro que não depende da janela, e o que ele custa quando a idade é critério clínico.",
    route: "/structure/today",
    persona: "coordinator",
    fixture: "today-in-utc-window-open",
    rules: ["age-is-days-divided-by-365"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "A idade é `floor(Date.diff(hoje, nascimento) / 365)`, em oito telas.",
      "A criança faz treze anos em 02/08.",
    ],
    expected: [
      "A idade real e a mostrada aparecem lado a lado.",
      "A tela diz quantos dias faltam para o aniversário.",
      "A tela liga a idade a faixa de protocolo e ao que a operadora autoriza.",
    ],
    tags: ["regra", "risco"],
  },
  {
    id: "structure.today-window-closed",
    title: "Fora da janela, as 205 respostas estão certas",
    intent:
      "Explicar como um defeito atravessa 133 arquivos sem ninguém reclamar: ele acerta três quartos do dia.",
    route: "/structure/today",
    persona: "admin",
    fixture: "today-in-utc-window-closed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A tela diz que as duas datas concordam agora.",
      "Nenhuma superfície é marcada como errando.",
      "A idade continua errada, porque esse erro não depende da janela.",
    ],
    tags: ["sucesso", "regra"],
  },
];
