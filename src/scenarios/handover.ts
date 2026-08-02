import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da troca de responsável por um agendamento.
 *
 * O ramo que recusa devolve erro sem desfazer a transação, e como não há
 * rollback o erro nunca chega à tela.
 */
export const handoverScenarios: Scenario[] = [
  {
    id: "agenda.handover-silent",
    title: "Perdeu o atendimento e não foi avisado",
    intent:
      "Nomear a pessoa sobre quem o silêncio cai, que é justamente a que não está olhando a tela.",
    route: "/agenda/handovers",
    persona: "coordinator",
    fixture: "handover-with-silence",
    rules: ["the-refusal-branch-commits-anyway", "who-lost-the-appointment-is-not-told"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A troca e o aviso são duas etiquetas em texto, e não uma cor só.",
    },
    status: "in-review",
    preconditions: [
      "O ramo que recusa devolve `{:error, ...}` sem `Repo.rollback`.",
      "Duas trocas caem nesse ramo porque o anterior já foi avisado hoje.",
    ],
    expected: [
      "Cada profissional que perdeu o atendimento é nomeado, com paciente e horário.",
      "A tela diz que a troca aconteceu nos dois casos.",
      "A tela diz que quem assumiu recebeu a mesma confirmação das outras trocas.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "agenda.handover-message-unreachable",
    title: "A frase existe, o tratamento existe, nenhum roda",
    intent:
      "Mostrar as duas mortes na mesma linha, e por que consertar só um lado piora.",
    route: "/agenda/handovers",
    persona: "admin",
    fixture: "handover-with-silence",
    rules: ["the-error-branch-of-the-caller-is-unreachable"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Não há `Repo.rollback` em nenhum ponto do módulo.",
      "`Repo.transaction` devolve `{:ok, valor}`, e a tela casa `{:ok, _result}`.",
    ],
    expected: [
      "A mensagem morta aparece entre aspas.",
      "A tela diz que o tratamento de erro existe e não executa.",
      "A tela diz que fazer o erro chegar avisaria de uma falha que não houve.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "agenda.handover-all-notified",
    title: "Com todos avisados, não há silêncio",
    intent: "Fixar o caminho comum, em que o ramo do erro nem é alcançado.",
    route: "/agenda/handovers",
    persona: "coordinator",
    fixture: "handover-all-notified",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aviso de silêncio aparece.",
      "Todas as trocas mostram o anterior como avisado.",
    ],
    tags: ["sucesso"],
  },
];
