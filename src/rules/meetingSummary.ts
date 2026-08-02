import type { Rule } from "@brucesantos/design-space";
import type { MeetingComment, MeetingRecord, MeetingSummaryData } from "../contracts/index.js";

/**
 * Regras do resumo automático da reunião.
 *
 * A rotina das 3h percorre os atendimentos finalizados cuja marca de revisão
 * está em `false`, pede um resumo ao modelo e grava o resultado:
 *
 * ```elixir
 * updated_attrs = %{
 *   appointment: %{id: custom_service.appointment.id, content: content},
 *   comments_reviewed: true
 * }
 * ```
 *
 * `appointment.content` é o registro oficial da reunião. A rotina o substitui.
 *
 * E o que repõe um registro na fila é um comentário novo:
 *
 * ```elixir
 * defp mark_comments_as_unreviewed({:ok, comment} = result) do
 *   custom_service = Repo.get(CustomService, comment.custom_service_id)
 *   Bloomy.CustomServices.update_custom_service(custom_service, %{comments_reviewed: false})
 * ```
 */
export const meetingSummaryRules: Rule[] = [
  {
    id: "a-new-comment-schedules-an-overwrite",
    statement:
      "Comentar numa reunião já encerrada devolve o registro para a fila da madrugada, e às 3h o texto oficial é substituído por um resumo novo. Se alguém tinha escrito ou corrigido aquele texto à mão, o que estava lá some.",
    rationale:
      "As duas metades são razoáveis sozinhas: um comentário novo torna o resumo desatualizado, e regerar é a resposta certa. O que ninguém decidiu é o encontro das duas com a substituição direta de `appointment.content`. Quem comenta está acrescentando uma observação, não pedindo que o registro seja reescrito — e não há aviso, nem histórico, nem forma de recuperar o texto anterior.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "reviewed-means-a-machine-read-it",
    statement:
      "O campo que governa a fila chama-se `comments_reviewed`, e quem o marca como revisado é a própria rotina, ao terminar de gerar. Nenhuma pessoa leu nada.",
    rationale:
      "É o mesmo padrão de `valid_register?` e `unanswered_count`: o comportamento é coerente, o nome diz outra coisa. Aqui o custo é maior, porque o nome é o que uma auditoria leria para concluir que o resumo de uma reunião clínica passou por conferência humana. O valor padrão do campo é `true`, então registros que ninguém nunca olhou nascem marcados como revisados.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "the-regeneration-queue-has-no-bound",
    statement:
      "A busca da fila não filtra por data, por unidade, nem tem limite: é todo atendimento finalizado com a marca em `false`, da história inteira, processado num laço só.",
    rationale:
      "Enquanto a rotina roda todo dia, a fila é pequena e ninguém percebe. Uma noite em que ela falha, uma migração, um ambiente novo — e a primeira execução manda o acervo inteiro para o modelo de uma vez. O tamanho da fila é a única coisa que separa a operação normal do incidente, e é justamente o que não está limitado.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "the-number-reported-is-the-number-attempted",
    statement:
      "O laço descarta o resultado de cada geração, e a rotina devolve a quantidade de registros que **entrou** na fila. Quarenta sucessos e quarenta fracassos devolvem o mesmo `{:ok, 40}`.",
    rationale:
      "É a família de achados que mais aparece neste sistema: o valor que diria o que aconteceu é calculado e descartado antes de ser dito. Aqui a contagem é apresentada como desfecho, o que é pior que omitir — quem lê o registro do job vê um número e conclui que ele mede trabalho concluído.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "a-failing-record-is-retried-every-night",
    statement:
      "Quando a geração falha, a marca continua em `false` — então o mesmo registro volta para a fila na noite seguinte, e na outra, sem limite de tentativas e sem ninguém ser avisado.",
    rationale:
      "A retentativa indefinida é a escolha certa para uma falha momentânea e a errada para uma permanente, e nada no sistema distingue as duas. Um registro que sempre falha é reenviado ao modelo toda madrugada para sempre: custa dinheiro em silêncio, e a reunião fica sem resumo oficial sem que isso apareça em lugar nenhum.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "comment-text-becomes-model-instruction",
    statement:
      "O texto de cada comentário é interpolado cru dentro das etiquetas do pedido. Um comentário que feche a etiqueta e escreva depois dela deixa de ser conteúdo e passa a ser instrução para o modelo que redige o registro oficial.",
    rationale:
      "Não é hipótese de invasor: é o campo de texto livre que qualquer profissional preenche, alimentando o pedido que produz o registro oficial da reunião — sem escape e sem conferência humana depois, já que a própria rotina marca como revisado. O caminho mais curto para um resumo errado no prontuário é alguém colar um trecho com sinal de menor. E há dois estados, não um: quando o registro ainda está na fila, dá para prevenir; quando a marca já voltou para `true`, o texto oficial saiu daquele pedido e ninguém vai reler.",
    source: "src/rules/meetingSummary.ts",
  },
];

