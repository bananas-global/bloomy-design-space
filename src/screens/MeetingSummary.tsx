import type { ScreenProps } from "@brucesantos/design-space";
import type { MeetingRecord, MeetingSummaryData } from "../contracts/index.js";
import { formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  authorLabel,
  commentsThatEscape,
  daysWaiting,
  humanTextAtRisk,
  likelyToSucceed,
  numberTheJobWillReport,
  oldestInQueue,
  escapingAlreadyGenerated,
  escapingInTheQueue,
  stuckInTheQueue,
  willBeRewrittenTonight,
} from "../rules/meetingSummary.js";

/**
 * Resumo automático da reunião.
 *
 * Às 3h a rotina junta os comentários da reunião, pede um resumo ao modelo e
 * **grava em `appointment.content`** — o registro oficial. O que devolve um
 * registro para essa fila é alguém comentar.
 *
 * Quatro decisões desta tela:
 *
 * 1. **A fila é mostrada como fila, antes de rodar.** Hoje ela só existe dentro
 *    de uma consulta que ninguém vê; a substituição acontece de madrugada e o
 *    resultado aparece de manhã como se sempre tivesse estado lá.
 *
 * 2. **O texto que uma pessoa escreveu é separado do resto.** Substituir um
 *    resumo gerado por outro gerado é rotina. Substituir o que alguém redigiu à
 *    mão, sem histórico, é perda — e as duas coisas hoje são o mesmo caminho.
 *
 * 3. **O número que a rotina reporta aparece ao lado do que ela deve concluir.**
 *    `{:ok, 4}` é a quantidade que entrou na fila; um registro preso há 23
 *    noites entra nessa conta todas as vezes.
 *
 * 4. **O comentário que escapa da etiqueta é mostrado como texto, não
 *    interpretado.** É o único lugar da tela onde o conteúdo bruto importa mais
 *    que o sentido dele.
 */
