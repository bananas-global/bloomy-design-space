import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do resumo automático da reunião.
 *
 * O registro oficial de uma reunião clínica é escrito por uma rotina de
 * madrugada, a partir dos comentários, e marcado como revisado por ela mesma.
 * Comentar é o que agenda a reescrita.
 */
export const meetingSummaryScenarios: Scenario[] = [
  {
    id: "session.meeting-summary-overwrites-a-person",
    title: "Comentar hoje apaga o que a pessoa escreveu",
    intent:
      "Mostrar a fila antes de ela rodar, e separar o texto que uma pessoa redigiu do que a rotina gerou.",
    route: "/sessions/meeting-summary",
    persona: "coordinator",
    fixture: "meeting-summary-queue",
    rules: ["a-new-comment-schedules-an-overwrite", "reviewed-means-a-machine-read-it"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A autoria do texto é dita em palavras na etiqueta, não só pela cor dela.",
    },
    status: "ported",
    preconditions: [
      "`mark_comments_as_unreviewed` põe `comments_reviewed: false` ao criar um comentário.",
      "O cron `0 3 * * *` grava o resumo novo em `appointment.content`.",
      "Uma reunião tem texto escrito à mão e um comentário posterior.",
    ],
    expected: [
      "O aviso nomeia quem vai ter o texto substituído, e diz que não há histórico.",
      "A reunião com texto de pessoa é distinguida da que tem texto gerado.",
      "A seção “em dia” diz que a marca não significa conferência humana.",
    ],
    tags: ["regra", "decisão", "risco"],
  },
  {
    id: "session.meeting-summary-stuck-forever",
    title: "A reunião que tenta toda noite e nunca conclui",
    intent:
      "Dar sintoma a uma falha que hoje se repete em silêncio, e separar o número reportado do trabalho concluído.",
    route: "/sessions/meeting-summary",
    persona: "operation",
    fixture: "meeting-summary-queue",
    rules: [
      "a-failing-record-is-retried-every-night",
      "the-number-reported-is-the-number-attempted",
      "the-regeneration-queue-has-no-bound",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Uma falha deixa `comments_reviewed` como estava, então o registro volta à fila.",
      "`Enum.each` descarta o resultado de cada geração.",
      "A rotina devolve `{:ok, length(custom_services_to_review)}`.",
      "Um registro falhou 23 noites seguidas.",
    ],
    expected: [
      "As noites acumuladas aparecem como número, não como adjetivo.",
      "A tela diz que o valor registrado pela rotina mede o que entrou na fila.",
      "A espera da mais antiga é dita em dias, junto da ausência de limite.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "session.meeting-summary-comment-as-instruction",
    title: "Um comentário que vira instrução",
    intent:
      "Mostrar que o texto livre de um profissional entra cru no pedido que redige o registro oficial.",
    route: "/sessions/meeting-summary",
    persona: "clinic_admin",
    fixture: "meeting-summary-queue",
    rules: ["comment-text-becomes-model-instruction"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O conteúdo bruto é exibido como texto e nunca interpretado.",
    },
    status: "ported",
    preconditions: [
      "O conteúdo do comentário é interpolado entre `<conteudo>` e `</conteudo>`, sem escape.",
      "Um comentário fecha a etiqueta e escreve depois dela.",
    ],
    expected: [
      "O comentário é apontado por reunião e por autor.",
      "O conteúdo aparece como texto literal, sem ser executado nem interpretado.",
      "A tela liga o achado à ausência de conferência humana depois.",
    ],
    tags: ["regra", "risco"],
  },
  {
    id: "session.meeting-summary-already-generated",
    title: "O prontuário já saiu do pedido envenenado",
    intent:
      "Separar o caso em que ainda dá para prevenir do caso em que o registro oficial já veio dali.",
    route: "/sessions/meeting-summary",
    persona: "clinic_admin",
    fixture: "meeting-summary-already-generated",
    rules: ["comment-text-becomes-model-instruction", "reviewed-means-a-machine-read-it"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "A marca de revisão já voltou para `true` e o texto foi gerado pela rotina.",
      "O comentário que fecha a etiqueta estava no pedido que produziu esse texto.",
    ],
    expected: [
      "O aviso diz que não há o que prevenir, e mostra o texto que ficou no prontuário.",
      "O aviso da fila não aparece, porque não há nada para gerar esta noite.",
    ],
    tags: ["regra", "risco", "exceção"],
  },
  {
    id: "session.meeting-summary-blocked-night",
    title: "Um atendimento sem registro trava a noite inteira",
    intent:
      "Mostrar que a perda não é de uma reunião, e sim de tudo que vinha depois dela na fila.",
    route: "/sessions/meeting-summary",
    persona: "operation",
    fixture: "meeting-summary-blocked-night",
    rules: [
      "the-appointment-row-can-silently-fail-to-exist",
      "one-record-without-an-appointment-stops-the-night",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`Create.create_appointment/1` descarta o resultado do insert e devolve sucesso.",
      "A rotina lê `custom_service.appointment.id` sem conferir nulo.",
      "Não há `rescue` no laço nem no worker; o padrão do Oban são 20 tentativas.",
      "O terceiro da fila nunca teve a linha de registro criada.",
    ],
    expected: [
      "O atendimento que interrompe é nomeado, junto do motivo de ele estar assim.",
      "As reuniões bloqueadas atrás dele são listadas uma a uma.",
      "A tela separa o que foi gravado antes da interrupção do que nem foi tentado.",
      "A tela diz que a repetição de amanhã trava no mesmo ponto.",
    ],
    tags: ["regra", "exceção", "risco"],
  },
  {
    id: "session.meeting-summary-nothing-queued",
    title: "Madrugada sem fila",
    intent: "Fixar que os três avisos calam quando não há nada para reescrever.",
    route: "/sessions/meeting-summary",
    persona: "operation",
    fixture: "meeting-summary-settled",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Nenhum aviso aparece.",
      "A fila diz explicitamente que a rotina não terá o que fazer.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "session.meeting-summary-empty",
    title: "Unidade sem reunião nenhuma",
    intent: "Explicar de onde vem o resumo antes de existir o primeiro.",
    route: "/sessions/meeting-summary",
    persona: "operation",
    fixture: "meeting-summary-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: ["O vazio diz que o resumo é montado de madrugada a partir dos comentários."],
    tags: ["vazio"],
  },
];