/**
 * Implementação de `a-new-comment-schedules-an-overwrite`.
 *
 * A fila é exatamente `comments_reviewed == false and status == :finished`. Os
 * registros aqui já são finalizados, então basta a marca.
 */
export function willBeRewrittenTonight(data: MeetingSummaryData): MeetingRecord[] {
  return data.records.filter((record) => !record.commentsReviewed);
}

/** O subconjunto em que o texto que vai ser substituído foi escrito por uma pessoa. */
export function humanTextAtRisk(data: MeetingSummaryData): MeetingRecord[] {
  return willBeRewrittenTonight(data).filter(
    (record) => record.contentWrittenBy === "professional" && record.officialContent !== undefined,
  );
}

/**
 * Implementação de `the-number-reported-is-the-number-attempted`.
 *
 * É `length(custom_services_to_review)`, medido **antes** de qualquer geração.
 */
export function numberTheJobWillReport(data: MeetingSummaryData): number {
  return willBeRewrittenTonight(data).length;
}

/**
 * Implementação de `a-failing-record-is-retried-every-night`.
 *
 * Uma noite de falha é acidente; a partir da segunda, a repetição é o próprio
 * padrão, e ninguém foi avisado em nenhuma delas.
 */
export function stuckInTheQueue(data: MeetingSummaryData): MeetingRecord[] {
  return willBeRewrittenTonight(data).filter((record) => record.failedNights >= 2);
}

/** Quantos da fila vão de fato terminar com resumo novo, se a noite repetir a anterior. */
export function likelyToSucceed(data: MeetingSummaryData): number {
  return numberTheJobWillReport(data) - stuckInTheQueue(data).length;
}

/** As etiquetas que delimitam o pedido. Fechar uma delas encerra o conteúdo. */
const DELIMITERS = ["</conteudo>", "</comentario>", "</comentarios_reuniao>", "</reuniao>"];

/**
 * Implementação de `comment-text-becomes-model-instruction`.
 *
 * O teste é o que o interpolador faz: o texto entra cru entre `<conteudo>` e
 * `</conteudo>`, então qualquer fechamento dessas etiquetas dentro dele quebra
 * a delimitação e o que vier depois é lido como parte do pedido.
 */
export function escapesItsDelimiter(comment: MeetingComment): boolean {
  const texto = comment.content.toLowerCase();
  return DELIMITERS.some((tag) => texto.includes(tag));
}

export function commentsThatEscape(record: MeetingRecord): MeetingComment[] {
  return record.comments.filter(escapesItsDelimiter);
}

export function recordsWithEscapingComments(data: MeetingSummaryData): MeetingRecord[] {
  return data.records.filter((record) => commentsThatEscape(record).length > 0);
}

/**
 * O comentário vai ser lido como instrução **esta noite**: o registro está na
 * fila, então o pedido ainda vai ser montado.
 */
export function escapingInTheQueue(data: MeetingSummaryData): MeetingRecord[] {
  return recordsWithEscapingComments(data).filter((record) => !record.commentsReviewed);
}

/**
 * O pior dos dois casos, e o que eu tinha deixado de fora.
 *
 * Se a marca já está em `true` e o texto oficial foi gerado pela rotina, então
 * o pedido que produziu esse texto **já continha** o comentário que escapa. Não
 * há o que prevenir: o registro oficial da reunião já saiu dali, e como a
 * própria rotina o marcou como revisado, ninguém vai conferir.
 */
export function escapingAlreadyGenerated(data: MeetingSummaryData): MeetingRecord[] {
  return recordsWithEscapingComments(data).filter(
    (record) =>
      record.commentsReviewed &&
      record.contentWrittenBy === "ai" &&
      record.officialContent !== undefined,
  );
}

/**
 * Implementação de `the-regeneration-queue-has-no-bound`.
 *
 * A data mais antiga da fila é o que mede o acúmulo: enquanto a rotina roda,
 * tudo é de ontem.
 */
