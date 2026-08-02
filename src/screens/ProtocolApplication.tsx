import type { ScreenProps } from "@brucesantos/design-space";
import type {
  Protocol,
  ProtocolArea,
  ProtocolExecutionData,
  ProtocolQuestion,
} from "../contracts/index.js";
import { formatDate, formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  answerControl,
  areaProgress,
  canApplyProtocol,
  completion,
  daysUntilReassessment,
  isAnswered,
  isComplete,
  nextUnanswered,
} from "../rules/protocols.js";

/**
 * Aplicação de protocolo.
 *
 * O protocolo é a avaliação de onde o plano nasce: aplicado o instrumento, as
 * áreas viram metas e os itens viram objetivos. São dezenas de itens aplicados
 * ao longo de várias sessões, e é isso que faz a navegação ser regra de negócio.
 *
 * Três decisões de desenho:
 *
 * 1. **O percentual diz que é de preenchimento.** "38% respondido" e "38% de
 *    desempenho" são leituras opostas do mesmo número, e a segunda vira conversa
 *    com a família. A tela nunca mostra o número sozinho.
 *
 * 2. **O progresso por área fica ao lado do total.** É por área que a aplicação
 *    é dividida entre sessões e entre profissionais. O total não diz onde parar
 *    hoje.
 *
 * 3. **O controle de resposta segue o formato do instrumento.** Escala
 *    compartilhada no padrão, faixa numérica por item no ABLLS-R. Assumir escala
 *    única quebraria o ABLLS-R em silêncio: a resposta caberia no campo e
 *    significaria outra coisa.
 */
