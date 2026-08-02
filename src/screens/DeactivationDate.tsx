import type { ScreenProps } from "@brucesantos/design-space";
import type { DeactivationAttempt, DeactivationDateData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
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
  accepted,
  crossesIntoTomorrow,
  exemptionApplies,
  isRejected,
  localDate,
  localHour,
  rejectedOnTheMerits,
  rejectedOnlyByTheClock,
  rejectionExplanation,
  shouldBeExempt,
  utcDate,
} from "../rules/deactivationDate.js";

/**
 * Data de desativação do paciente.
 *
 * Uma linha da validação carrega dois defeitos independentes: o papel comparado
 * com um texto quando chega como átomo, e o dia de hoje medido em UTC.
 *
 * Três decisões desta tela:
 *
 * 1. **A janela é dita em horas, não em conceito.** “Problema de fuso” não
 *    ajuda quem está com o formulário aberto às 21h40. “Depois das 21h” é a
 *    coisa que a pessoa pode conferir no relógio.
 *
 * 2. **A frase do sistema não é repetida.** “Não pode ser uma data passada” é
 *    literalmente falsa nesse caso, e repeti-la aqui só espalharia a mentira.
 *    A tela diz o que de fato aconteceu.
 *
 * 3. **A recusa legítima aparece junto.** Sem ela, a tela pareceria dizer que a
 *    validação inteira está errada — e ela está certa fora da janela.
 */
export function DeactivationDate({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as desativações" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const deactivation = data as DeactivationDateData | null;
  if (!deactivation) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (deactivation.attempts.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma desativação registrada"
        description="Quando alguém desativa um paciente, a data escolhida é conferida contra o dia de hoje."
      />,
    );
  }

  const peloRelogio = rejectedOnlyByTheClock(deactivation);
  const semExcecao = shouldBeExempt(deactivation);
  const legitimas = rejectedOnTheMerits(deactivation);
  const passaram = accepted(deactivation);

  return wrap(
    context,
    <div className="space-y-4">
      {peloRelogio.length > 0 && (
        <Notice
          tone="danger"
          title={`${peloRelogio.length} ${peloRelogio.length === 1 ? "desativação foi recusada" : "desativações foram recusadas"} por uma data que é hoje`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {peloRelogio.map((tentativa) => (
              <li key={tentativa.id}>
                {tentativa.patientName} — enviada às {localHour(tentativa)}h com a data de{" "}
                {formatDate(`${tentativa.chosenDate}T12:00:00.000-03:00`, locale)}, que é o dia de
                hoje.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            O sistema conta o dia num fuso três horas à frente do da clínica. Depois das 21h ele já
            está contando amanhã, e a data de hoje passa a ser lida como passada. São três horas de
            todo dia — justamente o fim do expediente, quando se fecham pendências.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            {/* A frase do sistema é falsa neste caso; dizê-la aqui espalharia
                a mentira em vez de explicá-la. */}
            A resposta que a pessoa recebe é que a data já passou. Ela olha o calendário, vê que é
            hoje, e não tem como concluir nada além de que o sistema quebrou.
          </p>
        </Notice>
      )}

      {semExcecao.length > 0 && (
        <Notice
          tone="danger"
          title="A saída prevista para este caso é a que não funciona"
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {semExcecao.map((tentativa) => (
              <li key={tentativa.id}>
                {tentativa.actorName} é administrador e foi tratado como qualquer outro papel.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            A validação abre exceção para administradores — a decisão está escrita. Ela compara o
            papel com um texto, e o papel chega como outro tipo de valor, então a comparação nunca
            dá certo e a exceção não vale para ninguém.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            E o único lugar que produziria o valor esperado tropeça na mesma confusão, no login.
            Consertar só a validação não resolve; consertar só o login também não.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Tentativas de desativar"
          hint={`${deactivation.attempts.length} no total · ${passaram.length} passaram`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {deactivation.attempts.map((tentativa) => (
              <li key={tentativa.id}>
                <Row attempt={tentativa} locale={locale} />
              </li>
            ))}
          </ul>
          {legitimas.length > 0 && (
            <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              {/* Sem isto, a tela pareceria acusar a validação inteira. */}
              {legitimas.length === 1 ? "Uma recusa é legítima" : `${legitimas.length} recusas são legítimas`}
              : a data escolhida passou em qualquer fuso. A validação está certa fora da janela, e é
              só dentro dela que ela erra.
            </p>
          )}
        </div>
      </Card>
    </div>,
  );
}

function Row({
  attempt,
  locale,
}: {
  attempt: DeactivationAttempt;
  locale: string | undefined;
}) {
  const recusada = isRejected(attempt);
  const motivo = rejectionExplanation(attempt);
  const naJanela = crossesIntoTomorrow(attempt);
  const temExcecao = exemptionApplies(attempt);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{attempt.patientName}</span>
        <span className="text-[0.875rem] text-navy">
          data {formatDate(`${attempt.chosenDate}T12:00:00.000-03:00`, locale)}
        </span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          enviada às {localHour(attempt)}h por {attempt.actorName}
        </span>
        <Chip tone={recusada ? "danger" : "ok"}>{recusada ? "recusada" : "aceita"}</Chip>
        {temExcecao && <Chip tone="info">exceção de administrador aplicada</Chip>}
      </div>

      {naJanela && (
        <p className="m-0 mt-1.5 text-[0.8125rem] text-[var(--fg-2)]">
          Na clínica é {formatDate(`${localDate(attempt)}T12:00:00.000-03:00`, locale)}; o sistema
          está contando {formatDate(`${utcDate(attempt)}T12:00:00.000-03:00`, locale)}.
        </p>
      )}

      {motivo && <p className="m-0 mt-1 max-w-[68ch] text-[0.875rem] text-navy">{motivo}</p>}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Data de desativação"
      subtitle="Depois das 21h, hoje é recusado por ser ontem"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Data de desativação" }]}
    >
      {children}
    </AppShell>
  );
}
