import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do envio do lote TISS.
 *
 * O lote é a fatura da clínica para a operadora. Três decisões do worker fazem
 * uma fatura sumir sem produzir erro: nenhuma retentativa, exceção descartada,
 * e os dois fracassos gravando a mesma frase.
 */
export const tissBatchScenarios: Scenario[] = [
  {
    id: "closures.tiss-batch-lost",
    title: "A fatura que some sem erro",
    intent:
      "Dar tamanho em dinheiro ao que o worker descarta, e dizer que nada vai tentar de novo.",
    route: "/closures/tiss-batch",
    persona: "operation",
    fixture: "tiss-batch-mixed",
    rules: ["the-batch-is-never-retried", "an-exception-discards-the-batch"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Cada desfecho tem etiqueta em texto; a cor acompanha, nunca substitui.",
    },
    status: "in-review",
    preconditions: [
      "`Tiss.Workers.TissBatch` roda com `max_attempts: 1`.",
      "Um `rescue` devolve `:discard` para qualquer exceção.",
      "Quatro tentativas: uma enviada, uma recusada, uma que estourou, uma na fila.",
    ],
    expected: [
      "O valor não faturado aparece somado, e não como adjetivo.",
      "A tela diz que nada vai reenviar por conta própria.",
      "Cada tentativa perdida é marcada individualmente.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "closures.tiss-batch-indistinguishable",
    title: "Recusa e exceção gravam a mesma frase",
    intent:
      "Separar dois problemas com donos opostos que o registro do job funde numa string só.",
    route: "/closures/tiss-batch",
    persona: "clinic_admin",
    fixture: "tiss-batch-mixed",
    rules: ["refusal-and-crash-log-the-same-string"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`{:error, _reason}` descarta o motivo e devolve “Erro ao gerar o xml”.",
      "O `rescue` devolve a mesma string.",
    ],
    expected: [
      "Recusa e exceção aparecem como desfechos distintos, com donos diferentes.",
      "A resposta da operadora é mostrada, com a ressalva de que o código a descarta.",
      "A tela mostra o que ficou no registro do job, ao lado do que de fato aconteceu.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "closures.tiss-batch-all-sent",
    title: "Todos os lotes enviados",
    intent: "Fixar que os dois avisos calam quando não há nada perdido.",
    route: "/closures/tiss-batch",
    persona: "operation",
    fixture: "tiss-batch-all-sent",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aviso de perda aparece.",
      "Nenhuma tentativa é marcada como não reenviável.",
    ],
    tags: ["sucesso"],
  },
];
