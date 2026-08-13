import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da data de desativação.
 *
 * Uma linha da validação carrega dois defeitos que se cobrem: o papel comparado
 * com texto quando chega como átomo, e hoje medido em UTC.
 */
export const deactivationDateScenarios: Scenario[] = [
  {
    id: "patients.deactivation-date-evening-window",
    title: "Depois das 21h, hoje é recusado por ser ontem",
    intent:
      "Dizer a janela em horas de relógio, e não repetir a frase do sistema, que neste caso é falsa.",
    route: "/patients/deactivation-date",
    persona: "coordinator",
    fixture: "deactivation-date-evening-window",
    rules: ["today-is-measured-in-utc"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O veredito de cada tentativa é dito em palavras na etiqueta.",
    },
    status: "ported",
    preconditions: [
      "`Date.utc_today()` mede o dia em UTC; a clínica está em UTC−3 o ano inteiro.",
      "Duas tentativas foram enviadas às 21h40 e às 22h05 com a data do próprio dia.",
    ],
    expected: [
      "A janela aparece como hora de relógio, e não como conceito de fuso.",
      "A tela mostra a data que a clínica vê ao lado da que o sistema conta.",
      "A frase “data passada” não é repetida como se fosse verdadeira.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "patients.deactivation-date-exemption-dead",
    title: "A exceção do administrador está escrita e não vale",
    intent:
      "Mostrar que a saída prevista para o caso é justamente a que não funciona, e por que consertar um lado só não resolve.",
    route: "/patients/deactivation-date",
    persona: "admin",
    fixture: "deactivation-date-evening-window",
    rules: [
      "the-admin-exemption-is-unreachable",
      "the-only-place-that-makes-the-text-is-itself-unreachable",
      "the-two-defects-cover-each-other",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`user.roles` é uma lista de átomos e a validação compara com o texto `\"admin\"`.",
      "No login, `\"admin\" in user.roles` é falso pelo mesmo motivo.",
      "Um administrador tentou desativar às 22h05 com a data de hoje.",
    ],
    expected: [
      "O administrador aparece nomeado como tratado igual a qualquer outro papel.",
      "A tela diz que a decisão existe no código e não chega a valer.",
      "A tela diz que consertar só um dos dois lugares não resolve.",
    ],
    tags: ["regra", "exceção", "risco"],
  },
  {
    id: "patients.deactivation-date-exemption-alive",
    title: "O que a exceção faria, se valesse",
    intent:
      "Medir o alcance da correção do papel sozinha, para não passar a ideia de que ela resolve a janela.",
    route: "/patients/deactivation-date",
    persona: "admin",
    fixture: "deactivation-date-exemption-alive",
    rules: ["the-two-defects-cover-each-other"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["O papel chega como texto, e a comparação da validação passa a funcionar."],
    expected: [
      "A tentativa do administrador é aceita, com a exceção marcada.",
      "As recusas de quem não é administrador continuam, porque a janela não foi corrigida.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "patients.deactivation-date-daytime",
    title: "Durante o dia, a validação está certa",
    intent:
      "Fixar que só a janela erra, para que a correção não desmonte uma verificação que faz falta.",
    route: "/patients/deactivation-date",
    persona: "coordinator",
    fixture: "deactivation-date-daytime",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Nenhum aviso de recusa pelo relógio aparece.",
      "A data que de fato passou continua recusada.",
    ],
    tags: ["sucesso"],
  },
];