export function ProtocolApplication({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a aplicação" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const access = canApplyProtocol(permissions);
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso a protocolos"
        description="A aplicação de protocolo é visível para coordenação, admin de clínica, admin, terapeuta e especialista. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const executionData = data as ProtocolExecutionData | null;
  if (!executionData) {
    return wrap(
      context,
      <EmptyState
        title="Aplicação não encontrada"
        description="A avaliação pode ter sido descartada. Volte ao paciente para ver as aplicações registradas."
      />,
    );
  }

  const { execution } = executionData;
  const { protocol } = execution;
  const total = completion(protocol);
  const finished = isComplete(protocol);
  const resume = nextUnanswered(protocol, execution.currentQuestionId);
  const daysToReassessment = daysUntilReassessment(execution);

  return wrap(
    context,
    <div className="space-y-4">
      {execution.finishedAt && daysToReassessment !== undefined && (
        <Notice
          tone={daysToReassessment < 0 ? "danger" : "info"}
          title={
            daysToReassessment < 0
              ? `Reavaliação atrasada em ${Math.abs(daysToReassessment)} dias`
              : "Próxima reavaliação"
          }
        >
          O instrumento pede reavaliação a cada {protocol.nextReassessmentInMonths} meses. Esta
          aplicação fechou em {formatDate(execution.finishedAt, locale)}, então a próxima cai em{" "}
          {formatDate(`${execution.reassessmentDate}T00:00:00.000-03:00`, locale)}. O intervalo é do
          instrumento, não escolha de quem aplica.
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title={protocol.name}
          hint={protocol.format === "abllsr" ? "Formato ABLLS-R" : "Formato padrão"}
        />
        <div className="space-y-4 px-5 py-5">
          <p className="m-0 max-w-[68ch] text-[15px] text-navy">{protocol.explication}</p>

          {/* O número nunca aparece sozinho: "respondido" é metade da informação. */}
          <div>
            <p className="m-0 text-[15px] font-semibold text-navy">
              {total.answered} de {total.total} itens respondidos — {total.percent}% do instrumento
              preenchido
            </p>
            <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
              É medida de preenchimento, não de desempenho do paciente.
            </p>
          </div>

          {finished ? (
            <Notice tone="ok" title="Aplicação concluída" level={3}>
              Todos os itens foram respondidos
              {execution.finishedAt && ` em ${formatDateTime(execution.finishedAt, locale)}`}.
            </Notice>
          ) : resume ? (
            <div>
              <Button id="retomar" variant="primary">
                Retomar em {resume.code}
              </Button>
              <p className="m-0 mt-1.5 max-w-[60ch] text-[13px] text-[var(--fg-2)]">
                Retomar vai para o primeiro item ainda sem resposta — dentro da área atual primeiro,
                depois nas seguintes. Não é o próximo da lista.
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {[...protocol.areas]
        .sort((a, b) => a.position - b.position)
        .map((area) => (
          <AreaBlock
            key={area.id}
            area={area}
            protocol={protocol}
            currentQuestionId={execution.currentQuestionId}
            locale={locale}
          />
        ))}
    </div>,
    executionData,
  );
}

/* ==================================================================== área */

function AreaBlock({
  area,
  protocol,
  currentQuestionId,
  locale,
}: {
  area: ProtocolArea;
  protocol: Protocol;
  currentQuestionId?: string;
  locale: string | undefined;
}) {
  const progress = areaProgress(area);

  return (
    <Card as="section">
      <CardHeader
        title={area.orientation}
        hint={area.group ? `Grupo: ${area.group}` : undefined}
      />
      <div className="px-5 py-5">
        {/* Progresso próprio da área: é por ela que a aplicação é dividida
            entre sessões, e às vezes entre profissionais. */}
        <p className="m-0 text-[14px] font-semibold text-navy">
          {progress.answered} de {progress.total} respondidos nesta área
          {progress.total > 0 && ` — ${progress.percent}%`}
        </p>

        {area.details && (
          <p className="m-0 mt-1 max-w-[68ch] text-[13px] text-[var(--fg-2)]">{area.details}</p>
        )}

        <ol className="m-0 mt-4 list-none space-y-4 p-0">
          {[...area.questions]
            .sort((a, b) => a.position - b.position)
            .map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                protocol={protocol}
                current={question.id === currentQuestionId}
                locale={locale}
              />
            ))}
        </ol>
      </div>
    </Card>
  );
}

/* ================================================================= questão */

function QuestionRow({
  question,
  protocol,
  current,
  locale,
}: {
  question: ProtocolQuestion;
  protocol: Protocol;
  current: boolean;
  locale: string | undefined;
}) {
  const answered = isAnswered(question);
  const control = answerControl(protocol, question);

  return (
    <li
      className={`rounded-field border px-4 py-3.5 ${
        current
          ? "border-action bg-info-bg"
          : "border-[var(--border-soft)] bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[13px] font-bold text-navy">{question.code}</span>
        <h3 className="m-0 flex-1 text-[15px] font-semibold text-navy">{question.question}</h3>
        {answered ? <Chip tone="ok">Respondido</Chip> : <Chip tone="pending">Em branco</Chip>}
        {current && <Chip tone="info">Em foco</Chip>}
      </div>

      <p className="m-0 mt-1.5 max-w-[68ch] text-[13px] text-[var(--fg-2)]">{question.criteria}</p>

      {question.example && (
        <p className="m-0 mt-1 max-w-[68ch] text-[13px] text-[var(--fg-2)]">
          <span className="font-semibold">Exemplo:</span> {question.example}
        </p>
      )}

      <div className="mt-3">
        {control === undefined ? (
          <p className="m-0 text-[13px] font-semibold text-danger-fg" role="alert">
            Este item não tem escala nem faixa configurada. Não dá para responder sem saber o que
            está sendo perguntado.
          </p>
        ) : control.kind === "scale" ? (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1.5 text-[13px] font-semibold text-navy">
              Resposta — escala do protocolo
            </legend>
            <div className="flex flex-wrap gap-2">
              {control.options.map((option) => {
                const chosen = question.answer?.value === option.value;
                return (
                  <span
                    key={option.id}
                    className={`inline-flex items-center gap-1.5 rounded-field border px-3 py-1.5 text-[14px] ${
                      chosen
                        ? "border-action bg-action text-white font-semibold"
                        : "border-[var(--border-strong)] bg-surface text-navy"
                    }`}
                  >
                    {chosen && <span className="sr-only">Resposta registrada: </span>}
                    {option.value} · {option.name}
                  </span>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div>
            <p className="m-0 text-[13px] font-semibold text-navy">
              Resposta — faixa de {control.min} a {control.max}, própria deste item
            </p>
            <p className="m-0 mt-1 text-[15px] text-navy">
              {question.answer ? (
                <>
                  <span className="font-semibold">{question.answer.value}</span> de {control.max}
                </>
              ) : (
                <span className="text-[var(--fg-2)]">sem pontuação registrada</span>
              )}
            </p>
          </div>
        )}
      </div>

      {question.answer && (
        <p className="m-0 mt-2 text-[13px] text-[var(--fg-2)]">
          Registrado em {formatDateTime(question.answer.at, locale)}.
        </p>
      )}

      {question.observation && (
        <p className="m-0 mt-2 max-w-[68ch] rounded-field bg-ink-50 px-3 py-2 text-[13px] text-navy">
          <span className="font-semibold">Observação:</span> {question.observation}
        </p>
      )}
    </li>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  executionData?: ProtocolExecutionData | null,
) {
  return (
    <AppShell
      context={context}
      title={executionData?.execution.patient.name ?? "Aplicação de protocolo"}
      subtitle={executionData?.execution.protocol.name}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Protocolo" }]}
    >
      {children}
    </AppShell>
  );
}