export function MeetingSummary({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as reuniões" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const summary = data as MeetingSummaryData | null;
  if (!summary) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (summary.records.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma reunião registrada"
        description="Quando uma reunião é encerrada, o resumo dela passa a ser montado de madrugada a partir dos comentários."
      />,
    );
  }

  const fila = willBeRewrittenTonight(summary);
  const emRisco = humanTextAtRisk(summary);
  const presos = stuckInTheQueue(summary);
  const escapamNaFila = escapingInTheQueue(summary);
  const jaGerados = escapingAlreadyGenerated(summary);
  const maisAntigo = oldestInQueue(summary);

  return wrap(
    context,
    <div className="space-y-4">
      {emRisco.length > 0 && (
        <Notice
          tone="danger"
          title={`${emRisco.length} ${emRisco.length === 1 ? "resumo escrito por uma pessoa vai ser substituído" : "resumos escritos por pessoas vão ser substituídos"} esta madrugada`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {emRisco.map((registro) => (
              <li key={registro.id}>
                {registro.patientName} — texto de{" "}
                {formatDateTime(registro.contentWrittenAt ?? registro.finishedAt, locale)}, e depois
                dele alguém comentou.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Comentar numa reunião encerrada devolve o registro para a fila da madrugada, e o resumo
            novo ocupa o lugar do texto anterior. Não há histórico: quem comentou queria acrescentar
            uma observação, não pedir que o registro fosse reescrito.
          </p>
        </Notice>
      )}

      {presos.length > 0 && (
        <Notice
          tone="warn"
          title={`${presos.length} ${presos.length === 1 ? "reunião está" : "reuniões estão"} sem resumo há noites seguidas`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {presos.map((registro) => (
              <li key={registro.id}>
                {registro.patientName} — {registro.failedNights} noites tentando, e a reunião
                continua sem registro oficial.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Quando a geração falha, a marca de revisão continua como estava, então o mesmo registro
            volta para a fila na noite seguinte — sem limite e sem avisar ninguém. Repetir é o certo
            para uma falha passageira e o errado para uma permanente, e nada separa as duas.
          </p>
        </Notice>
      )}

      {escapamNaFila.length > 0 && (
        <Notice tone="warn" title="Um comentário está sendo lido como instrução">
          {escapamNaFila.map((registro) => (
            <div key={registro.id}>
              {commentsThatEscape(registro).map((c) => (
                <p key={c.id} className="m-0 max-w-[68ch]">
                  Em <span className="font-semibold">{registro.patientName}</span>, o comentário de{" "}
                  {c.professionalName} fecha a etiqueta que delimita o conteúdo. O que vem depois
                  dela deixa de ser observação e passa a fazer parte do pedido que redige o registro
                  oficial:
                  {/* Mostrado como texto, e nunca interpretado — é o único
                      ponto da tela em que o conteúdo bruto é o assunto. */}
                  <span className="mt-1.5 block rounded-field bg-[var(--surface-2)] px-3 py-2 font-mono text-[0.8125rem] break-words">
                    {c.content}
                  </span>
                </p>
              ))}
            </div>
          ))}
          <p className="m-0 mt-2 max-w-[68ch]">
            Não é caso de invasor: é o campo de texto livre que qualquer profissional preenche. E
            como a própria rotina marca o registro como revisado ao terminar, ninguém confere depois.
          </p>
        </Notice>
      )}

      {jaGerados.length > 0 && (
        <Notice tone="danger" title="O registro oficial já saiu de um pedido assim">
          {jaGerados.map((registro) => (
            <p key={registro.id} className="m-0 max-w-[68ch]">
              Em <span className="font-semibold">{registro.patientName}</span>, a marca de revisão já
              voltou ao normal e o texto foi gerado pela rotina — então o comentário que fecha a
              etiqueta já estava no pedido que produziu o registro. Não há o que prevenir aqui: o
              que está no prontuário veio dali, e a marca diz que foi revisado.
              <span className="mt-1.5 block rounded-field bg-[var(--surface-2)] px-3 py-2 text-[0.875rem]">
                {registro.officialContent}
              </span>
            </p>
          ))}
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Fila desta madrugada"
          hint={`${fila.length} ${fila.length === 1 ? "reunião" : "reuniões"} · roda às ${formatDateTime(summary.runsAt, locale)}`}
        />
        <div className="space-y-2 px-5 py-5">
          {fila.length === 0 ? (
            <p className="m-0 text-[0.9375rem] text-navy">
              Nenhuma reunião na fila. A rotina vai rodar e não terá o que fazer.
            </p>
          ) : (
            <>
              <ul className="m-0 list-none space-y-2 p-0">
                {fila.map((registro) => (
                  <li key={registro.id}>
                    <Row record={registro} runsAt={summary.runsAt} locale={locale} />
                  </li>
                ))}
              </ul>
              {/* O número que o registro do job vai mostrar, ao lado do que ele
                  de fato mede. */}
              <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
                Ao terminar, a rotina vai registrar {numberTheJobWillReport(summary)} como resultado.
                É a quantidade que <span className="font-semibold">entrou</span> na fila, medida
                antes de gerar qualquer coisa — não a que terminou com resumo.{" "}
                {presos.length > 0 && (
                  <>
                    Pelo que vem acontecendo, {likelyToSucceed(summary)}{" "}
                    {likelyToSucceed(summary) === 1 ? "vai concluir" : "vão concluir"}, e os outros
                    voltam amanhã.
                  </>
                )}
              </p>
              {maisAntigo && daysWaiting(maisAntigo, summary.runsAt) > 1 && (
                <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
                  A mais antiga da fila esperou {daysWaiting(maisAntigo, summary.runsAt)} dias. A
                  busca não filtra por data nem tem limite, então o tamanho da fila é o que separa a
                  noite comum do incidente — e é justamente o que não está limitado.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      <Card as="section">
        <CardHeader title="Reuniões com resumo em dia" hint="a rotina não toca nestas" />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {summary.records
              .filter((registro) => registro.commentsReviewed)
              .map((registro) => (
                <li key={registro.id}>
                  <Row record={registro} runsAt={summary.runsAt} locale={locale} />
                </li>
              ))}
          </ul>
          {/* O nome do campo é o achado; a frase é o que a pessoa precisa saber. */}
          <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            “Em dia” aqui quer dizer que a rotina terminou de gerar — não que alguém tenha lido. A
            conferência humana não existe neste caminho em nenhum momento.
          </p>
        </div>
      </Card>
    </div>,
  );
}

function Row({
  record,
  runsAt,
  locale,
}: {
  record: MeetingRecord;
  runsAt: string;
  locale: string | undefined;
}) {
  const autoria = authorLabel(record);
  const naFila = !record.commentsReviewed;
  const espera = daysWaiting(record, runsAt);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{record.patientName}</span>
        <span className="text-[0.875rem] text-navy">{record.meetingKind}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          encerrada em {formatDateTime(record.finishedAt, locale)}
        </span>
        {autoria && (
          <Chip tone={record.contentWrittenBy === "professional" ? "info" : "neutral"}>
            {autoria}
          </Chip>
        )}
        {naFila && (
          <Chip tone={record.contentWrittenBy === "professional" ? "danger" : "warn"}>
            {record.contentWrittenBy === "professional"
              ? "vai ser substituído"
              : "vai ser gerado de novo"}
          </Chip>
        )}
      </div>

      {record.officialContent && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.875rem] text-navy">
          {record.officialContent}
        </p>
      )}

      {naFila && record.officialContent === undefined && (
        <p className="m-0 mt-1.5 text-[0.875rem] text-navy">
          Sem registro oficial{espera > 1 ? ` há ${espera} dias` : ""}.
        </p>
      )}

      <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
        {record.comments.length}{" "}
        {record.comments.length === 1 ? "comentário" : "comentários"} na reunião
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Resumo da reunião"
      subtitle="Comentar hoje reescreve o registro de madrugada"
      breadcrumb={[{ label: "Atendimento", path: "/agenda" }, { label: "Resumo da reunião" }]}
    >
      {children}
    </AppShell>
  );
}