export function oldestInQueue(data: MeetingSummaryData): MeetingRecord | undefined {
  const fila = willBeRewrittenTonight(data);
  if (fila.length === 0) return undefined;
  return [...fila].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))[0];
}

/** Há quantos dias o mais antigo da fila espera, na data em que a rotina roda. */
export function daysWaiting(record: MeetingRecord, runsAt: string): number {
  const dia = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.max(0, Math.round((dia(runsAt) - dia(record.finishedAt)) / 86_400_000));
}

/** Quem escreveu o texto que está no registro oficial agora. */
export function authorLabel(record: MeetingRecord): string | undefined {
  if (record.officialContent === undefined) return undefined;
  return record.contentWrittenBy === "professional"
    ? "escrito por uma pessoa"
    : "gerado pela rotina";
}

/**
 * A linha de `appointment` que pode nunca ter existido.
 *
 * Na criação do atendimento:
 *
 * ```elixir
 * defp create_appointment({:ok, custom_service}) do
 *   CustomServices.add_appointment(%{custom_service_id: custom_service.id, ...})
 *   {:ok, custom_service}
 * end
 * ```
 *
 * O resultado do insert é descartado. E na rotina das 3h:
 *
 * ```elixir
 * appointment: %{id: custom_service.appointment.id, content: content}
 * ```
 *
 * `custom_service.appointment` é `nil` quando a linha não existe, e `nil.id`
 * levanta. Não há `rescue` em `regenerate/0` nem no worker.
 */
export const appointmentRowRules: Rule[] = [
  {
    id: "the-appointment-row-can-silently-fail-to-exist",
    statement:
      "Ao criar o atendimento, o sistema insere a linha do registro e **descarta o resultado**, devolvendo sucesso de qualquer jeito. Se o insert falhar, o atendimento existe sem o lugar onde o registro oficial seria escrito, e nada avisa.",
    rationale:
      "É o padrão que mais se repete neste sistema — o valor que diria o que aconteceu é calculado e jogado fora —, e aqui ele cria um estado que nenhuma outra parte do código espera encontrar. O atendimento parece normal em toda tela: só quem for gravar o registro descobre que não há onde.",
    source: "src/rules/meetingSummary.ts",
  },
  {
    id: "one-record-without-an-appointment-stops-the-night",
    statement:
      "A rotina das 3h lê o identificador do registro sem conferir se ele existe. Um atendimento sem essa linha levanta exceção dentro do laço, e o laço não é protegido: **tudo que vinha depois na fila daquela noite não é processado**.",
    rationale:
      "Não é uma reunião perdida, é a fila inteira a partir dali. A tarefa ainda tenta de novo — vinte vezes, pelo padrão do Oban —, e as vinte estouram no mesmo registro. Como falhar mantém a marca de revisão como estava, o registro problemático continua na fila na noite seguinte, e bloqueia de novo. O impedimento é permanente e não tem sintoma: ninguém pediu resumo nenhum, ele simplesmente nunca chega.",
    source: "src/rules/meetingSummary.ts",
  },
];

/** Os atendimentos que não têm onde gravar o registro oficial. */
export function missingAppointmentRow(data: MeetingSummaryData): MeetingRecord[] {
  return data.records.filter((record) => !record.hasAppointmentRow);
}

/**
 * Implementação de `one-record-without-an-appointment-stops-the-night`.
 *
 * O laço percorre a fila e levanta no primeiro registro sem a linha. O que já
 * passou foi gravado; o que vem depois não é sequer tentado.
 */
export function firstToRaise(data: MeetingSummaryData): MeetingRecord | undefined {
  return willBeRewrittenTonight(data).find((record) => !record.hasAppointmentRow);
}

export function blockedByTheCrash(data: MeetingSummaryData): MeetingRecord[] {
  const fila = willBeRewrittenTonight(data);
  const posicao = fila.findIndex((record) => !record.hasAppointmentRow);
  return posicao === -1 ? [] : fila.slice(posicao + 1);
}

/** O que a noite de fato conclui antes de a exceção interromper o laço. */
export function processedBeforeTheCrash(data: MeetingSummaryData): MeetingRecord[] {
  const fila = willBeRewrittenTonight(data);
  const posicao = fila.findIndex((record) => !record.hasAppointmentRow);
  return posicao === -1 ? fila : fila.slice(0, posicao);
}
